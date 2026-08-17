import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMahakAttendance() {
  try {
    const mahak = await prisma.employee.findFirst({
      where: { name: { contains: 'Mahak', mode: 'insensitive' } }
    });

    if (!mahak) {
      console.log('Mahak Sarla not found.');
      return;
    }

    console.log('Employee Details:', {
      id: mahak.id,
      name: mahak.name,
      email: mahak.email,
      baseSalary: mahak.baseSalary,
      role: mahak.role
    });

    const startDate = new Date(2026, 4, 1); // May 1, 2026
    const endDate = new Date(2026, 4, 31, 23, 59, 59);

    const attendance = await prisma.attendance.findMany({
      where: {
        employeeId: mahak.id,
        date: { gte: startDate, lte: endDate }
      },
      orderBy: { date: 'asc' }
    });

    console.log('\n--- ATTENDANCE RECORDS (May 2026) ---');
    attendance.forEach(att => {
      console.log(`${att.date.toISOString().split('T')[0]}: status=${att.status}, punchIn=${att.punchIn ? att.punchIn.toISOString() : null}, punchOut=${att.punchOut ? att.punchOut.toISOString() : null}, totalHours=${att.totalHours}`);
    });

    const penalties = await prisma.penalty.findMany({
      where: {
        employeeId: mahak.id,
        date: { gte: startDate, lte: endDate }
      },
      orderBy: { date: 'asc' }
    });

    console.log('\n--- PENALTIES (May 2026) ---');
    penalties.forEach(p => {
      console.log(`${p.date.toISOString().split('T')[0]}: amount=${p.amount}, reason="${p.reason}"`);
    });

    const leaves = await prisma.leave.findMany({
      where: {
        employeeId: mahak.id,
        startDate: { gte: startDate },
        endDate: { lte: endDate }
      },
      orderBy: { startDate: 'asc' }
    });

    console.log('\n--- LEAVES (May 2026) ---');
    leaves.forEach(l => {
      console.log(`${l.startDate.toISOString().split('T')[0]} to ${l.endDate.toISOString().split('T')[0]}: type=${l.leaveType}, days=${l.numberOfDays}, status=${l.status}, reason="${l.reason}"`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMahakAttendance();

