import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { MilestoneStatus, Prisma } from '@prisma/client';
import { logActivity } from '../services/activity.service';
import { createNotification } from '../services/notification.service';

/**
 * Helper to update project finance totals
 */
const updateProjectTotals = async (db: Prisma.TransactionClient | typeof prisma, projectId: string) => {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { totalValue: true }
  });

  const totalValue = project?.totalValue || 0;

  const payments = await db.projectPayment.aggregate({
    where: { projectId },
    _sum: { amount: true }
  });

  const receivedAmount = payments._sum.amount || 0;
  const pendingAmount = Math.max(0, totalValue - receivedAmount);

  await db.project.update({
    where: { id: projectId },
    data: {
      receivedAmount,
      pendingAmount
    }
  });
};

const canManageProjectFinance = async (projectId: string, user: any): Promise<boolean> => {
  if (user?.role === 'ADMIN') return true;
  if (!['PROJECT_MANAGER', 'MANAGER'].includes(user?.role)) return false;
  const project = await prisma.project.findFirst({
    where: { id: projectId, managerId: user.id },
    select: { id: true }
  });
  return !!project;
};

export const createMilestone = async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.id);
    if (!(await canManageProjectFinance(projectId, (req as any).user))) {
      return res.status(403).json({ success: false, message: 'Unauthorized to manage this project finance' });
    }
    const schema = z.object({
      title: z.string().min(1),
      amount: z.number().positive(),
      dueDate: z.string(),
      releaseDate: z.string().optional(),
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
        releaseDate: data.releaseDate ? new Date(data.releaseDate) : null,
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
    res.status(400).json({ success: false, message: 'Invalid data' });
  }
};

export const getProjectMilestones = async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.id);
    if (!(await canManageProjectFinance(projectId, (req as any).user))) {
      return res.status(403).json({ success: false, message: 'Unauthorized to manage this project finance' });
    }
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
    const projectId = String(req.params.id);
    if (!(await canManageProjectFinance(projectId, (req as any).user))) {
      return res.status(403).json({ success: false, message: 'Unauthorized to manage this project finance' });
    }
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

    const { payment, project } = await prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({ where: { id: projectId }, select: { name: true } });
      if (!project) throw new Error('PROJECT_NOT_FOUND');

      if (data.transactionId) {
        const existing = await tx.projectPayment.findFirst({ where: { transactionId: data.transactionId } });
        if (existing) throw new Error('DUPLICATE_TRANSACTION');
      }

      let milestone: { id: string; amount: number; paidAmount: number } | null = null;
      if (data.milestoneId) {
        // Scope the lookup by project so a payment cannot mutate another project.
        milestone = await tx.projectMilestone.findFirst({
          where: { id: data.milestoneId, projectId },
          select: { id: true, amount: true, paidAmount: true }
        });
        if (!milestone) throw new Error('MILESTONE_NOT_FOUND');
      }

      const payment = await tx.projectPayment.create({
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

      if (milestone) {
        const totalPaid = milestone.paidAmount + data.amount;
        const newStatus: MilestoneStatus = totalPaid >= milestone.amount ? 'PAID' : 'PARTIALLY_PAID';
        await tx.projectMilestone.update({
          where: { id: milestone.id },
          data: {
            paidAmount: totalPaid,
            status: newStatus,
            completedAt: newStatus === 'PAID' ? new Date() : undefined
          }
        });
      }

      await updateProjectTotals(tx, projectId);
      return { payment, project };
    });

    await logActivity(
      userId,
      'PAYMENT_RECORDED',
      `recorded payment of ₹${data.amount} for project "${project.name}"`,
      'PROJECT',
      projectId
    );

    res.status(201).json({ success: true, payment });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'PROJECT_NOT_FOUND' || error.message === 'MILESTONE_NOT_FOUND') {
        res.status(404).json({ success: false, message: error.message === 'PROJECT_NOT_FOUND' ? 'Project not found' : 'Milestone not found for this project' });
        return;
      }
      if (error.message === 'DUPLICATE_TRANSACTION') {
        res.status(400).json({ success: false, message: 'Duplicate transaction ID detected' });
        return;
      }
    }
    res.status(400).json({ success: false, message: 'Failed to record payment' });
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
    const projectId = String(req.params.id);
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
    const id = String(req.params.milestoneId);
    const schema = z.object({
      title: z.string().optional(),
      amount: z.number().positive().optional(),
      dueDate: z.string().optional(),
      releaseDate: z.string().nullable().optional(),
      completedAt: z.string().nullable().optional(),
      notes: z.string().optional(),
      status: z.enum(['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE']).optional()
    });

    const data = schema.parse(req.body);
    const userId = (req as any).user.id;

    const currentProject = await prisma.projectMilestone.findUnique({
      where: { id },
      select: { project: { select: { id: true } } }
    });
    if (!currentProject || !(await canManageProjectFinance(currentProject.project.id, (req as any).user))) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update this milestone' });
    }

    // If marking as PAID, fetch current milestone to set paidAmount = amount
    let updateData: any = {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      releaseDate: data.releaseDate === null ? null : data.releaseDate ? new Date(data.releaseDate) : undefined,
      completedAt: data.completedAt === null ? null : data.completedAt ? new Date(data.completedAt) : undefined
    };

    if (data.status === 'PAID') {
      const current = await prisma.projectMilestone.findUnique({ where: { id }, select: { amount: true, completedAt: true } });
      if (current) {
        updateData.paidAmount = current.amount;
        if (!data.completedAt) {
          updateData.completedAt = current.completedAt || new Date();
        }
      }
    }

    const milestone = await prisma.projectMilestone.update({
      where: { id },
      data: updateData,
      include: { project: { select: { name: true } } }
    });

    // Sync project finance totals after milestone status change
    await updateProjectTotals(prisma, milestone.projectId);

    await logActivity(
      userId,
      'MILESTONE_UPDATED',
      `updated milestone "${milestone.title}" for project "${milestone.project.name}"`,
      'PROJECT',
      milestone.projectId
    );

    res.json({ success: true, milestone });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Update failed' });
  }
};

