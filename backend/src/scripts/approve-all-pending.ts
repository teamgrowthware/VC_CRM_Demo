import { PrismaClient } from '@prisma/client';
import { differenceInMinutes } from 'date-fns';
import { getShiftBounds } from '../lib/date-utils';

const prisma = new PrismaClient();

async function approveAllPending() {
  console.log('Starting to approve all pending idle logs...');

  try {
    const pendingLogs = await prisma.idleLog.findMany({
      where: {
        status: 'PENDING_APPROVAL'
      }
    });

    if (pendingLogs.length === 0) {
      console.log('No pending idle logs found. Everything is clear.');
      return;
    }

    console.log(`Found ${pendingLogs.length} pending requests. Approving them now...`);

    const admin = await prisma.employee.findFirst({
      where: { role: 'ADMIN' }
    });
    const adminId = admin ? admin.id : 'system';
    
    for (const idleLog of pendingLogs) {
      const now = new Date();
      const shiftDate = getShiftBounds();
      const idleDurationMinutes = differenceInMinutes(now, idleLog.idleStartedAt);

      await prisma.idleLog.update({
        where: { id: idleLog.id },
        data: {
          status: 'APPROVED',
          approvedById: adminId,
          approvedAt: now,
          idleEndedAt: now,
          idleDurationMinutes,
          adminComment: 'Auto-approved by system script'
        }
      });

      // Update Attendance totalIdleMinutes for the day
      await prisma.attendance.updateMany({
        where: {
          employeeId: idleLog.userId,
          date: shiftDate
        },
        data: {
          totalIdleMinutes: { increment: Math.floor(idleDurationMinutes) }
        }
      });

      // Update User Activity Status to ACTIVE
      await prisma.userActivitySession.update({
        where: { userId: idleLog.userId },
        data: { 
          status: 'ACTIVE',
          lastActivityAt: now
        }
      });

      // Update Timer Session to allow resume if it was paused
      if (idleLog.timerSessionId) {
        await prisma.timerSession.update({
          where: { id: idleLog.timerSessionId },
          data: {
            status: 'PAUSED', 
            resumeRequiresApproval: false,
            totalIdleMinutes: { increment: idleDurationMinutes }
          }
        });
      }
      console.log(`Approved idle log ID: ${idleLog.id} for User ID: ${idleLog.userId}`);
    }

    console.log(`Successfully approved ${pendingLogs.length} pending idle logs.`);
  } catch (error) {
    console.error('Error approving pending logs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

approveAllPending();
