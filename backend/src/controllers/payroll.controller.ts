import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getDaysInMonth, startOfMonth, endOfMonth } from 'date-fns';
import { calculateEmployeePayroll } from '../services/payroll.service';

interface AuthRequest extends Request {
  user?: any;
}

export const getMyPayroll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.user.id;
    const date = new Date();
    const month = req.query.month ? Number(req.query.month) : date.getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : date.getFullYear();

    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    const result = await calculateEmployeePayroll(employeeId, month, year);

    const penalties = await prisma.penalty.findMany({
      where: {
        employeeId,
        date: { gte: startDate, lte: endDate }
      },
      orderBy: { date: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: {
        baseSalary: result.baseSalary,
        productiveHours: result.productiveHours,
        overtimeHours: result.overtimeHours,
        overtimePay: result.overtimePay,
        totalAddons: result.totalAddons,
        addons: result.addons,
        totalCustomDeductions: result.totalCustomDeductions,
        joiningDeduction: result.joiningDeduction,
        totalPenalties: result.totalPenalties,
        attendanceDeductions: result.attendanceDeductions,
        grossEarnings: result.grossEarnings,
        netSalary: result.netSalary,
        penalties,
        deductionBreakdown: result.deductionBreakdown,
        absentDays: result.absentDays,
        halfDays: result.halfDays,
        presentDays: result.presentDays
      }
    });
  } catch (error) {
    console.error('Get payroll error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payroll' });
  }
};

export const getGroupPayroll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUserRole = req.user.role;
    if (currentUserRole !== 'ADMIN' && currentUserRole !== 'HR') {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const date = new Date();
    const month = req.query.month ? Number(req.query.month) : date.getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : date.getFullYear();

    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, employeeId: true }
    });

    const penalties = await prisma.penalty.findMany({
      where: {
        date: { gte: startDate, lte: endDate }
      },
      include: {
        employee: { select: { name: true, employeeId: true } }
      },
      orderBy: { date: 'desc' }
    });

    const employeeRows = [];
    let totalBaseSalary = 0;
    let totalAttendanceDeductions = 0;
    let totalPenalties = 0;
    let totalOvertimePay = 0;
    let totalAddons = 0;
    let totalDeductions = 0;
    let totalNetSalary = 0;
    let totalProductiveMinutes = 0;

    for (const emp of employees) {
      const result = await calculateEmployeePayroll(emp.id, month, year);

      totalBaseSalary += result.baseSalary;
      totalAttendanceDeductions += result.attendanceDeductions;
      totalPenalties += result.totalPenalties;
      totalOvertimePay += result.overtimePay;
      totalAddons += result.totalAddons;
      totalDeductions += result.totalDeductions;
      totalNetSalary += result.netSalary;
      totalProductiveMinutes += result.productiveHours * 60;

      employeeRows.push({
        id: emp.id,
        name: emp.name,
        employeeId: emp.employeeId,
        baseSalary: result.baseSalary,
        absentDays: result.absentDays,
        halfDays: result.halfDays,
        attendanceDeductions: result.attendanceDeductions,
        totalPenalties: result.totalPenalties,
        overtimePay: result.overtimePay,
        totalAddons: result.totalAddons,
        totalCustomDeductions: result.totalCustomDeductions,
        joiningDeduction: result.joiningDeduction,
        grossEarnings: result.grossEarnings,
        netSalary: result.netSalary,
        deductions: result.deductionBreakdown
      });
    }

    const totalProductiveHours = Number((totalProductiveMinutes / 60).toFixed(2));

    res.status(200).json({
      success: true,
      data: {
        baseSalary: Math.round(totalBaseSalary),
        totalProductiveHours,
        totalOvertimePay: Math.round(totalOvertimePay),
        totalAddons: Math.round(totalAddons),
        totalPenalties: Math.round(totalPenalties),
        attendanceDeductions: Math.round(totalAttendanceDeductions),
        totalDeductions: Math.round(totalDeductions),
        netSalary: Math.round(totalNetSalary),
        penalties,
        employees: employeeRows
      }
    });
  } catch (error) {
    console.error('Get group payroll error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch team payroll' });
  }
};
