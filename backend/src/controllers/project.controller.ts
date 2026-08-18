import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { ProjectRole } from '@prisma/client';
import { createNotification } from '../services/notification.service';
import { logActivity } from '../services/activity.service';
import fs from 'fs';
import path from 'path';

export const createProject = async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      managerId: z.string().uuid(),
      startDate: z.string(),
      deadline: z.string(),
      status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED']).optional(),
      links: z.array(z.object({ title: z.string(), url: z.string() })).optional(),
    });

    const validatedData = schema.parse(req.body);

    const projectId = `PRJ-${Math.floor(1000 + Math.random() * 9000)}`;

    const project = await prisma.project.create({
      data: {
        ...validatedData,
        projectId,
        status: validatedData.status as any,
        startDate: new Date(validatedData.startDate),
        deadline: new Date(validatedData.deadline),
        links: validatedData.links || [],
      },
      include: {
        manager: true,
      }
    });

    await logActivity(
      (req as any).user.id,
      'PROJECT_CREATED',
      `created project "${project.name}"`,
      'PROJECT',
      project.id
    );

    res.status(201).json({ success: true, project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation Error', errors: error.issues });
    } else {
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const schema = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      managerId: z.string().uuid().optional(),
      startDate: z.string().optional(),
      deadline: z.string().optional(),
      status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED']).optional(),
      links: z.array(z.object({ title: z.string(), url: z.string() })).optional(),
    });

    const data = schema.parse(req.body);

    const updateData: any = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.deadline) updateData.deadline = new Date(data.deadline);
    if (data.status) updateData.status = data.status as any;

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        manager: true,
      }
    });

    res.json({ success: true, project });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Update failed' });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    // 1. Get all tasks in this project
    const tasks = await prisma.task.findMany({
      where: { projectId: id },
      select: { id: true }
    });
    const taskIds = tasks.map(t => t.id);

    // 2. Delete comments for all these tasks
    if (taskIds.length > 0) {
      await prisma.comment.deleteMany({
        where: { taskId: { in: taskIds } }
      });
    }

    // 3. Delete task-level documents & physical files
    const taskDocs = await prisma.document.findMany({
      where: { taskId: { in: taskIds } }
    });
    for (const doc of taskDocs) {
      const filePath = path.join(process.cwd(), 'public', doc.url);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error(`Failed to delete task file: ${filePath}`, e);
        }
      }
    }
    if (taskIds.length > 0) {
      await prisma.document.deleteMany({
        where: { taskId: { in: taskIds } }
      });
    }

    // 4. Delete the tasks themselves (cascading SubTask and TimeEntry automatically)
    if (taskIds.length > 0) {
      await prisma.task.deleteMany({
        where: { id: { in: taskIds } }
      });
    }

    // 5. Delete project-level documents & physical files
    const projectDocs = await prisma.document.findMany({
      where: { projectId: id, taskId: null }
    });
    for (const doc of projectDocs) {
      const filePath = path.join(process.cwd(), 'public', doc.url);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error(`Failed to delete project file: ${filePath}`, e);
        }
      }
    }
    await prisma.document.deleteMany({
      where: { projectId: id }
    });

    // 6. Delete all project invoices (this cascades InvoiceItem in db)
    await prisma.invoice.deleteMany({
      where: { projectId: id }
    });

    // 7. Disassociate or delete project meetings
    await prisma.meeting.deleteMany({
      where: { projectId: id }
    });

    // 8. Finally delete the project itself (cascading members, milestones, payments)
    await prisma.project.delete({ where: { id } });

    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getAllProjects = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.id;
    
    let filter: any = {};
    if (userRole === 'MANAGER') {
       filter = {
          OR: [
             { managerId: userId },
             { members: { some: { employeeId: userId } } }
          ]
       };
    } else if (userRole === 'EMPLOYEE') {
       filter = { members: { some: { employeeId: userId } } };
    }
    // ADMIN and PROJECT_MANAGER see all projects (filter = {})

    const projects = await prisma.project.findMany({
      where: filter,
      include: {
        manager: {
          select: { id: true, name: true, employeeId: true }
        },
          members: {
            include: {
              employee: { select: { id: true, name: true } }
            }
          },
          tasks: {
            select: { status: true }
          },
          _count: {
            select: { tasks: true }
          }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        manager: {
          select: { id: true, name: true, employeeId: true, email: true }
        },
        members: {
          include: {
            employee: { select: { id: true, name: true, designation: true } }
          }
        },
        tasks: {
          include: {
            assignedTo: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } },
            subTasks: { orderBy: { createdAt: 'asc' } },
            comments: {
              include: { author: { select: { id: true, name: true, role: true } } },
              orderBy: { createdAt: 'asc' }
            },
            documents: true
          },
          orderBy: { createdAt: 'desc' }
        },
        documents: true,
        timeEntries: true
      }
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const assignEmployeeToProject = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string; // projectId
    const schema = z.object({
      employeeId: z.string().uuid(),
      role: z.enum(['DEVELOPER', 'DESIGNER', 'TESTER', 'MANAGER']).default('DEVELOPER')
    });

    const { employeeId, role } = schema.parse(req.body);

    const projectMember = await prisma.projectMember.create({
      data: {
        projectId: id,
        employeeId,
        role: role as ProjectRole
      },
      include: {
        employee: { select: { id: true, name: true, designation: true } }
      }
    });

    res.status(201).json({ success: true, member: projectMember });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation Error', errors: error.issues });
    } else {
      // Prisma error for unique constraint
      res.status(400).json({ success: false, message: 'Failed to assign. User may already be a member.' });
    }
  }
};

export const removeEmployeeFromProject = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const memberId = req.params.memberId as string;
    
    // We expect memberId to be employeeId based on route: DELETE /api/projects/:id/member/:employeeId
    await prisma.projectMember.delete({
      where: {
        projectId_employeeId: {
          projectId: id,
          employeeId: memberId
        }
      }
    });

    res.json({ success: true, message: 'Member removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const uploadProjectDocument = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { originalname, filename, mimetype } = req.file;

    const document = await prisma.document.create({
      data: {
        projectId: id,
        name: originalname,
        url: `/uploads/${filename}`,
        type: mimetype
      },
      include: {
        project: { select: { name: true, managerId: true } }
      }
    });

    // Notify project manager about document upload
    // Optional: Type guard for AuthRequest if needed, but since Any Request we just fallback
    const uploaderId = (req as any).user?.id;
    if (document.project && document.project.managerId !== uploaderId) {
        await createNotification(
            document.project.managerId,
            'DOCUMENT_UPLOADED',
            `A new document "${originalname}" was uploaded to project "${document.project.name}"`,
            `/dashboard/projects/${id}`
        );
    }

    await logActivity(
      uploaderId,
      'DOCUMENT_UPLOADED',
      `uploaded a document "${originalname}" to project "${document.project?.name || 'Unknown'}"`,
      'PROJECT',
      id
    );

    res.status(201).json({ success: true, document });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
