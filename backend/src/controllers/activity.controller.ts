import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { ActivityStatus, IdleApprovalStatus, TimerStatus } from '@prisma/client';
import { differenceInMinutes, differenceInSeconds } from 'date-fns';
import { getShiftBounds } from '../lib/date-utils';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

export const heartbeat = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { deviceId } = req.body;

    const session = await prisma.userActivitySession.upsert({
      where: { userId },
      update: {
        lastActivityAt: new Date(),
        status: req.user?.role === 'ADMIN' ? 'ACTIVE' : 'ACTIVE', // Force ACTIVE for everyone in this endpoint for now, or keep it as is
        deviceInfo: deviceId || undefined
      },
      create: {
        userId,
        lastActivityAt: new Date(),
        status: 'ACTIVE',
        deviceInfo: deviceId
      }
    });

    // Also update lastActivityAt on active timer if exists
    await prisma.timerSession.updateMany({
      where: { employeeId: userId, isActive: true },
      data: { lastActivityAt: new Date() }
    });

    res.json(session);
  } catch (error) {
    console.error('Heartbeat Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const idleDetected = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (req.user?.role === 'ADMIN') {
      return res.json({ message: 'Idle detection not enabled for ADMIN.' });
    }
    const settings = await prisma.systemSettings.findFirst() || { autoPauseTimerEnabled: true, requireApprovalToResume: true };

    const now = new Date();
    const today = getShiftBounds();

    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId: userId,
        date: today
      }
    });

    const isOnBreak = !!attendance && (
      (!!attendance.break1Start && !attendance.break1End) ||
      (!!attendance.break2Start && !attendance.break2End) ||
      (!!attendance.lunchStart && !attendance.lunchEnd)
    );

    if (attendance?.punchOut) {
      return res.json({ message: 'User has punched out for the day. Idle detection ignored.' });
    }

    if (isOnBreak) {
      return res.json({ message: 'User is on break. Idle detection ignored.' });
    }

    const { deviceId } = req.body;
    const activeTimer = await prisma.timerSession.findUnique({
      where: { employeeId: userId }
    });
    
    // Use a transaction with a row-level lock to prevent concurrent requests from creating duplicate logs
    const transactionResult = await prisma.$transaction(async (tx) => {
      // 1. Acquire a lock on the UserActivitySession row for this user
      // This ensures that concurrent requests for the same user are serialized
      await tx.$executeRaw`SELECT * FROM "UserActivitySession" WHERE "userId" = ${userId} FOR UPDATE`;

      // 2. Check for existing pending log
      const existingPending = await tx.idleLog.findFirst({
        where: { userId, status: 'PENDING_APPROVAL' }
      });

      if (existingPending) {
        return { isDuplicate: true, log: existingPending };
      }

      // 3. Create the new idle log if none exists
      const newLog = await tx.idleLog.create({
        data: {
          userId,
          projectId: activeTimer?.projectId,
          taskId: activeTimer?.taskId,
          timerSessionId: activeTimer?.id,
          deviceId,
          idleStartedAt: now,
          status: 'PENDING_APPROVAL'
        } as any
      });

      return { isDuplicate: false, log: newLog };
    });

    if (transactionResult.isDuplicate) {
      return res.json({ 
        message: 'Idle already logged and pending approval.', 
        requiresApproval: settings.requireApprovalToResume, 
        idleLogId: transactionResult.log.id 
      });
    }

    const idleLog = transactionResult.log;

    // Update User Activity Status
    await prisma.userActivitySession.update({
      where: { userId },
      data: { status: 'IDLE' }
    });

    if (activeTimer && activeTimer.isActive && settings.autoPauseTimerEnabled) {
      // Update Timer Session to IDLE_PAUSED
      await prisma.timerSession.update({
        where: { employeeId: userId },
        data: {
          status: 'IDLE_PAUSED',
          autoPausedAt: now,
          resumeRequiresApproval: settings.requireApprovalToResume,
          lastPausedAt: now,
          pauseIntervals: {
            create: { pausedAt: now }
          }
        }
      });

      return res.json({ message: 'Idle detected and timer paused.', requiresApproval: settings.requireApprovalToResume, idleLogId: idleLog.id });
    }

    res.json({ message: 'Global idle detected.', requiresApproval: settings.requireApprovalToResume, idleLogId: idleLog.id });
  } catch (error) {
    console.error('Idle Detected Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const submitResumeRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const { reason } = req.body;

    const idleLog = await prisma.idleLog.findFirst({
      where: { userId, status: 'PENDING_APPROVAL' },
      orderBy: { createdAt: 'desc' }
    });

    if (!idleLog) return res.status(404).json({ message: 'No pending resume request found.' });

    const updatedLog = await prisma.idleLog.update({
      where: { id: idleLog.id },
      data: { reason }
    });

    res.json(updatedLog);
  } catch (error) {
    console.error('Resume Request Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const autoResumeIdle = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const idleLog = await prisma.idleLog.findFirst({
      where: { userId, status: 'PENDING_APPROVAL' },
      orderBy: { createdAt: 'desc' }
    });

    if (!idleLog) return res.status(200).json({ message: 'No pending idle log found.' });

    // Update User Activity Status to ACTIVE (so they appear online)
    // BUT leave the timer PAUSED and IdleLog PENDING_APPROVAL
    const now = new Date();
    await prisma.userActivitySession.update({
      where: { userId: idleLog.userId },
      data: { 
        status: 'ACTIVE',
        lastActivityAt: now
      }
    });

    res.json({ message: 'Activity detected, but admin approval is required to resume timer.' });
  } catch (error) {
    console.error('Auto Resume Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMyStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const session = await prisma.userActivitySession.findUnique({
      where: { userId }
    });

    const timer = await prisma.timerSession.findUnique({
      where: { employeeId: userId }
    });

    const today = getShiftBounds();
    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId: userId,
        date: today
      }
    });

    const isOnBreak = !!attendance && (
      (!!attendance.break1Start && !attendance.break1End) ||
      (!!attendance.break2Start && !attendance.break2End) ||
      (!!attendance.lunchStart && !attendance.lunchEnd)
    );

    const pendingLog = await prisma.idleLog.findFirst({
      where: { userId, status: 'PENDING_APPROVAL' },
      orderBy: { createdAt: 'desc' }
    });
    const hasProvidedReason = pendingLog ? !!pendingLog.reason : false;

    // Auto-heal: If session is IDLE but there is no pending log, reset to ACTIVE
    if (session?.status === 'IDLE' && !pendingLog && req.user?.role !== 'ADMIN') {
      await prisma.userActivitySession.update({
        where: { userId },
        data: { status: 'ACTIVE' }
      });
      if (session) session.status = 'ACTIVE';
      
      if (timer?.status === 'IDLE_PAUSED') {
        await prisma.timerSession.update({
          where: { employeeId: userId },
          data: { status: 'PAUSED', resumeRequiresApproval: false }
        });
        if (timer) {
          timer.status = 'PAUSED';
          timer.resumeRequiresApproval = false;
        }
      }
    }

    // For ADMIN, always report as ACTIVE even if DB says otherwise (to recover from bad state)
    if (req.user?.role === 'ADMIN') {
      return res.json({ 
        session: session ? { ...session, status: 'ACTIVE' } : null, 
        timer: timer ? { ...timer, status: 'RUNNING' } : null, 
        isOnBreak,
        hasProvidedReason
      });
    }

    res.json({ session, timer, isOnBreak, hasProvidedReason });
  } catch (error) {
    console.error('Get My Status Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin Endpoints
export const getIdleRequests = async (req: AuthRequest, res: Response) => {
  try {
    const requests = await prisma.idleLog.findMany({
      where: { status: 'PENDING_APPROVAL' },
      include: {
        user: { select: { name: true, employeeId: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (error) {
    console.error('Get Idle Requests Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const approveIdleRequest = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) return res.status(401).json({ message: 'Unauthorized' });
    const { id } = req.params;
    const { adminComment } = req.body;
    const idleLog = await prisma.idleLog.findUnique({
      where: { id: id as string }
    });

    if (!idleLog) return res.status(404).json({ message: 'Idle log not found.' });

    const now = new Date();
    // Use a separate Date object for start of day to avoid modifying 'now'
    const shiftDate = getShiftBounds();
    const idleDurationMinutes = differenceInMinutes(now, idleLog.idleStartedAt);

    await prisma.idleLog.update({
      where: { id: id as string },
      data: {
        status: 'APPROVED',
        approvedById: adminId,
        approvedAt: now,
        idleEndedAt: now,
        idleDurationMinutes,
        adminComment
      }
    });

    // Update Attendance totalIdleMinutes for the day (using shift date)
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

    res.json({ message: 'Request approved. Session resumed.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const rejectIdleRequest = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) return res.status(401).json({ message: 'Unauthorized' });
    const { id } = req.params;
    const { adminComment } = req.body;

    const idleLog = await prisma.idleLog.findUnique({
      where: { id: id as string }
    });

    if (!idleLog) return res.status(404).json({ message: 'Idle log not found.' });

    const now = new Date();

    await prisma.idleLog.update({
      where: { id: id as string },
      data: {
        status: 'REJECTED',
        rejectedById: adminId,
        rejectedAt: now,
        adminComment
      }
    });

    // Update User Activity Status to ACTIVE so they can see the rejection
    await prisma.userActivitySession.update({
      where: { userId: idleLog.userId },
      data: { 
        status: 'ACTIVE',
        lastActivityAt: now
      }
    });

    // Keep timer paused but mark it as rejected
    if (idleLog.timerSessionId) {
      await prisma.timerSession.updateMany({
        where: { id: idleLog.timerSessionId },
        data: {
          status: 'STOPPED', 
          isActive: false
        }
      });
    } else {
      await prisma.timerSession.updateMany({
        where: { employeeId: idleLog.userId },
        data: {
          status: 'STOPPED', 
          isActive: false
        }
      });
    }

    res.json({ message: 'Request rejected. Timer stopped.' });
  } catch (error) {
    console.error('Reject Idle Request Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getRecentActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const logs = await prisma.activityLog.findMany({
      include: {
        user: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(logs);
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ message: 'Failed to fetch activity logs' });
  }
};

export const getUserActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const targetId = userId === 'me' ? (req.user?.id as string) : (userId as string);

    const logs = await prisma.activityLog.findMany({
      where: { userId: targetId },
      include: {
        user: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(logs);
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ message: 'Failed to fetch activity logs' });
  }
};

export const reportSystemEvent = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { deviceId, eventType, timestamp } = req.body;

    // Ensure device is registered
    const device = await prisma.deviceRegistration.upsert({
      where: { deviceId },
      update: { lastSeenAt: new Date(), userId },
      create: { deviceId, userId, deviceName: 'Desktop Agent' }
    });

    const event = await prisma.systemEventLog.create({
      data: {
        deviceId,
        eventType,
        timestamp: timestamp ? new Date(timestamp) : new Date()
      }
    });

    res.json(event);
  } catch (error) {
    console.error('System Event Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllDevices = async (req: AuthRequest, res: Response) => {
  try {
    const devices = await prisma.deviceRegistration.findMany({
      include: {
        user: { select: { name: true, employeeId: true } }
      },
      orderBy: { lastSeenAt: 'desc' }
    });
    res.json(devices);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const revokeDevice = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.deviceRegistration.update({
      where: { id: id as string },
      data: { isRevoked: true }
    });
    res.json({ message: 'Device revoked successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
