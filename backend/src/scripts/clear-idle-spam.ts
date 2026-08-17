import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllIdleSpam() {
  console.log('Starting to clear all idle log spam...');

  try {
    const deleted = await prisma.idleLog.deleteMany({
      where: {
        status: 'PENDING_APPROVAL'
      }
    });

    console.log(`Successfully deleted ${deleted.count} pending idle logs.`);

    // Also reset any sessions that were stuck in approval required mode
    await prisma.timerSession.updateMany({
      where: {
        resumeRequiresApproval: true
      },
      data: {
        status: 'RUNNING',
        resumeRequiresApproval: false
      }
    });

    console.log('All stuck sessions have been reset to RUNNING.');
  } catch (error) {
    console.error('Error clearing spam:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllIdleSpam();
