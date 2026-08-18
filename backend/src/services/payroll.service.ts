import prisma from '../lib/prisma';
import { getDaysInMonth, startOfMonth, endOfMonth, differenceInDays, isAfter } from 'date-fns';

const STANDARD_HOURS = 160;
const OVERTIME_MULTIPLIER = 1.5;

export type PayrollDeductionType = 'ABSENT' | 'HALFDAY' | 'PENALTY' | 'DEDUCTION' | 'JOINING';

export interface PayrollDeductionItem {
  type: PayrollDeductionType;
  label: string;
  date: Date;
  amount: number;
  id?: string;
}

export interface PayrollAddonItem {
  type: string;
  amount: number;
  reason: string;
  date: Date;
}

export interface LeaveDetailItem {
  id: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  numberOfDays: number;
  reason: string;
  isPaid: boolean;
  status: string;
}

export interface EmployeePayrollResult {
  employeeId: string;
  baseSalary: number;
  perDaySalary: number;
  daysInMonth: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  lateMarks: number;
  joiningDeduction: number;
  productiveHours: number;
  overtimeHours: number;
  overtimePay: number;
  totalAddons: number;
  addons: PayrollAddonItem[];
  totalCustomDeductions: number;
  customDeductions: PayrollAddonItem[];
  totalPenalties: number;
  attendanceDeductions: number;
  deductionBreakdown: PayrollDeductionItem[];
  totalDeductions: number;
  grossEarnings: number;
  netSalary: number;
  leaveDetails: LeaveDetailItem[];
  paidLeaveDays: number;
  unpaidLeaveDays: number;
}

/**
 * Single source of truth for payroll calculation.
 *
 * Used by:
 *  - employee self view  (/payroll/my-payroll)
 *  - admin/HR team view  (/payroll/group-payroll)
 *  - admin finance payroll generation (/admin/finance/payroll/generate)
 *  - payslip generation
 *
 * Formula:
 *   grossEarnings = baseSalary + overtimePay + totalAddons
 *   totalDeductions = attendanceDeductions + totalPenalties + customDeductions + joiningProRata
 *   netSalary = max(0, grossEarnings - totalDeductions)
 */
