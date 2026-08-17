import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { MilestoneStatus } from '@prisma/client';
import { logActivity } from '../services/activity.service';
import { createNotification } from '../services/notification.service';

/**
 * Helper to update project finance totals
 */
const updateProjectTotals = async (projectId: string) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { totalValue: true }
  });

  const totalValue = project?.totalValue || 0;

  const payments = await prisma.projectPayment.aggregate({
    where: { projectId },
    _sum: { amount: true }
  });

  const receivedAmount = payments._sum.amount || 0;
  const pendingAmount = Math.max(0, totalValue - receivedAmount);

  await prisma.project.update({
    where: { id: projectId },
    data: {
      receivedAmount,
      pendingAmount
    }
  });
};

export const createMilestone = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const schema = z.object({
      title: z.string().min(1),
      amount: z.number().positive(),
      dueDate: z.string(),
      notes: z.string().optional(),
    });

    const data = schema.parse(req.body);

    // Check project totalValue
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { milestones: true }
    });

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const currentTotal = project.milestones.reduce((sum: number, m: any) => sum + m.amount, 0);
    const newTotal = currentTotal + data.amount;

    // Rule: Milestone sum <= totalValue during draft, must match exactly if finalized (enforced elsewhere)
    if (project.totalValue && newTotal > project.totalValue) {
      return res.status(400).json({ 
        success: false, 
        message: `Milestone sum (${newTotal}) cannot exceed project total value (${project.totalValue})` 
      });
    }

    const milestone = await prisma.projectMilestone.create({
      data: {
        projectId,
        title: data.title,
        amount: data.amount,
        dueDate: new Date(data.dueDate),
        notes: data.notes,
        status: 'PENDING'
      }
    });

    await logActivity(
      (req as any).user.id,
      'MILESTONE_CREATED',
      `created milestone "${milestone.title}" (₹${milestone.amount}) for project "${project.name}"`,
      'PROJECT',
      projectId
    );

    res.status(201).json({ success: true, milestone });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid data', error });
  }
};

export const getProjectMilestones = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const milestones = await prisma.projectMilestone.findMany({
      where: { projectId: projectId as any },
      include: { 
        payments: {
          include: { createdBy: { select: { name: true } } }
        } 
      },
      orderBy: { dueDate: 'asc' }
    });
    res.json({ success: true, milestones });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const recordPayment = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const schema = z.object({
      milestoneId: z.string().optional(),
      amount: z.number().positive(),
      mode: z.string(),
      transactionId: z.string().optional(),
      paymentReference: z.string().optional(),
      receiptUrl: z.string().optional(),
      notes: z.string().optional(),
      date: z.string().optional()
    });

    const data = schema.parse(req.body);
    const userId = (req as any).user.id;

    // Duplicate check for transactionId
    if (data.transactionId) {
      const existing = await prisma.projectPayment.findFirst({
        where: { transactionId: data.transactionId }
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Duplicate transaction ID detected' });
      }
    }

    // Record the payment
    const payment = await prisma.projectPayment.create({
      data: {
        projectId,
        milestoneId: data.milestoneId,
        amount: data.amount,
        mode: data.mode,
        transactionId: data.transactionId,
        paymentReference: data.paymentReference,
        receiptUrl: data.receiptUrl,
        notes: data.notes,
        createdById: userId,
        date: data.date ? new Date(data.date) : new Date()
      }
    });

    // Update milestone status if applicable
    if (data.milestoneId) {
      const milestone = await prisma.projectMilestone.findUnique({
        where: { id: data.milestoneId },
        include: { payments: true }
      });

      if (milestone) {
        const totalPaid = (milestone.paidAmount || 0) + data.amount;
        let newStatus: MilestoneStatus = 'PARTIALLY_PAID';
        
        if (totalPaid >= milestone.amount) {
          newStatus = 'PAID';
        }

        await (prisma.projectMilestone as any).update({
          where: { id: data.milestoneId },
          data: {
            paidAmount: totalPaid,
            status: newStatus,
            paidDate: newStatus === 'PAID' ? new Date() : undefined
          }
        });
      }
    }

    // Update project totals
    await updateProjectTotals(projectId as string);

    const project = await prisma.project.findUnique({ where: { id: projectId as any } });

    await logActivity(
      userId,
      'PAYMENT_RECORDED',
      `recorded payment of ₹${data.amount} for project "${project?.name}"`,
      'PROJECT',
      projectId
    );

    res.status(201).json({ success: true, payment });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to record payment', error });
  }
};

export const getFinancialAnalytics = async (req: Request, res: Response) => {
  try {
    const upcoming = await prisma.projectMilestone.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIALLY_PAID'] },
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      },
      include: { project: { select: { name: true, managerId: true } } },
      orderBy: { dueDate: 'asc' }
    });

    const overdue = await prisma.projectMilestone.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIALLY_PAID'] },
        dueDate: { lt: new Date() }
      },
      include: { project: { select: { name: true, managerId: true } } },
      orderBy: { dueDate: 'asc' }
    });

    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const receivedThisMonth = await prisma.projectPayment.aggregate({
      where: { date: { gte: currentMonthStart } },
      _sum: { amount: true }
    });

    const totalPending = await prisma.project.aggregate({
      _sum: { pendingAmount: true }
    });

    res.json({
      success: true,
      upcoming,
      overdue,
      receivedThisMonth: receivedThisMonth._sum.amount || 0,
      totalPending: totalPending._sum.pendingAmount || 0
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const finalizeProjectFinance = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { milestones: true }
    });

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const milestoneSum = project.milestones.reduce((sum: number, m: any) => sum + m.amount, 0);
    const totalValue = project.totalValue || 0;

    if (Math.abs(milestoneSum - totalValue) > 0.01) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot finalize. Milestone total (₹${milestoneSum}) must match project value (₹${totalValue})` 
      });
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { financeFinalized: true }
    });

    res.json({ success: true, message: 'Project finance finalized' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const updateMilestone = async (req: Request, res: Response) => {
  try {
    const id = req.params.milestoneId as string;
    const schema = z.object({
      title: z.string().optional(),
      amount: z.number().positive().optional(),
      dueDate: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE']).optional()
    });

    const data = schema.parse(req.body);
    const userId = (req as any).user.id;

    const milestone = await (prisma.projectMilestone as any).update({
      where: { id: id as string },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined
      },
      include: { project: { select: { name: true } } }
    });

    await logActivity(
      userId,
      'MILESTONE_UPDATED',
      `updated milestone "${milestone.title}" for project "${milestone.project.name}"`,
      'PROJECT',
      milestone.projectId
    );

    res.json({ success: true, milestone });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Update failed', error });
  }
};
