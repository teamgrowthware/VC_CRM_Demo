import { Request, Response } from 'express';
import prisma from '../lib/prisma';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

export const submitFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { isIdleAccurate, hadFalsePause, hasPerformanceIssue, rating, comment, appVersion } = req.body;

    const feedback = await prisma.pilotFeedback.create({
      data: {
        userId,
        isIdleAccurate,
        hadFalsePause,
        hasPerformanceIssue,
        rating,
        comment,
        appVersion
      }
    });

    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const reportHealth = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { deviceId, cpuUsage, ramUsage, syncStatus, heartbeatStatus } = req.body;

    const health = await prisma.appHealthLog.create({
      data: {
        userId,
        deviceId,
        cpuUsage,
        ramUsage,
        syncStatus,
        heartbeatStatus
      }
    });

    res.json(health);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const reportCrash = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { deviceId, errorMessage, errorStack, appVersion, os } = req.body;

    const crash = await prisma.crashLog.create({
      data: {
        userId,
        deviceId,
        errorMessage,
        errorStack,
        appVersion,
        os
      }
    });

    res.json(crash);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPilotStats = async (req: AuthRequest, res: Response) => {
  try {
    const feedbackCount = await prisma.pilotFeedback.count();
    const feedbacks = await prisma.pilotFeedback.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const crashes = await prisma.crashLog.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { timestamp: 'desc' },
      take: 20
    });

    const activePilotUsers = await prisma.appHealthLog.groupBy({
      by: ['userId'],
      _count: true
    });

    res.json({
      activePilotUsers: activePilotUsers.length,
      feedbackCount,
      recentFeedback: feedbacks,
      recentCrashes: crashes
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