export async function calculateEmployeePayroll(
  employeeId: string,
  month: number,
  year: number
): Promise<EmployeePayrollResult> {
  const startDate = startOfMonth(new Date(year, month - 1));
  const endDate = endOfMonth(new Date(year, month - 1));
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { baseSalary: true, joiningDate: true }
  });

  const baseSalary = employee?.baseSalary || 0;
  const perDaySalary = daysInMonth > 0 ? baseSalary / daysInMonth : 0;

  // Joining pro-rata deduction (deduct days before joining)
  let joiningDeduction = 0;
  if (employee?.joiningDate && isAfter(employee.joiningDate, startDate)) {
    joiningDeduction = differenceInDays(employee.joiningDate, startDate) * perDaySalary;
  }

  // Attendance-based deductions
  const attendance = await prisma.attendance.findMany({
    where: { employeeId, date: { gte: startDate, lte: endDate } },
    select: { status: true, date: true }
  });

  const presentDays = attendance.filter(
    a => a.status === 'PRESENT' || a.status === 'WEEKEND' || a.status === 'WEEKEND_WORK'
  ).length;
  const absentRecords = attendance.filter(a => a.status === 'ABSENT');
  const halfDayRecords = attendance.filter(a => a.status === 'HALFDAY');
  const halfDays = halfDayRecords.length;
  const lateMarks = attendance.filter(a => a.status === 'LATE').length;

  // Fetch approved leaves to determine paid vs unpaid
  const approvedLeaves = await prisma.leave.findMany({
    where: {
      employeeId,
      status: 'APPROVED',
      OR: [
        { startDate: { lte: endDate }, endDate: { gte: startDate } }
      ]
    },
    orderBy: { startDate: 'asc' }
  });

  // Build set of dates that fall within paid leaves
  const paidLeaveDates = new Set<string>();
  const leaveDetails: LeaveDetailItem[] = approvedLeaves.map(l => ({
    id: l.id,
    leaveType: l.leaveType,
    startDate: l.startDate,
    endDate: l.endDate,
    numberOfDays: l.numberOfDays,
    reason: l.reason,
    isPaid: l.isPaid,
    status: l.status
  }));

  for (const leave of approvedLeaves) {
    if (!leave.isPaid) continue;
    const leaveStart = leave.startDate > startDate ? leave.startDate : startDate;
    const leaveEnd = leave.endDate < endDate ? leave.endDate : endDate;
    let d = new Date(leaveStart);
    while (d <= leaveEnd) {
      const dayStr = d.toISOString().slice(0, 10);
      paidLeaveDates.add(dayStr);
      d = new Date(d.getTime() + 86400000);
    }
  }

  // Count absent days excluding paid leave dates
  const unpaidAbsentRecords = absentRecords.filter(a => {
    const dateStr = a.date.toISOString().slice(0, 10);
    return !paidLeaveDates.has(dateStr);
  });
  const paidAbsentCount = absentRecords.length - unpaidAbsentRecords.length;
  const absentDays = unpaidAbsentRecords.length;

  // Count paid vs unpaid leave days
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  for (const leave of approvedLeaves) {
    if (leave.isPaid) {
      paidLeaveDays += leave.numberOfDays;
    } else {
      unpaidLeaveDays += leave.numberOfDays;
    }
  }

  // Penalties (auto-penalties are already covered via attendance deductions)
  const penalties = await prisma.penalty.findMany({
    where: { employeeId, date: { gte: startDate, lte: endDate } }
  });
  const manualPenalties = penalties.filter(p => !p.reason.startsWith('Auto-Penalty'));
  const totalPenalties = manualPenalties.reduce((sum, p) => sum + p.amount, 0);

  // Custom salary deductions (advance, loan, etc.) & addons (bonus, incentive)
  const [salaryDeductions, salaryAddons] = await Promise.all([
    prisma.salaryDeduction.findMany({ where: { employeeId, month, year } }),
    prisma.salaryAddon.findMany({ where: { employeeId, month, year } })
  ]);
  const totalCustomDeductions = salaryDeductions.reduce((sum, d) => sum + d.amount, 0);
  const totalAddons = salaryAddons.reduce((sum, a) => sum + a.amount, 0);

  // Overtime from approved time entries
  const timeEntries = await prisma.timeEntry.findMany({
    where: { employeeId, status: 'APPROVED', date: { gte: startDate, lte: endDate } }
  });
  const totalProductiveMinutes = timeEntries.reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
  const productiveHours = Number((totalProductiveMinutes / 60).toFixed(2));
  const overtimeHours = Math.max(0, productiveHours - STANDARD_HOURS);
  const hourlyRate = STANDARD_HOURS > 0 ? baseSalary / STANDARD_HOURS : 0;
  const overtimePay = Math.round(overtimeHours * hourlyRate * OVERTIME_MULTIPLIER);

  // Deduction breakdown (so everyone can see exactly how much & why)
  const deductionBreakdown: PayrollDeductionItem[] = [
    ...unpaidAbsentRecords.map(a => ({ type: 'ABSENT' as const, label: 'Absent (Unpaid Leave)', date: a.date, amount: Math.round(perDaySalary) })),
    ...halfDayRecords.map(a => ({ type: 'HALFDAY' as const, label: 'Half Day', date: a.date, amount: Math.round(perDaySalary * 0.5) })),
    ...manualPenalties.map(p => ({ type: 'PENALTY' as const, label: p.reason, date: p.date, amount: p.amount, id: p.id })),
    ...salaryDeductions.map(d => ({ type: 'DEDUCTION' as const, label: d.type, date: d.date, amount: d.amount, id: d.id }))
  ];
  if (joiningDeduction > 0) {
    deductionBreakdown.push({
      type: 'JOINING' as const,
      label: 'Joining Pro-rata',
      date: startDate,
      amount: Math.round(joiningDeduction)
    });
  }
  deductionBreakdown.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const attendanceDeductions = deductionBreakdown
    .filter(d => d.type === 'ABSENT' || d.type === 'HALFDAY')
    .reduce((sum, d) => sum + d.amount, 0);

  const totalDeductions = Math.round(
    attendanceDeductions + totalPenalties + totalCustomDeductions + joiningDeduction
  );
  const grossEarnings = Math.round(baseSalary + overtimePay + totalAddons);
  const netSalary = Math.max(0, Math.round(grossEarnings - totalDeductions));

  return {
    employeeId,
    baseSalary,
    perDaySalary: Math.round(perDaySalary * 100) / 100,
    daysInMonth,
    presentDays,
    absentDays,
    halfDays,
    lateMarks,
    joiningDeduction: Math.round(joiningDeduction),
    productiveHours,
    overtimeHours,
    overtimePay,
    totalAddons,
    addons: salaryAddons.map(a => ({ type: a.type, amount: a.amount, reason: a.reason, date: a.date })),
    totalCustomDeductions: Math.round(totalCustomDeductions),
    customDeductions: salaryDeductions.map(d => ({ type: d.type, amount: d.amount, reason: d.reason, date: d.date })),
    totalPenalties: Math.round(totalPenalties),
    attendanceDeductions: Math.round(attendanceDeductions),
    deductionBreakdown: deductionBreakdown.map(d => ({ ...d, amount: Math.round(d.amount) })),
    totalDeductions,
    grossEarnings,
    netSalary,
    leaveDetails,
    paidLeaveDays,
    unpaidLeaveDays
  };
}
