import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/prisma', () => ({
  default: {
    employee: { findUnique: vi.fn() },
    attendance: { findMany: vi.fn() },
    leave: { findMany: vi.fn() },
    penalty: { findMany: vi.fn() },
    salaryDeduction: { findMany: vi.fn() },
    salaryAddon: { findMany: vi.fn() },
    timeEntry: { findMany: vi.fn() },
  },
}));

import prisma from '../lib/prisma';
import { calculateEmployeePayroll } from '../services/payroll.service';

const mocked = prisma as any;

const JULY_2025 = { month: 7, year: 2025, daysInMonth: 31 };

const attendanceRecord = (day: number, status: string) => ({
  status,
  date: new Date(`2025-07-${String(day).padStart(2, '0')}T12:00:00Z`),
});

const emptyEmployee = { baseSalary: 30000, joiningDate: new Date('2020-01-01T00:00:00Z') };

beforeEach(() => {
  vi.clearAllMocks();
  mocked.employee.findUnique.mockResolvedValue(emptyEmployee);
  mocked.attendance.findMany.mockResolvedValue([]);
  mocked.leave.findMany.mockResolvedValue([]);
  mocked.penalty.findMany.mockResolvedValue([]);
  mocked.salaryDeduction.findMany.mockResolvedValue([]);
  mocked.salaryAddon.findMany.mockResolvedValue([]);
  mocked.timeEntry.findMany.mockResolvedValue([]);
});

describe('calculateEmployeePayroll — attendance counting', () => {
  it('counts PRESENT, WEEKEND_WORK, HOLIDAY and HOLIDAY_WORK as present', async () => {
    mocked.attendance.findMany.mockResolvedValue([
      attendanceRecord(1, 'PRESENT'),
      attendanceRecord(5, 'WEEKEND'),
      attendanceRecord(6, 'WEEKEND_WORK'),
      attendanceRecord(15, 'HOLIDAY'),
      attendanceRecord(20, 'HOLIDAY_WORK'),
      attendanceRecord(25, 'LATE'),
    ]);

    const result = await calculateEmployeePayroll('emp-1', JULY_2025.month, JULY_2025.year);

    expect(result.presentDays).toBe(5);
    expect(result.lateMarks).toBe(1);
    expect(result.absentDays).toBe(0);
  });

  it('applies no deduction for late marks alone', async () => {
    mocked.attendance.findMany.mockResolvedValue([
      attendanceRecord(1, 'LATE'),
      attendanceRecord(2, 'LATE'),
      attendanceRecord(3, 'LATE'),
    ]);

    const result = await calculateEmployeePayroll('emp-1', JULY_2025.month, JULY_2025.year);

    expect(result.lateMarks).toBe(3);
    expect(result.totalDeductions).toBe(0);
    expect(result.netSalary).toBe(30000);
  });
});

