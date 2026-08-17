import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function forceResumeAll() {
  console.log('Force resuming all sessions in the system...');

  try {
    // Reset ALL sessions that are not STOPPED
    const result = await prisma.timerSession.updateMany({
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

    console.log(`Successfully force-resumed ${result.count} sessions.`);
    
    // Also clear any lingering pending idle logs just in case
    const logs = await prisma.idleLog.deleteMany({
      where: { status: 'PENDING_APPROVAL' }
    });
    console.log(`Cleared ${logs.count} lingering idle logs.`);

  } catch (error) {
    console.error('Error force-resuming:', error);
  } finally {
    await prisma.$disconnect();
  }
}

forceResumeAll();
