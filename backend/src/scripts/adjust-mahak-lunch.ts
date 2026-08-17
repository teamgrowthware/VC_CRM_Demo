import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function adjustMahakLunch() {
  console.log('Adjusting Mahak Sarla\'s lunch break for today...');

  try {
    const mahak = await prisma.employee.findFirst({
      where: { name: { contains: 'Mahak Sarla', mode: 'insensitive' } }
    });

    if (!mahak) {
      console.log('Mahak Sarla not found.');
      return;
    }

    // Get the latest attendance record (today's)
    const attendance = await prisma.attendance.findFirst({
      where: { employeeId: mahak.id },
      orderBy: { date: 'desc' }
    });

    if (!attendance || !attendance.lunchStart) {
      console.log('No attendance or lunch start found.');
      return;
    }

    const lunchEnd = new Date(attendance.lunchStart);
    lunchEnd.setMinutes(lunchEnd.getMinutes() + 30);

    await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        lunchEnd: lunchEnd
      }
    });

    console.log(`Successfully updated lunch break to 30 mins: ${attendance.lunchStart.toLocaleTimeString()} - ${lunchEnd.toLocaleTimeString()}`);
  } catch (error) {
    console.error('Error adjusting lunch:', error);
  } finally {
    await prisma.$disconnect();
  }
}

adjustMahakLunch();
