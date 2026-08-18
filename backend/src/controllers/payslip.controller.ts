import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { calculateEmployeePayroll } from '../services/payroll.service';

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

    for (const payroll of payrolls) {
      const emp = payroll.employee;

      // Use payroll service as single source of truth
      const result = await calculateEmployeePayroll(payroll.employeeId, m, y);

      const data: any = {
        employee: {
          name: emp?.name || 'Unknown',
          employeeId: emp?.employeeId || '',
          designation: emp?.designation || '',
          department: emp?.department?.name || null,
          joiningDate: emp?.joiningDate || null
        },
        baseSalary: result.baseSalary,
        perDaySalary: result.perDaySalary,
        attendance: {
          presentDays: result.presentDays,
          absentDays: result.absentDays,
          halfDays: result.halfDays,
          lateMarks: result.lateMarks,
          productiveHours: result.productiveHours,
          overtimeHours: result.overtimeHours
        },
        earnings: {
          baseSalary: result.baseSalary,
          overtimePay: result.overtimePay,
          totalAddons: result.totalAddons,
          addons: result.addons.map(a => ({ type: a.type, amount: a.amount, reason: a.reason })),
          grossEarnings: result.grossEarnings
        },
        deductions: {
          attendanceDeduction: result.attendanceDeductions,
          halfDayDeduction: result.deductionBreakdown
            .filter(d => d.type === 'HALFDAY')
            .reduce((sum, d) => sum + d.amount, 0),
          joiningDeduction: result.joiningDeduction,
          totalCustomDeductions: result.totalCustomDeductions,
          customDeductions: result.customDeductions.map(d => ({ type: d.type, amount: d.amount, reason: d.reason })),
          totalPenalties: result.totalPenalties,
          penalties: result.deductionBreakdown
            .filter(d => d.type === 'PENALTY')
            .map(d => ({ amount: d.amount, reason: d.label })),
          totalDeductions: result.totalDeductions
        },
        leaves: result.leaveDetails.map(l => ({
          id: l.id,
          leaveType: l.leaveType,
          startDate: l.startDate,
          endDate: l.endDate,
          numberOfDays: l.numberOfDays,
          reason: l.reason,
          isPaid: l.isPaid,
          status: l.status
        })),
        paidLeaveDays: result.paidLeaveDays,
        unpaidLeaveDays: result.unpaidLeaveDays,
        deductionBreakdown: result.deductionBreakdown.map(d => ({
          type: d.type,
          label: d.label,
          date: d.date,
          amount: d.amount
        })),
        netSalary: result.netSalary
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
          netSalary: result.netSalary,
          data
        },
        create: {
          employeeId: payroll.employeeId,
          month: monthLabel,
          period,
          monthInt: m,
          yearInt: y,
          netSalary: result.netSalary,
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
