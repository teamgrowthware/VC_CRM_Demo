import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const emp = await prisma.employee.findFirst({
    where: {
      name: { contains: 'Mahak' }
    }
  });

  if (!emp) {
    console.log('Employee not found');
    return;
  }
  console.log('Employee:', emp.id, emp.name);

  // find attendance for 2026-06-02
  const date = new Date('2026-06-02T00:00:00.000Z');
  // the getShiftBounds in controller uses local time, let's just find by employeeId and close date
  const attendances = await prisma.attendance.findMany({
    where: {
      employeeId: emp.id
    }
  });

  for (const att of attendances) {
    if (att.date.toISOString().includes('2026-06-02')) {
      console.log('Found attendance:', att);
      
      // Update it
      await prisma.attendance.update({
        where: { id: att.id },
        data: {
          totalHours: 8.0,
          status: 'PRESENT',
          adminNote: 'Fixed hours discrepancy'
        }
      });
      console.log('Updated attendance successfully.');
      
      // Remove auto deducted leaves or penalties
      const leaves = await prisma.leave.deleteMany({
        where: {
          employeeId: emp.id,
          leaveType: 'AUTO_DEDUCTED',
          startDate: {
            gte: new Date('2026-06-02T00:00:00.000Z'),
            lt: new Date('2026-06-03T00:00:00.000Z')
          }
        }
      });
      console.log('Deleted auto leaves:', leaves.count);

      const penalties = await prisma.penalty.deleteMany({
        where: {
          employeeId: emp.id,
          date: {
            gte: new Date('2026-06-02T00:00:00.000Z'),
            lt: new Date('2026-06-03T00:00:00.000Z')
          }
        }
      });
      console.log('Deleted auto penalties:', penalties.count);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
