import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resumeAllPausedSessions() {
  console.log('Starting to resume all paused sessions...');

  try {
    // 1. Get all pending idle logs
    const pendingLogs = await prisma.idleLog.findMany({
      where: {
        status: 'PENDING_APPROVAL'
      }
    });

    console.log(`Found ${pendingLogs.length} pending idle logs.`);

    for (const log of pendingLogs) {
      // Approve the log
      await prisma.idleLog.update({
        where: { id: log.id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          adminComment: 'Auto-resumed by system administrator'
        }
      });

      // Update the timer session if it exists
      await prisma.timerSession.updateMany({
        where: { 
          employeeId: log.userId,
          isActive: true
        },
        data: {
          status: 'RUNNING',
          resumeRequiresApproval: false,
          lastActivityAt: new Date()
        }
      });
      
      console.log(`Resumed session for user: ${log.userId}`);
    }

    console.log('All paused sessions have been resumed successfully.');
  } catch (error) {
    console.error('Error resuming sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resumeAllPausedSessions();