export const deleteMilestone = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.milestoneId);
    const userId = (req as any).user.id;

    const milestone = await prisma.projectMilestone.findUnique({
      where: { id },
      include: { project: { select: { name: true, managerId: true } }, payments: true }
    });

    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });

    const user = (req as any).user;
    if (user.role === 'PROJECT_MANAGER' && milestone.project.managerId !== user.id) {
      return res.status(403).json({ success: false, message: 'Only the project manager can delete this milestone' });
    }

    if (milestone.payments.length > 0 || milestone.paidAmount > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete milestone with recorded payments. Remove payments first.' });
    }

    await prisma.projectMilestone.delete({ where: { id } });

    // Recalculate project finance totals after deletion
    await updateProjectTotals(prisma, milestone.projectId);

    await logActivity(
      userId,
      'MILESTONE_DELETED',
      `deleted milestone "${milestone.title}" from project "${milestone.project.name}"`,
      'PROJECT',
      milestone.projectId
    );

    res.json({ success: true, message: 'Milestone deleted' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Delete failed' });
  }
};

export const getAllMilestones = async (req: Request, res: Response) => {
  try {
    const milestones = await prisma.projectMilestone.findMany({
      include: {
        project: { select: { id: true, name: true, totalValue: true } },
        payments: {
          select: { amount: true, mode: true, transactionId: true, date: true, notes: true, createdBy: { select: { name: true } } },
          orderBy: { date: 'desc' }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    const totalAmount = milestones.reduce((s: number, m: any) => s + m.amount, 0);
    const totalPaid = milestones.reduce((s: number, m: any) => s + m.paidAmount, 0);
    const totalPending = totalAmount - totalPaid;
    const overdue = milestones.filter((m: any) => m.status === 'OVERDUE' || (m.status !== 'PAID' && new Date(m.dueDate) < new Date()));
    const paid = milestones.filter((m: any) => m.status === 'PAID');
    const pending = milestones.filter((m: any) => m.status === 'PENDING');
    const partiallyPaid = milestones.filter((m: any) => m.status === 'PARTIALLY_PAID');

    res.json({
      success: true,
      milestones,
      stats: { totalAmount, totalPaid, totalPending, overdueCount: overdue.length, paidCount: paid.length, pendingCount: pending.length, partiallyPaidCount: partiallyPaid.length }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
