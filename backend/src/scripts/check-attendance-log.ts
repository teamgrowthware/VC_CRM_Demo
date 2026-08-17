import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const employee = await prisma.employee.findFirst({
    where: { name: { contains: 'Mahak' } }
  });
  if (!employee) {
    console.log('Employee not found');
    return;
  }
  const startOfDay = new Date('2026-05-15T00:00:00.000Z');
  const endOfDay = new Date('2026-05-15T23:59:59.999Z');
  const attendance = await prisma.attendance.findFirst({
    where: { employeeId: employee.id, date: { gte: startOfDay, lte: endOfDay } }
  });
  console.log('Attendance Record:', attendance);
  if (attendance) {
    const logs = await prisma.activityLog.findMany({
      where: { type: 'ATTENDANCE_STATUS_UPDATE', entityId: attendance.id },
      include: { user: { select: { name: true } } }
    });
    console.log('Activity Logs:', logs);
    await checkDetails(employee.id, startOfDay);
    await checkHalfDayAbsences(['Mahak', 'Anushka'], startOfDay);
    await compareSalary(employee.id, startOfDay);
  }
}
async function checkDetails(employeeId: string, date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const attendance = await prisma.attendance.findFirst({
    where: { employeeId, date: { gte: startOfDay, lte: endOfDay } },
  });
  if (!attendance) {
    console.log('No attendance record found for the given date');
    return;
  }
  console.log('Attendance status:', attendance.status);

  // Payroll check for the month of the attendance
  const month = attendance.date.getMonth() + 1;
  const year = attendance.date.getFullYear();
  const payroll = await prisma.payroll.findFirst({
    where: { employeeId, month, year },
  });
  if (payroll) {
    console.log(`Payroll base salary for ${month}/${year}:`, payroll.baseSalary);
  } else {
    console.log('No payroll record found for this period');
  }

  // Admin note details
  if (attendance.adminNote) {
    console.log('Admin note on attendance:', attendance.adminNote);
  } else {
    console.log('No admin note attached to this attendance');
  }

  // Activity logs related to admin notes (assuming type 'ADMIN_NOTE')
  const noteLogs = await prisma.activityLog.findMany({
    where: { entityId: attendance.id, type: 'ADMIN_NOTE' },
    include: { user: { select: { name: true } } },
  });
  if (noteLogs.length > 0) {
    console.log('Admin note change logs:');
    noteLogs.forEach((log) => {
      console.log(`${log.createdAt.toISOString()} by ${log.user?.name}: ${log.message}`);
    });
  } else {
    console.log('No admin note change logs found');
  }
}


main().finally(() => prisma.$disconnect());

// Helper to check half-day absences for given employee names on a specific date
async function checkHalfDayAbsences(names: string[], date: Date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);

  const employees = await prisma.employee.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true },
  });
  for (const emp of employees) {
    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId: emp.id,
        date: { gte: start, lte: end },
        status: 'HALFDAY',
      },
    });
    if (attendance) {
      console.log(`${emp.name} has a half-day absence on ${date.toISOString().slice(0, 10)}`);
    } else {
      console.log(`${emp.name} has no half-day record on ${date.toISOString().slice(0, 10)}`);
    }
  }
}

// Helper to compare base salary between Employee and Payroll for the month of the date
async function compareSalary(employeeId: string, date: Date) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { baseSalary: true },
  });
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const payroll = await prisma.payroll.findFirst({
    where: { employeeId, month, year },
    select: { baseSalary: true },
  });
  if (employee?.baseSalary && payroll?.baseSalary) {
    if (employee.baseSalary === payroll.baseSalary) {
      console.log('Base salary matches between Employee and Payroll for', month, year);
    } else {
      console.log('Base salary mismatch: Employee', employee.baseSalary, 'Payroll', payroll.baseSalary);
    }
  } else {
    console.log('Salary information missing for comparison');
  }
}

