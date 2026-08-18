import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { startTimer, stopTimer, getActiveTimer } from './timesheet.controller';

export { startTimer, stopTimer, getActiveTimer };

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

export const getTaskTimeEntries = async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const employeeId = req.user?.id;
    const role = req.user?.role;

    if (!taskId) return res.status(400).json({ message: 'Task id is required' });

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { assignedId: true, projectId: true }
    });

    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isAssigned = task.assignedId === employeeId;
    const isProjectMember = task.projectId
      ? await prisma.projectMember.findFirst({
          where: { projectId: task.projectId, employeeId },
          select: { id: true }
        })
      : null;
    const isAdmin = ['ADMIN', 'MANAGER', 'PROJECT_MANAGER'].includes(role || '');

    if (!isAssigned && !isProjectMember && !isAdmin) {
      return res.status(403).json({ message: 'You do not have access to this task' });
    }

    const entries = await prisma.timeEntry.findMany({
      where: { taskId },
      include: {
        task: { select: { title: true, taskId: true } },
        employee: { select: { name: true, employeeId: true } }
      },
      orderBy: { startTime: 'desc' }
    });

    res.json(entries);
  } catch (error) {
    console.error('Get task time entries error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUserTimeEntries = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const employeeId = req.user?.id;
    const role = req.user?.role;

    if (!userId) return res.status(400).json({ message: 'User id is required' });

    const isSelf = userId === employeeId || userId === 'me';
    const isAdmin = ['ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'HR'].includes(role || '');

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ message: 'You can only view your own time entries' });
    }

    const targetId = isSelf ? (employeeId as string) : userId;

    const entries = await prisma.timeEntry.findMany({
      where: { employeeId: targetId },
      include: {
        task: { select: { title: true, taskId: true } },
        project: { select: { name: true, projectId: true } }
      },
      orderBy: { startTime: 'desc' }
    });

    const totalDurationSeconds = entries.reduce(
      (acc, entry) => acc + (entry.durationMinutes || 0) * 60,
      0
    );

    res.json({ entries, totalDurationSeconds });
  } catch (error) {
    console.error('Get user time entries error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
