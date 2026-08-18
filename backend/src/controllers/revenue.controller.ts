import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getAllRevenue = async (req: Request, res: Response) => {
  try {
    const revenue = await prisma.revenue.findMany({
      orderBy: { date: 'desc' },
    });
    res.json(revenue);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch revenue' });
  }
};

export const createRevenue = async (req: Request, res: Response) => {
  try {
    const { amount, source, description, date } = req.body;
    const revenue = await prisma.revenue.create({
      data: {
        amount: Number(amount),
        source,
        description,
        date: date ? new Date(date) : new Date(),
      },
    });
    res.status(201).json(revenue);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create revenue' });
  }
};

export const deleteRevenue = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.revenue.delete({
      where: { id: id as string },
    });
    res.json({ message: 'Revenue deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete revenue' });
  }
};

export const getRevenueStats = async (req: Request, res: Response) => {
  try {
    const totalRevenue = await prisma.revenue.aggregate({
      _sum: { amount: true },
    });
    
    const totalExpenses = await prisma.expense.aggregate({
      where: { status: 'APPROVED' },
      _sum: { amount: true },
    });

    res.json({
      totalRevenue: totalRevenue._sum.amount || 0,
      totalExpenses: totalExpenses._sum.amount || 0,
      netProfit: (totalRevenue._sum.amount || 0) - (totalExpenses._sum.amount || 0),
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch financial stats' });
  }
};
