import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function forcePauseMahak() {
  console.log('Force pausing Mahak Sarla for testing...');

  try {
    const mahak = await prisma.employee.findFirst({
      where: { name: { contains: 'Mahak Sarla', mode: 'insensitive' } }
    });

    if (!mahak) {
      console.log('Mahak Sarla not found.');
      return;
    }

    // 1. Create a fake idle log
    const idleLog = await prisma.idleLog.create({
      data: {
        userId: mahak.id,
        status: 'PENDING_APPROVAL',
        idleStartedAt: new Date()
      }
    });

    // 2. Pause the timer
    await prisma.timerSession.updateMany({
      where: { employeeId: mahak.id, isActive: true },
      data: {
        status: 'IDLE_PAUSED',
        resumeRequiresApproval: true
      }
    });

    // 3. Update activity status
    await prisma.userActivitySession.upsert({
      where: { userId: mahak.id },
      update: { status: 'IDLE', lastActivityAt: new Date() },
      create: { userId: mahak.id, status: 'IDLE', lastActivityAt: new Date() }
    });

    console.log('Mahak Sarla has been force paused. Check your CRM screen now.');
  } catch (error) {
    console.error('Error force pausing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

forcePauseMahak();