describe('calculateEmployeePayroll — deductions', () => {
  it('deducts one day salary for an unpaid absence', async () => {
    mocked.attendance.findMany.mockResolvedValue([
      attendanceRecord(1, 'PRESENT'),
      attendanceRecord(2, 'ABSENT'),
    ]);

    const result = await calculateEmployeePayroll('emp-1', JULY_2025.month, JULY_2025.year);

    const perDay = 30000 / 31;
    expect(result.absentDays).toBe(1);
    expect(result.attendanceDeductions).toBe(Math.round(perDay));
    expect(result.netSalary).toBe(30000 - Math.round(perDay));
  });

  it('deducts half a day salary for a half day', async () => {
    mocked.attendance.findMany.mockResolvedValue([attendanceRecord(3, 'HALFDAY')]);

    const result = await calculateEmployeePayroll('emp-1', JULY_2025.month, JULY_2025.year);

    const halfDay = Math.round((30000 / 31) * 0.5);
    expect(result.halfDays).toBe(1);
    expect(result.attendanceDeductions).toBe(halfDay);
  });

  it('does not deduct for absences covered by approved paid leave', async () => {
    mocked.attendance.findMany.mockResolvedValue([
      attendanceRecord(10, 'ABSENT'), // covered by paid leave
      attendanceRecord(20, 'ABSENT'), // uncovered
    ]);
    mocked.leave.findMany.mockResolvedValue([
      {
        id: 'leave-1',
        leaveType: 'CASUAL',
        startDate: new Date('2025-07-10T00:00:00Z'),
        endDate: new Date('2025-07-10T00:00:00Z'),
        numberOfDays: 1,
        reason: 'Personal',
        isPaid: true,
        status: 'APPROVED',
      },
    ]);

    const result = await calculateEmployeePayroll('emp-1', JULY_2025.month, JULY_2025.year);

    expect(result.absentDays).toBe(1); // only the uncovered day
    expect(result.paidLeaveDays).toBe(1);
    const perDay = Math.round(30000 / 31);
    expect(result.attendanceDeductions).toBe(perDay); // only one day deducted
  });

  it('includes manual penalties but ignores Auto-Penalties', async () => {
    mocked.penalty.findMany.mockResolvedValue([
      { id: 'p1', amount: 500, reason: 'Misconduct', date: new Date('2025-07-05T12:00:00Z') },
      { id: 'p2', amount: 200, reason: 'Auto-Penalty (late)', date: new Date('2025-07-06T12:00:00Z') },
    ]);

    const result = await calculateEmployeePayroll('emp-1', JULY_2025.month, JULY_2025.year);

    expect(result.totalPenalties).toBe(500);
    expect(result.totalDeductions).toBe(500);
  });

  it('applies joining pro-rata deduction for mid-month joiners', async () => {
    // Joined July 16 -> 15 days before joining deducted
    mocked.employee.findUnique.mockResolvedValue({
      baseSalary: 30000,
      joiningDate: new Date('2025-07-16T00:00:00Z'),
    });

    const result = await calculateEmployeePayroll('emp-1', JULY_2025.month, JULY_2025.year);

    const perDay = 30000 / 31;
    expect(result.joiningDeduction).toBe(Math.round(15 * perDay));
  });

  it('never returns a negative net salary', async () => {
    mocked.attendance.findMany.mockResolvedValue(Array.from({ length: 31 }, (_, i) => attendanceRecord(i + 1, 'ABSENT')));
    mocked.penalty.findMany.mockResolvedValue([
      { id: 'p1', amount: 100000, reason: 'Huge penalty', date: new Date('2025-07-05T12:00:00Z') },
    ]);

    const result = await calculateEmployeePayroll('emp-1', JULY_2025.month, JULY_2025.year);

    expect(result.netSalary).toBe(0);
  });
});

describe('calculateEmployeePayroll — earnings', () => {
  it('pays overtime at 1.5x hourly rate beyond 160 standard hours', async () => {
    // 168 hours = 10080 minutes approved
    mocked.timeEntry.findMany.mockResolvedValue([
      { durationMinutes: 10080 },
    ]);

    const result = await calculateEmployeePayroll('emp-1', JULY_2025.month, JULY_2025.year);

    expect(result.productiveHours).toBe(168);
    expect(result.overtimeHours).toBe(8);
    const hourlyRate = 30000 / 160;
    expect(result.overtimePay).toBe(Math.round(8 * hourlyRate * 1.5));
    expect(result.grossEarnings).toBe(30000 + Math.round(8 * hourlyRate * 1.5));
  });

  it('adds salary addons to gross earnings', async () => {
    mocked.salaryAddon.findMany.mockResolvedValue([
      { type: 'BONUS', amount: 5000, reason: 'Performance', date: new Date('2025-07-31T12:00:00Z') },
    ]);

    const result = await calculateEmployeePayroll('emp-1', JULY_2025.month, JULY_2025.year);

    expect(result.totalAddons).toBe(5000);
    expect(result.grossEarnings).toBe(35000);
  });

  it('subtracts custom salary deductions from net salary', async () => {
    mocked.salaryDeduction.findMany.mockResolvedValue([
      { id: 'd1', type: 'ADVANCE', amount: 3000, reason: 'Salary advance', date: new Date('2025-07-31T12:00:00Z') },
    ]);

    const result = await calculateEmployeePayroll('emp-1', JULY_2025.month, JULY_2025.year);

    expect(result.totalCustomDeductions).toBe(3000);
    expect(result.netSalary).toBe(27000);
  });

  it('returns zeroed values for a missing employee', async () => {
    mocked.employee.findUnique.mockResolvedValue(null);

    const result = await calculateEmployeePayroll('ghost', JULY_2025.month, JULY_2025.year);

    expect(result.baseSalary).toBe(0);
    expect(result.netSalary).toBe(0);
    expect(result.presentDays).toBe(0);
  });
});
