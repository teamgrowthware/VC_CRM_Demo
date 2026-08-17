import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { createNotification } from '../services/notification.service';
import { logActivity } from '../services/activity.service';

interface AuthRequest extends Request {
  user?: any;
}

const createTaskSchema = z.object({
  projectId: z.string().uuid().optional().nullable(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  assignedId: z.string().uuid().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'TESTING', 'COMPLETED']).default('TODO'),
  issueType: z.enum(['EPIC', 'STORY', 'TASK', 'BUG']).default('TASK'),
  storyPoints: z.number().optional().nullable(),
  sprintId: z.string().uuid().optional().nullable(),
  startDate: z.string().optional().nullable(),
  deadline: z.string().optional().nullable()
});

const updateTaskSchema = createTaskSchema.partial();

export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Allow ADMIN, MANAGER, PROJECT_MANAGER and EMPLOYEE to create tasks
    if (!['ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE', 'HR'].includes(req.user.role)) {
      res.status(403).json({ error: 'Unauthorized to create tasks' });
      return;
    }

    const { projectId, title, description, assignedId, priority, status, issueType, storyPoints, sprintId, startDate, deadline } = createTaskSchema.parse(req.body);

    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
    }

    if (assignedId) {
      const employee = await prisma.employee.findUnique({ where: { id: assignedId } });
      if (!employee || employee.status !== 'ACTIVE') {
        res.status(400).json({ error: 'Assigned employee must exist and be ACTIVE' });
        return;
      }
    }

    const count = await prisma.task.count();
    const taskId = `TSK-${(count + 1).toString().padStart(3, '0')}`;

    const task = await prisma.task.create({
      data: {
        taskId,
        projectId,
        title,
        description,
        assignedId: assignedId || null,
        createdById: req.user.id,
        priority,
        status,
        issueType,
        storyPoints,
        sprintId,
        startDate: startDate ? new Date(startDate) : null,
        deadline: deadline ? new Date(deadline) : null,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } }
      }
    });
    
    // Notify Assignee
    if (assignedId && assignedId !== req.user.id) {
        await createNotification(
            assignedId,
            'TASK_ASSIGNED',
            `You have been assigned a new task: "${title}"`,
            `/dashboard/tasks`
        );
    }

    await logActivity(
      req.user.id,
      'TASK_CREATED',
      `created task "${title}"`,
      'TASK',
      task.id
    );

    res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues });
    } else {
      console.error('Create task error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const updates = updateTaskSchema.parse(req.body);

    if (updates.assignedId) {
      const employee = await prisma.employee.findUnique({ where: { id: updates.assignedId } });
      if (!employee || employee.status !== 'ACTIVE') {
        res.status(400).json({ error: 'Assigned employee must exist and be ACTIVE' });
        return;
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: id as string },
      data: {
        ...updates,
        assignedId: updates.assignedId === null ? null : updates.assignedId,
        startDate: updates.startDate ? new Date(updates.startDate) : undefined,
        deadline: updates.deadline ? new Date(updates.deadline) : undefined,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } }
      }
    });

    // Notify Assignee if it changed
    if (updates.assignedId && updates.assignedId !== req.user.id) {
        await createNotification(
            updates.assignedId,
            'TASK_ASSIGNED',
            `You have been assigned a task: "${updatedTask.title}"`,
            `/dashboard/tasks`
        );
    }

    await logActivity(
      req.user.id,
      'TASK_UPDATED',
      `updated task "${updatedTask.title}"`,
      'TASK',
      updatedTask.id
    );

    res.status(200).json({ message: 'Task updated successfully', task: updatedTask });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues });
    } else {
      console.error('Update task error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

export const changeTaskStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const { status } = z.object({
      status: z.enum(['TODO', 'IN_PROGRESS', 'TESTING', 'COMPLETED'])
    }).parse(req.body);

    // In a real scenario we might limit who can drag/drop based on task assignment, but currently left open for team
    const updatedTask = await prisma.task.update({
      where: { id: id as string },
      data: { 
        status
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      }
    });

    if (updatedTask.assignedId && updatedTask.assignedId !== req.user.id) {
       await createNotification(
           updatedTask.assignedId,
           'PROJECT_UPDATED',
           `Task "${updatedTask.title}" moved to ${status}.`,
           `/dashboard/kanban`
       );
    }

    await logActivity(
      req.user.id,
      status === 'COMPLETED' ? 'TASK_COMPLETED' : 'TASK_UPDATED',
      `${status === 'COMPLETED' ? 'completed' : 'updated the status of'} task "${updatedTask.title}" to ${status}`,
      'TASK',
      updatedTask.id
    );

    res.status(200).json({ message: 'Task status updated', task: updatedTask });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues });
    } else {
      console.error('Change task status error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

export const assignTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const { assignedId } = z.object({
      assignedId: z.string().uuid().nullable()
    }).parse(req.body);

    if (assignedId) {
      const employee = await prisma.employee.findUnique({ where: { id: assignedId } });
      if (!employee || employee.status !== 'ACTIVE') {
        res.status(400).json({ error: 'Assigned employee must exist and be ACTIVE' });
        return;
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: id as string },
      data: { assignedId },
      include: {
        assignedTo: { select: { id: true, name: true } },
      }
    });

    if (assignedId && assignedId !== req.user.id) {
       await createNotification(
           assignedId,
           'TASK_ASSIGNED',
           `You have been assigned to task: ${updatedTask.title}`,
           `/dashboard/tasks`
       );
    }

    res.status(200).json({ message: 'Task assigned successfully', task: updatedTask });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues });
    } else {
      console.error('Assign task error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    if (!['ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'HR', 'EMPLOYEE'].includes(req.user.role)) {
      res.status(403).json({ error: 'Unauthorized to delete tasks' });
      return;
    }

    // Delete task documents & physical files to prevent database constraints and storage orphans
    const docs = await prisma.document.findMany({ where: { taskId: id as string } });
    for (const doc of docs) {
      const filePath = path.join(process.cwd(), 'public', doc.url);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error(`Failed to delete physical file: ${filePath}`, e);
        }
      }
    }
    await prisma.document.deleteMany({ where: { taskId: id as string } });

    await prisma.comment.deleteMany({ where: { taskId: id as string } });
    await prisma.task.delete({ where: { id: id as string } });

    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getAllTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let filter = {};
    if (req.user.role === 'MANAGER' || req.user.role === 'PROJECT_MANAGER') {
      const managedProjects = await prisma.project.findMany({
        where: { managerId: req.user.id },
        select: { id: true }
      });
      const projectIds = managedProjects.map(p => p.id);
      filter = { projectId: { in: projectIds } };
    } else if (req.user.role === 'EMPLOYEE') {
      filter = { assignedId: req.user.id };
    }

    const tasks = await prisma.task.findMany({
      where: filter,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, projectId: true } },
        createdBy: { select: { id: true, name: true } },
        subTasks: { orderBy: { createdAt: 'asc' } },
        comments: { include: { author: { select: { id: true, name: true, role: true } } } },
        documents: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(tasks);
  } catch (error) {
    console.error('Get all tasks error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getTasksByEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.params.id;
    const tasks = await prisma.task.findMany({
      where: { assignedId: employeeId as string },
      include: {
        assignedTo: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, projectId: true } },
        createdBy: { select: { id: true, name: true } },
        subTasks: { orderBy: { createdAt: 'asc' } },
        comments: { include: { author: { select: { id: true, name: true, role: true } } } },
        documents: true
      },
      orderBy: { deadline: 'asc' }
    });

    res.status(200).json(tasks);
  } catch (error) {
    console.error('Get tasks by employee error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getTasksByProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id;
    const tasks = await prisma.task.findMany({
      where: { projectId: projectId as string },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        subTasks: true,
        documents: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(tasks);
  } catch (error) {
    console.error('Get tasks by project error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getComments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const taskId = req.params.id;
    const comments = await prisma.comment.findMany({
      where: { taskId: taskId as string },
      include: {
        author: { select: { id: true, name: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const addComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const taskId = req.params.id;
    const { content } = z.object({
      content: z.string().min(1, 'Comment cannot be empty')
    }).parse(req.body);

    const comment = (await prisma.comment.create({
      data: {
        taskId: taskId as string,
        authorId: req.user.id,
        content,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
        task: { select: { assignedId: true, title: true } }
      }
    })) as any;

    if (comment.task.assignedId && comment.task.assignedId !== req.user.id) {
        await createNotification(
             comment.task.assignedId,
             'COMMENT_ADDED' as any,
             `New comment on your task "${comment.task.title}" by ${comment.author.name}`,
             `/dashboard/tasks`
        );
    }

    await logActivity(
      req.user.id,
      'COMMENT_ADDED',
      `commented on task "${comment.task.title}"`,
      'TASK',
      taskId as string
    );

    res.status(201).json({ message: 'Comment added successfully', comment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues });
    } else {
      console.error('Add comment error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

// Sub-task controllers
export const createSubTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const taskId = req.params.id;
    const { title } = z.object({ title: z.string().min(1) }).parse(req.body);

    const subTask = await prisma.subTask.create({
      data: { taskId: taskId as string, title }
    });

    res.status(201).json({ subTask });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create sub-task' });
  }
};

export const toggleSubTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isDone } = z.object({ isDone: z.boolean() }).parse(req.body);

    const subTask = await prisma.subTask.update({
      where: { id: id as string },
      data: { isDone }
    });

    res.status(200).json({ subTask });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update sub-task' });
  }
};

export const deleteSubTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.subTask.delete({ where: { id: id as string } });
    res.status(200).json({ message: 'Sub-task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete sub-task' });
  }
};

// Task attachment controllers
export const uploadTaskAttachment = async (req: Request, res: Response): Promise<void> => {
  try {
    const taskId = req.params.id;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const task = await prisma.task.findUnique({ where: { id: taskId as string } });
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const document = await prisma.document.create({
      data: {
        taskId: taskId as string,
        projectId: task.projectId,
        name: file.originalname,
        url: `/uploads/${file.filename}`,
        type: file.mimetype,
      }
    });

    res.status(201).json({ document });
  } catch (error) {
    console.error('Upload task attachment error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteTaskAttachment = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      const doc = await prisma.document.findUnique({ where: { id: id as string } });
      
      if (!doc) {
        res.status(404).json({ error: 'Attachment not found' });
        return;
      }
  
      // Delete from DB
      await prisma.document.delete({ where: { id: id as string } });
  
      // Optional: delete file from physical storage
      const filePath = path.join(process.cwd(), 'public', doc.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
  
      res.status(200).json({ message: 'Attachment deleted successfully' });
    } catch (error) {
      console.error('Delete attachment error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
