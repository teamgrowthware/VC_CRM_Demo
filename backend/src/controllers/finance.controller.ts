import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';
import { calculateEmployeePayroll } from '../services/payroll.service';
import { logActivity } from '../services/activity.service';
import { createNotification } from '../services/notification.service';
import { format, startOfMonth, endOfMonth, subMonths, getDaysInMonth, differenceInDays, isAfter } from 'date-fns';

interface AuthRequest extends Request {
  user?: any;
}

// HR/MANAGER can only see salary data of regular EMPLOYEEs;
// salaries of HR/MANAGER/ADMIN staff stay visible to ADMIN only.
const scopeFilter = (req: AuthRequest): any =>
  req.user.role === 'ADMIN' ? {} : { employee: { role: 'EMPLOYEE' } };

export const getFinanceOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month as string) || new Date().getMonth() + 1;
    const y = parseInt(year as string) || new Date().getFullYear();

    const startDate = startOfMonth(new Date(y, m - 1));
    const endDate = endOfMonth(new Date(y, m - 1));

    // 1. Total Monthly Payroll (Sum of netSalary for the month)
    const payrolls = await prisma.payroll.findMany({
      where: { month: m, year: y, ...scopeFilter(req) },
      include: { employee: { select: { name: true } } }
    });
    const totalPayroll = payrolls.reduce((acc, p) => acc + p.netSalary, 0);
    const paidSalary = payrolls.filter(p => p.status === 'PAID').reduce((acc, p) => acc + p.netSalary, 0);
    const pendingSalary = totalPayroll - paidSalary;

    // 2. Total Revenue for the month
    const revenue = await prisma.revenue.aggregate({
      where: { date: { gte: startDate, lte: endDate } },
      _sum: { amount: true }
    });
    const totalRevenue = revenue._sum.amount || 0;

    // 3. Total Expenses
    const expenses = await prisma.expense.findMany({
      where: { date: { gte: startDate, lte: endDate } }
    });
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

    // 4. Petty Cash Summary
    const pettyCashIn = await prisma.pettyCash.aggregate({
      where: { date: { gte: startDate, lte: endDate }, type: 'IN' },
      _sum: { amount: true }
    });
    const pettyCashOut = await prisma.pettyCash.aggregate({
      where: { date: { gte: startDate, lte: endDate }, type: 'OUT' },
      _sum: { amount: true }
    });
    const pettyCashExpense = pettyCashOut._sum.amount || 0;

    // 5. Employee Deductions
    const deductions = await prisma.salaryDeduction.aggregate({
      where: { month: m, year: y, ...scopeFilter(req) },
      _sum: { amount: true }
    });

    // 6. Net Payable (Pending Salary + Pending Expenses)
    const netPayable = pendingSalary + (totalExpenses + pettyCashExpense);

    // 7. Recent Transactions (Expenses + Petty Cash + Paid Payrolls)
    const recentTransactions = [
      ...payrolls
        .filter(p => p.status === 'PAID')
        .map(p => ({
          type: 'PAYROLL',
          title: `Salary — ${p.employee?.name || 'Employee'}`,
          amount: p.netSalary,
          date: p.paymentDate || p.createdAt,
          status: 'PAID'
        })),
      ...expenses.map(e => ({
        type: 'EXPENSE',
        title: e.description,
        amount: e.amount,
        date: e.date,
        status: e.status
      })),
      ...(await prisma.pettyCash.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        include: { handledBy: { select: { name: true } } },
        orderBy: { date: 'desc' }
      })).map(pc => ({
        type: pc.type === 'IN' ? 'PETTY_CASH_IN' : 'PETTY_CASH_OUT',
        title: pc.remarks || `Petty Cash ${pc.type}`,
        amount: pc.amount,
        date: pc.date,
        status: pc.type
      }))
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: Math.round(totalRevenue),
        totalPayroll: Math.round(totalPayroll),
        paidSalary: Math.round(paidSalary),
        pendingSalary: Math.round(pendingSalary),
        totalExpenses: Math.round(totalExpenses),
        pettyCashExpense: Math.round(pettyCashExpense),
        totalDeductions: Math.round(deductions._sum.amount || 0),
        netPayable: Math.round(netPayable),
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Finance overview error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch finance overview' });
  }
};

export const getPayrollRecords = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month as string) || new Date().getMonth() + 1;
    const y = parseInt(year as string) || new Date().getFullYear();

    const payrolls = await prisma.payroll.findMany({
      where: { month: m, year: y, ...scopeFilter(req) },
      include: { employee: { select: { name: true, employeeId: true, department: { select: { name: true } }, designation: true } } },
      orderBy: { netSalary: 'desc' }
    });

    res.status(200).json({ success: true, data: payrolls });
  } catch (error) {
    console.error('Get payroll records error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payroll records' });
  }
};

