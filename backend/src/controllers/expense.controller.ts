import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import fs from 'fs';
import path from 'path';

export const getAllExpenses = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;
    const userId = (req as any).user.id;

    let where = {};
    // Only Managers/Admins/HR can see all expenses
    if (userRole === 'EMPLOYEE') {
      where = { employeeId: userId };
    }

    const expenses = await (prisma as any).expense.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching expenses' });
  }
};

export const createExpense = async (req: Request, res: Response) => {
  const { amount, category, description, receiptUrl } = req.body;
  const employeeId = (req as any).user.id;
  try {
    const expense = await (prisma as any).expense.create({
      data: {
        amount: parseFloat(amount),
        category,
        description,
        receiptUrl,
        employeeId,
      },
    });
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Error creating expense' });
  }
};

export const updateExpenseStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const userRole = (req as any).user.role;

  if (!['ADMIN', 'MANAGER', 'HR'].includes(userRole)) {
    return res.status(403).json({ message: 'Only managers/admins can approve expenses' });
  }

  try {
    const expense = await (prisma as any).expense.update({
      where: { id },
      data: { status },
    });
    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Error updating expense status' });
  }
};

export const deleteExpense = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user.id;
  const userRole = (req as any).user.role;

  try {
    const existing = await (prisma as any).expense.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Expense not found' });

    if (existing.employeeId !== userId && !['ADMIN', 'MANAGER'].includes(userRole)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Clean up physical receipt file from disk if it exists
    if (existing.receiptUrl) {
      const filePath = path.join(process.cwd(), 'public', existing.receiptUrl);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error(`Failed to delete physical receipt file: ${filePath}`, e);
        }
      }
    }

    await (prisma as any).expense.delete({ where: { id } });
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting expense' });
  }
};
