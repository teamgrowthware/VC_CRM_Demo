import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function globalReset() {
  console.log('Performing Global Reset of all idle/paused states...');

  try {
    // 1. Reset Timer Sessions
    const timers = await prisma.timerSession.updateMany({
      where: { 
        OR: [
          { status: 'IDLE_PAUSED' },
          { resumeRequiresApproval: true }
        ]
      },
      data: {
        status: 'RUNNING',
        resumeRequiresApproval: false,
        isActive: true
      }
    });
    console.log(`Resumed ${timers.count} timers.`);

    // 2. Reset Activity Sessions
    const activities = await prisma.userActivitySession.updateMany({
      where: { status: 'IDLE' },
      data: {
        status: 'ACTIVE',
        lastActivityAt: new Date()
      }
    });
    console.log(`Activated ${activities.count} user activity sessions.`);

    // 3. Delete all pending Idle Logs
    const logs = await prisma.idleLog.deleteMany({
      where: { status: 'PENDING_APPROVAL' }
    });
    console.log(`Deleted ${logs.count} pending approval logs.`);

    // 4. Set final production settings
    await prisma.systemSettings.update({
      where: { id: 'default' },
      data: {
        idleTimeoutMinutes: 10,
        heartbeatIntervalSeconds: 30,
        idleWarningSeconds: 0
      }
    });
    console.log('Set Idle Timeout to 10 minutes.');

  } catch (error) {
    console.error('Error during global reset:', error);
  } finally {
    await prisma.$disconnect();
  }
}

globalReset();