export const generatePayroll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year } = req.body;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const employees = await prisma.employee.findMany({
      where: { 
        status: 'ACTIVE',
        joiningDate: { lte: endOfMonth(new Date(y, m - 1)) }
      },
      include: {
        attendance: {
          where: {
            date: {
              gte: startOfMonth(new Date(y, m - 1)),
              lte: endOfMonth(new Date(y, m - 1))
            }
          }
        },
        salaryDeductions: {
          where: { month: m, year: y }
        },
        salaryAddons: {
          where: { month: m, year: y }
        },
        penalties: {
          where: {
            date: {
              gte: startOfMonth(new Date(y, m - 1)),
              lte: endOfMonth(new Date(y, m - 1))
            }
          }
        }
      }
    });

    const payrollResults = [];

    for (const emp of employees) {
      const result = await calculateEmployeePayroll(emp.id, month, year);

      const payroll = await prisma.payroll.upsert({
        where: {
          employeeId_month_year: {
            employeeId: emp.id,
            month: m,
            year: y
          }
        },
        update: {
          baseSalary: result.baseSalary,
          presentDays: result.presentDays,
          leaveDays: result.absentDays,
          unpaidLeaveDays: result.absentDays,
          halfDays: result.halfDays,
          productiveHours: result.productiveHours,
          totalPenalties: result.totalPenalties,
          bonus: result.totalAddons,
          totalDeductions: result.totalDeductions,
          netSalary: result.netSalary,
          status: 'PENDING'
        },
        create: {
          employeeId: emp.id,
          month: m,
          year: y,
          baseSalary: result.baseSalary,
          presentDays: result.presentDays,
          leaveDays: result.absentDays,
          unpaidLeaveDays: result.absentDays,
          halfDays: result.halfDays,
          productiveHours: result.productiveHours,
          totalPenalties: result.totalPenalties,
          bonus: result.totalAddons,
          totalDeductions: result.totalDeductions,
          netSalary: result.netSalary,
          status: 'PENDING'
        }
      });

      payrollResults.push(payroll);
    }

    res.status(200).json({ success: true, message: `Payroll generated for ${payrollResults.length} employees`, data: payrollResults });
  } catch (error) {
    console.error('Generate payroll error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate payroll' });
  }
};

export const paySalary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentMode, paymentDate } = req.body;
    const file = req.file;

    const updateData: any = {
      status: 'PAID',
      paymentMode,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date()
    };

    if (file) {
      updateData.paymentProof = `/uploads/${file.filename}`;
    }

    const payroll = await prisma.payroll.update({
      where: { id: id as string },
      data: updateData
    });

    res.status(200).json({ success: true, message: 'Salary marked as paid', data: payroll });
  } catch (error) {
    console.error('Pay salary error:', error);
    res.status(500).json({ success: false, message: 'Failed to update payment status' });
  }
};

export const addDeduction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeId, type, amount, reason, month, year } = req.body;

    if (parseFloat(amount) < 0) {
      res.status(400).json({ success: false, message: 'Amount cannot be negative' });
      return;
    }

    if (req.user.role !== 'ADMIN') {
      const target = await prisma.employee.findUnique({
        where: { id: employeeId as string },
        select: { role: true }
      });
      if (!target || target.role !== 'EMPLOYEE') {
        res.status(403).json({ success: false, message: 'You can only manage deductions for regular employees' });
        return;
      }
    }

    const deduction = await prisma.salaryDeduction.create({
      data: {
        employeeId,
        type,
        amount: parseFloat(amount),
        reason,
        month: parseInt(month),
        year: parseInt(year)
      }
    });

    res.status(201).json({ success: true, data: deduction });
  } catch (error) {
    console.error('Add deduction error:', error);
    res.status(500).json({ success: false, message: 'Failed to add deduction' });
  }
};

export const addAddon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeId, type, amount, reason, month, year } = req.body;

    if (parseFloat(amount) < 0) {
      res.status(400).json({ success: false, message: 'Amount cannot be negative' });
      return;
    }

    if (req.user.role !== 'ADMIN') {
      const target = await prisma.employee.findUnique({
        where: { id: employeeId as string },
        select: { role: true }
      });
      if (!target || target.role !== 'EMPLOYEE') {
        res.status(403).json({ success: false, message: 'You can only manage bonuses for regular employees' });
        return;
      }
    }

    const addon = await prisma.salaryAddon.create({
      data: {
        employeeId,
        type,
        amount: parseFloat(amount),
        reason,
        month: parseInt(month),
        year: parseInt(year)
      }
    });

    res.status(201).json({ success: true, data: addon });
  } catch (error) {
    console.error('Add addon error:', error);
    res.status(500).json({ success: false, message: 'Failed to add bonus/incentive' });
  }
};

export const getExpenses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, startDate, endDate } = req.query;
    
    const where: any = {};
    if (category) where.category = category;
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { 
        employee: { select: { name: true } },
        paidBy: { select: { name: true } },
        approvedBy: { select: { name: true } }
      },
      orderBy: { date: 'desc' }
    });

    res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch expenses' });
  }
};

