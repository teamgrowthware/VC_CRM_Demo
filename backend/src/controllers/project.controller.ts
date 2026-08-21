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
      teamId: z.string().uuid().optional().nullable(),
      clientId: z.string().uuid().optional().nullable(),
      departmentId: z.string().uuid().optional(),
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
        team: true,
        client: true,
      }
    });

    // Auto-add manager as a ProjectMember with MANAGER role
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        employeeId: validatedData.managerId,
        role: 'MANAGER'
      }
    }).catch(() => {});

    // Auto-add team members as project members
    if (validatedData.teamId) {
      const teamMembers = await prisma.teamMember.findMany({
        where: { teamId: validatedData.teamId },
        select: { employeeId: true }
      });
      for (const tm of teamMembers) {
        await prisma.projectMember.create({
          data: {
            projectId: project.id,
            employeeId: tm.employeeId,
            role: 'DEVELOPER'
          }
        }).catch(() => {});
      }
    }

    // Notify the selected manager
    const creatorId = (req as any).user.id;
    if (validatedData.managerId !== creatorId) {
      await createNotification(
        validatedData.managerId,
        'PROJECT_ASSIGNED',
        `You have been assigned as manager of project "${project.name}"`,
        `/dashboard/projects/${project.id}`
      );
    }

    await logActivity(
      creatorId,
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
    const id = String(req.params.id);
    const user = (req as any).user;
    if (user?.role !== 'ADMIN') {
      const managedProject = await prisma.project.findFirst({
        where: { id, managerId: user?.id },
        select: { id: true }
      });
      if (!managedProject) {
        return res.status(403).json({ success: false, message: 'Only the project manager can update this project' });
      }
    }
    
    const schema = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      managerId: z.string().uuid().optional(),
      teamId: z.string().uuid().optional().nullable(),
      clientId: z.string().uuid().optional().nullable(),
      startDate: z.string().optional(),
      deadline: z.string().optional(),
      status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED']).optional(),
      links: z.array(z.object({ title: z.string(), url: z.string() })).optional(),
    });

    const data = schema.parse(req.body);

    // Check if manager is being changed
    let oldManagerId: string | null = null;
    if (data.managerId) {
      const existingProject = await prisma.project.findUnique({ where: { id }, select: { managerId: true, name: true } });
      if (existingProject && existingProject.managerId !== data.managerId) {
        oldManagerId = existingProject.managerId;
      }
    }

    const updateData: any = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    else delete updateData.startDate;
    if (data.deadline) updateData.deadline = new Date(data.deadline);
    else delete updateData.deadline;
    if (data.status) updateData.status = data.status as any;
    if (!data.links) delete updateData.links;

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        manager: true,
        team: true,
        client: true,
      }
    });

    // If manager changed, notify new manager and auto-add as member
    if (data.managerId && oldManagerId) {
      const updaterId = (req as any).user?.id;

      // Notify new manager
      if (data.managerId !== updaterId) {
        await createNotification(
          data.managerId,
          'PROJECT_ASSIGNED',
          `You have been assigned as manager of project "${project.name}"`,
          `/dashboard/projects/${id}`
        );
      }

      // Auto-add new manager as ProjectMember
      await prisma.projectMember.upsert({
        where: {
          projectId_employeeId: { projectId: id, employeeId: data.managerId }
        },
        update: { role: 'MANAGER' },
        create: { projectId: id, employeeId: data.managerId, role: 'MANAGER' }
      }).catch(() => {});
    }

    // Auto-add team members if teamId is being set
    if (data.teamId) {
      const teamMembers = await prisma.teamMember.findMany({
        where: { teamId: data.teamId },
        select: { employeeId: true }
      });
      for (const tm of teamMembers) {
        await prisma.projectMember.upsert({
          where: {
            projectId_employeeId: { projectId: id, employeeId: tm.employeeId }
          },
        update: {},
        create: { projectId: id, employeeId: tm.employeeId, role: 'DEVELOPER' }
        }).catch(() => {});
      }
    }

    res.json({ success: true, project });
  } catch (error) {
    console.error('Update project error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: error.issues });
    } else {
      res.status(500).json({ success: false, message: 'Failed to update project' });
    }
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const user = (req as any).user;
    if (user?.role !== 'ADMIN') {
      const managedProject = await prisma.project.findFirst({
        where: { id, managerId: user?.id },
        select: { id: true }
      });
      if (!managedProject) {
        return res.status(403).json({ success: false, message: 'Only the project manager can delete this project' });
      }
    }

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
    } else if (userRole === 'PROJECT_MANAGER' || userRole === 'EMPLOYEE') {
       filter = { members: { some: { employeeId: userId } } };
    }
    // ADMIN and HR see all projects.

    const projects = await prisma.project.findMany({
      where: filter,
      include: {
        manager: {
          select: { id: true, name: true, employeeId: true }
        },
        team: true,
        client: { select: { id: true, name: true, company: true } },
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
    const id = String(req.params.id);
    const user = (req as any).user;
    if (!['ADMIN', 'HR'].includes(user?.role)) {
      const accessible = await prisma.project.findFirst({
        where: {
          id,
          OR: [
            { managerId: user?.id },
            { members: { some: { employeeId: user?.id } } }
          ]
        },
        select: { id: true }
      });
      if (!accessible) {
        return res.status(403).json({ success: false, message: 'Unauthorized to view this project' });
      }
    }
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        manager: {
          select: { id: true, name: true, employeeId: true, email: true }
        },
        team: true,
        client: { select: { id: true, name: true, company: true, email: true } },
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
    const id = String(req.params.id); // projectId
    const user = (req as any).user;
    if (user?.role !== 'ADMIN') {
      const managedProject = await prisma.project.findFirst({
        where: { id, managerId: user?.id },
        select: { id: true }
      });
      if (!managedProject) {
        return res.status(403).json({ success: false, message: 'Only the project manager can manage members' });
      }
    }
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
        employee: { select: { id: true, name: true, designation: true } },
        project: { select: { id: true, name: true } }
      }
    });

    // Notify the assigned employee
    const assignerId = (req as any).user?.id;
    if (employeeId !== assignerId) {
      await createNotification(
        employeeId,
        'PROJECT_ASSIGNED',
        `You have been assigned to project "${projectMember.project.name}" as ${role}`,
        `/dashboard/projects/${id}`
      );
    }

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
    const id = String(req.params.id);
    const memberId = String(req.params.memberId);
    const user = (req as any).user;
    if (user?.role !== 'ADMIN') {
      const managedProject = await prisma.project.findFirst({
        where: { id, managerId: user?.id },
        select: { id: true }
      });
      if (!managedProject) {
        return res.status(403).json({ success: false, message: 'Only the project manager can manage members' });
      }
    }
    
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
    const id = String(req.params.id);

    const user = (req as any).user;
    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, managerId: true, members: { select: { employeeId: true } } }
    });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    const canUpload = ['ADMIN', 'HR'].includes(user?.role)
      || project.managerId === user?.id
      || project.members.some((member) => member.employeeId === user?.id);
    if (!canUpload) {
      return res.status(403).json({ success: false, message: 'Unauthorized to upload to this project' });
    }

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
