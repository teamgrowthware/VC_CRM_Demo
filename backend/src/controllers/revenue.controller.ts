import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { logAudit } from '../lib/audit';

interface AuthRequest extends Request {
  user?: any;
}

const createRevenueSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  source: z.string().min(1, 'Source is required'),
  description: z.string().optional(),
  date: z.string().datetime().optional(),
});

export const getAllRevenue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const revenue = await prisma.revenue.findMany({
      orderBy: { date: 'desc' },
    });
    res.status(200).json({ success: true, data: revenue });
  } catch (error) {
    console.error('Error fetching revenue:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch revenue' });
  }
};

export const createRevenue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = createRevenueSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.issues });
      return;
    }

    const { amount, source, description, date } = parsed.data;

    const revenue = await prisma.revenue.create({
      data: {
        amount,
        source,
        description,
        date: date ? new Date(date) : new Date(),
      },
    });

    if (req.user?.id) {
      await logAudit({
        userId: req.user.id,
        action: 'REVENUE_CREATED',
        message: `Created revenue entry: ${source} (${amount})`,
        entityType: 'REVENUE',
        entityId: revenue.id,
      });
    }

    res.status(201).json({ success: true, message: 'Revenue created', data: revenue });
  } catch (error) {
    console.error('Error creating revenue:', error);
    res.status(500).json({ success: false, message: 'Failed to create revenue' });
  }
};

export const deleteRevenue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.revenue.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Revenue entry not found' });
      return;
    }

    await prisma.revenue.delete({ where: { id } });

    if (req.user?.id) {
      await logAudit({
        userId: req.user.id,
        action: 'REVENUE_DELETED',
        message: `Deleted revenue entry: ${existing.source} (${existing.amount})`,
        entityType: 'REVENUE',
        entityId: existing.id,
      });
    }

    res.status(200).json({ success: true, message: 'Revenue deleted successfully' });
  } catch (error) {
    console.error('Error deleting revenue:', error);
    res.status(500).json({ success: false, message: 'Failed to delete revenue' });
  }
};

export const getRevenueStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalRevenue = await prisma.revenue.aggregate({
      _sum: { amount: true },
    });

    const totalExpenses = await prisma.expense.aggregate({
      where: { status: 'APPROVED' },
      _sum: { amount: true },
    });

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: totalRevenue._sum.amount || 0,
        totalExpenses: totalExpenses._sum.amount || 0,
        netProfit: (totalRevenue._sum.amount || 0) - (totalExpenses._sum.amount || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching revenue stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch financial stats' });
  }
};
