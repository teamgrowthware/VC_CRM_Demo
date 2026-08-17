import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPausedSessions() {
  try {
    const now = new Date();

    const pendingLogs = await prisma.idleLog.findMany({
      where: { status: 'PENDING_APPROVAL' }
    });
    console.log(`Found ${pendingLogs.length} pending idle logs.`);

    // 1. Update all Pending Idle Logs to Approved
    const updateLogsResult = await prisma.idleLog.updateMany({
      where: { status: 'PENDING_APPROVAL' },
      data: {
        status: 'APPROVED',
        approvedAt: now,
        idleEndedAt: now,
        adminComment: 'Bulk approved to resolve stuck sessions'
      }
    });
    console.log(`Updated ${updateLogsResult.count} idle logs.`);

    // 2. Set all IDLE UserActivitySessions to ACTIVE
    const updateUserSessionsResult = await prisma.userActivitySession.updateMany({
      where: { status: 'IDLE' },
      data: { status: 'ACTIVE', lastActivityAt: now }
    });
    console.log(`Updated ${updateUserSessionsResult.count} user activity sessions to ACTIVE.`);

    // 3. Fix any IDLE_PAUSED TimerSessions so they can be resumed manually
    const updateTimerSessionsResult = await prisma.timerSession.updateMany({
      where: { 
        OR: [
          { status: 'IDLE_PAUSED' },
          { resumeRequiresApproval: true }
        ]
      },
      data: {
        status: 'PAUSED',
        resumeRequiresApproval: false
      }
    });
    console.log(`Updated ${updateTimerSessionsResult.count} timer sessions to PAUSED (resumable).`);

    console.log('Successfully fixed paused sessions.');
  } catch (error) {
    console.error('Error fixing sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPausedSessions();
