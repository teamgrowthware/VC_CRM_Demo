import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function extremeResume() {
  console.log('Force resuming EVERYTHING...');

  try {
    // 1. Resume ANY timer that is not STOPPED
    const timers = await prisma.timerSession.updateMany({
      where: {
        NOT: { status: 'STOPPED' }
      },
      data: {
        status: 'RUNNING',
        resumeRequiresApproval: false,
        isActive: true,
        lastActivityAt: new Date()
      }
    });
    console.log(`Resumed ${timers.count} timers to RUNNING.`);

    // 2. Activate ALL user activity sessions
    const activities = await prisma.userActivitySession.updateMany({
      data: {
        status: 'ACTIVE',
        lastActivityAt: new Date()
      }
    });
    console.log(`Set ${activities.count} activity sessions to ACTIVE.`);

    // 3. Approve ALL pending idle logs
    const logs = await prisma.idleLog.updateMany({
      where: { status: 'PENDING_APPROVAL' },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        adminComment: 'Auto-resumed by global reset'
      }
    });
    console.log(`Approved ${logs.count} pending idle logs.`);

  } catch (error) {
    console.error('Error during extreme resume:', error);
  } finally {
    await prisma.$disconnect();
  }
}

extremeResume();
