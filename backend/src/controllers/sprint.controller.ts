import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';

interface AuthRequest extends Request {
  user?: any;
}

export const createSprint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, projectId, goal, startDate, endDate } = req.body;
    const sprint = await prisma.sprint.create({
      data: { name, projectId, goal, startDate: startDate ? new Date(startDate) : null, endDate: endDate ? new Date(endDate) : null }
    });
    res.status(201).json({ success: true, data: sprint });
  } catch (error) {
    console.error('Create sprint error:', error);
    res.status(500).json({ success: false, message: 'Failed to create sprint' });
  }
};

export const getProjectSprints = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.projectId as string;
    const sprints = await prisma.sprint.findMany({
      where: { projectId },
      include: { tasks: true }
    });
    res.status(200).json({ success: true, data: sprints });
  } catch (error) {
    console.error('Get sprints error:', error);
    res.status(500).json({ success: false, message: 'Failed to get sprints' });
  }
};

export const updateSprintStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status } = req.body; // PLANNED, ACTIVE, CLOSED
    const sprint = await prisma.sprint.update({
      where: { id },
      data: { status }
    });
    res.status(200).json({ success: true, data: sprint });
  } catch (error) {
    console.error('Update sprint error:', error);
    res.status(500).json({ success: false, message: 'Failed to update sprint' });
  }
};


export const getSprint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const sprint = await prisma.sprint.findUnique({
      where: { id },
      include: {
        tasks: {
          include: {
            assignedTo: { select: { id: true, name: true, email: true } },
            project: { select: { id: true, name: true, projectId: true } },
            createdBy: { select: { id: true, name: true } },
            subTasks: { orderBy: { createdAt: 'asc' } },
            comments: { include: { author: { select: { id: true, name: true, role: true } } } },
            documents: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!sprint) {
      res.status(404).json({ success: false, message: 'Sprint not found' });
      return;
    }
    res.status(200).json({ success: true, data: sprint });
  } catch (error) {
    console.error('Get sprint error:', error);
    res.status(500).json({ success: false, message: 'Failed to get sprint' });
  }
};

export const getSprintAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const tasks = await prisma.task.findMany({ where: { sprintId: id } });
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    
    // Very basic analytics placeholder based on our existing Task model
    res.status(200).json({ 
      success: true, 
      data: {
        totalTasks,
        completedTasks,
        completionRate: totalTasks ? (completedTasks / totalTasks) * 100 : 0
      } 
    });
  } catch (error) {
    console.error('Sprint analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to get analytics' });
  }
};