export const addExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, category, description, paymentMode, date, employeeId } = req.body;

    if (parseFloat(amount) < 0) {
      res.status(400).json({ success: false, message: 'Amount cannot be negative' });
      return;
    }

    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        category,
        description,
        paymentMode,
        date: date ? new Date(date) : new Date(),
        employeeId: employeeId || null,
        status: 'APPROVED', // Admin added expenses are auto-approved
        approvedById: req.user.id
      }
    });

    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ success: false, message: 'Failed to add expense' });
  }
};

export const getPettyCash = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const records = await prisma.pettyCash.findMany({
      include: { handledBy: { select: { name: true } } },
      orderBy: { date: 'desc' }
    });
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    console.error('Get petty cash error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch petty cash records' });
  }
};

export const addPettyCash = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, amount, category, remarks } = req.body;
    
    // Get last closing balance
    const lastEntry = await prisma.pettyCash.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    const currentBalance = lastEntry ? lastEntry.closingBalance : 0;
    const amt = parseFloat(amount);
    const newBalance = type === 'IN' ? currentBalance + amt : currentBalance - amt;

    const entry = await prisma.pettyCash.create({
      data: {
        type,
        amount: amt,
        category,
        remarks,
        closingBalance: newBalance,
        handledById: req.user.id
      }
    });

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error('Add petty cash error:', error);
    res.status(500).json({ success: false, message: 'Failed to add petty cash entry' });
  }
};

export const getSalaryAddons = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month as string) || new Date().getMonth() + 1;
    const y = parseInt(year as string) || new Date().getFullYear();

    const addons = await prisma.salaryAddon.findMany({
      where: { month: m, year: y, ...scopeFilter(req) },
      include: { employee: { select: { name: true, employeeId: true } } },
      orderBy: { date: 'desc' }
    });

    res.status(200).json({ success: true, data: addons });
  } catch (error) {
    console.error('Get addons error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bonuses/incentives' });
  }
};

export const deleteSalaryAddon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.salaryAddon.delete({ where: { id: id as string } });
    res.status(200).json({ success: true, message: 'Bonus/Incentive deleted' });
  } catch (error) {
    console.error('Delete addon error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete bonus/Incentive' });
  }
};

export const getSalaryDeductions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month as string) || new Date().getMonth() + 1;
    const y = parseInt(year as string) || new Date().getFullYear();

    const deductions = await prisma.salaryDeduction.findMany({
      where: { month: m, year: y, ...scopeFilter(req) },
      include: { employee: { select: { name: true, employeeId: true } } },
      orderBy: { date: 'desc' }
    });

    res.status(200).json({ success: true, data: deductions });
  } catch (error) {
    console.error('Get deductions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch deductions' });
  }
};

export const deleteSalaryDeduction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.salaryDeduction.delete({ where: { id: id as string } });
    res.status(200).json({ success: true, message: 'Deduction deleted' });
  } catch (error) {
    console.error('Delete deduction error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete deduction' });
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.expense.delete({ where: { id: id as string } });
    res.status(200).json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete expense' });
  }
};

export const deletePettyCash = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.pettyCash.delete({ where: { id: id as string } });
    res.status(200).json({ success: true, message: 'Petty cash entry deleted' });
  } catch (error) {
    console.error('Delete petty cash error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete petty cash entry' });
  }
};

const getFinanceSettings = async () => {
  return prisma.systemSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' }
  });
};

export const verifyFinancePin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { pin } = req.body;
    if (!pin || typeof pin !== 'string') {
      res.status(400).json({ success: false, message: 'PIN is required' });
      return;
    }

    const settings = await getFinanceSettings();
    const valid = settings.financePin === pin;

    res.status(200).json({ success: valid, message: valid ? 'PIN verified' : 'Invalid PIN' });
  } catch (error) {
    console.error('Verify finance pin error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify PIN' });
  }
};

export const updateFinancePin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { pin, currentPin } = req.body;

    if (!pin || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      res.status(400).json({ success: false, message: 'New PIN must be exactly 4 digits' });
      return;
    }

    if (currentPin && typeof currentPin === 'string') {
      const settings = await getFinanceSettings();
      if (settings.financePin !== currentPin) {
        res.status(400).json({ success: false, message: 'Current PIN is incorrect' });
        return;
      }
    }

    const settings = await prisma.systemSettings.update({
      where: { id: 'default' },
      data: { financePin: pin }
    });

    logActivity(req.user.id, 'FINANCE', 'Updated the finance access PIN', 'SystemSettings', 'default');

    res.status(200).json({ success: true, message: 'Finance PIN updated successfully', data: settings });
  } catch (error) {
    console.error('Update finance pin error:', error);
    res.status(500).json({ success: false, message: 'Failed to update PIN' });
  }
};
