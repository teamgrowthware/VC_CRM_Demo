import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { format, startOfMonth, endOfMonth, getDaysInMonth, differenceInDays, isAfter } from 'date-fns';

interface AuthRequest extends Request {
  user?: any;
}

const getPeriod = (month: number, year: number) => {
  const startDate = startOfMonth(new Date(year, month - 1));
  const endDate = endOfMonth(new Date(year, month - 1));
  return {
    startDate,
    endDate,
    monthLabel: format(startDate, 'MMMM yyyy'),
    period: `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')}`
  };
};

export const getRecentPayslips = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const payslips = await prisma.payslip.findMany({
      where: { employeeId: userId },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    res.json({ success: true, payslips });
  } catch (error) {
    console.error('Error fetching payslips:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getMyPayslips = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    const payslips = await prisma.payslip.findMany({
      where: { employeeId: userId },
      include: { employee: { select: { name: true, employeeId: true } } },
      orderBy: [{ yearInt: 'desc' }, { monthInt: 'desc' }]
    });

    res.status(200).json({ success: true, data: payslips });
  } catch (error) {
    console.error('Get my payslips error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payslips' });
  }
};

export const getAllPayslips = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month as string) || new Date().getMonth() + 1;
    const y = parseInt(year as string) || new Date().getFullYear();

    const payslips = await prisma.payslip.findMany({
      where: { monthInt: m, yearInt: y },
      include: {
        employee: {
          select: {
            name: true,
            employeeId: true,
            designation: true,
            department: { select: { name: true } }
          }
        }
      },
      orderBy: [{ yearInt: 'desc' }, { monthInt: 'desc' }]
    });

    res.status(200).json({ success: true, data: payslips });
  } catch (error) {
    console.error('Get all payslips error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payslips' });
  }
};

export const generateAllPayslips = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year } = req.body;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const { startDate, endDate, monthLabel, period } = getPeriod(m, y);

    const payrolls = await prisma.payroll.findMany({
      where: { month: m, year: y },
      include: {
        employee: {
          select: {
            name: true,
            employeeId: true,
            designation: true,
            joiningDate: true,
            baseSalary: true,
            department: { select: { name: true } }
          }
        }
      }
    });

    if (payrolls.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No payroll records found for this month. Please generate payroll first.'
      });
      return;
    }

    const generated: any[] = [];
    const daysInMonth = getDaysInMonth(new Date(y, m - 1));

    for (const payroll of payrolls) {
      const emp = payroll.employee;
      const baseSalary = payroll.baseSalary || emp?.baseSalary || 0;
      const perDaySalary = daysInMonth > 0 ? baseSalary / daysInMonth : 0;

      // Joining pro-rata deduction
      let joiningDeduction = 0;
      if (emp?.joiningDate && isAfter(emp.joiningDate, startDate)) {
        const daysBeforeJoining = differenceInDays(emp.joiningDate, startDate);
        joiningDeduction = Math.round(daysBeforeJoining * perDaySalary);
      }

      const attendanceDeduction = Math.round((payroll.leaveDays || 0) * perDaySalary);
      const halfDayDeduction = Math.round((payroll.halfDays || 0) * (perDaySalary / 2));

      const salaryAddons = await prisma.salaryAddon.findMany({
        where: { employeeId: payroll.employeeId, month: m, year: y },
        orderBy: { date: 'desc' }
      });
      const salaryDeductions = await prisma.salaryDeduction.findMany({
        where: { employeeId: payroll.employeeId, month: m, year: y },
        orderBy: { date: 'desc' }
      });
      const penalties = await prisma.penalty.findMany({
        where: {
          employeeId: payroll.employeeId,
          date: { gte: startDate, lte: endDate }
        },
        orderBy: { date: 'desc' }
      });

      const totalAddons = salaryAddons.reduce((sum, a) => sum + a.amount, 0);
      const totalCustomDeductions = salaryDeductions.reduce((sum, d) => sum + d.amount, 0);
      const totalPenalties = payroll.totalPenalties || penalties.reduce((sum, p) => sum + p.amount, 0);
      const totalDeductions = Math.round(
        attendanceDeduction + halfDayDeduction + joiningDeduction + totalCustomDeductions + totalPenalties
      );

      const netSalary = Math.max(0, Math.round(baseSalary + totalAddons - totalDeductions));

      const data: any = {
        employee: {
          name: emp?.name || 'Unknown',
          employeeId: emp?.employeeId || '',
          designation: emp?.designation || '',
          department: emp?.department?.name || null,
          joiningDate: emp?.joiningDate || null
        },
        baseSalary,
        perDaySalary: Math.round(perDaySalary * 100) / 100,
        attendance: {
          presentDays: payroll.presentDays,
          absentDays: payroll.leaveDays,
          halfDays: payroll.halfDays,
          lateMarks: payroll.lateMarks,
          productiveHours: payroll.productiveHours,
          overtimeHours: payroll.overtimeHours
        },
        earnings: {
          baseSalary,
          totalAddons,
          addons: salaryAddons.map(a => ({ type: a.type, amount: a.amount, reason: a.reason })),
          grossEarnings: Math.round(baseSalary + totalAddons)
        },
        deductions: {
          attendanceDeduction,
          halfDayDeduction,
          joiningDeduction,
          totalCustomDeductions,
          customDeductions: salaryDeductions.map(d => ({ type: d.type, amount: d.amount, reason: d.reason })),
          totalPenalties,
          penalties: penalties.map(p => ({ amount: p.amount, reason: p.reason })),
          totalDeductions
        },
        netSalary
      };

      const payslip = await prisma.payslip.upsert({
        where: {
          employeeId_monthInt_yearInt: {
            employeeId: payroll.employeeId,
            monthInt: m,
            yearInt: y
          }
        },
        update: {
          month: monthLabel,
          period,
          netSalary,
          data
        },
        create: {
          employeeId: payroll.employeeId,
          month: monthLabel,
          period,
          monthInt: m,
          yearInt: y,
          netSalary,
          data
        }
      });

      generated.push(payslip);
    }

    res.status(200).json({
      success: true,
      message: `Payslips generated for ${generated.length} employees`,
      data: generated
    });
  } catch (error) {
    console.error('Generate payslips error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate payslips' });
  }
};

export const deletePayslip = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.payslip.delete({ where: { id: id as string } });
    res.status(200).json({ success: true, message: 'Payslip deleted' });
  } catch (error) {
    console.error('Delete payslip error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete payslip' });
  }
};
