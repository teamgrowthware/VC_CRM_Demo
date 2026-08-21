import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { NotificationType } from '@prisma/client';

interface AuthRequest extends Request {
  user?: any;
}

const ALL_NOTIFICATION_TYPES = Object.values(NotificationType);

export const getSettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.systemSettings.findUnique({
      where: { id: 'default' }
    });

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { id: 'default' }
      });
    }

    const { financePin: _financePin, ...safeSettings } = settings;
    res.json(safeSettings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
};

export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    const allowedFields = [
      'officeStartTime', 'lateThreshold', 'lateComingEnabled', 'halfDayEnabled',
      'lunchDuration', 'breakDuration', 'sodReminderTime', 'eodReminderTime',
      'idleTimeoutMinutes', 'idleWarningSeconds', 'autoPauseTimerEnabled',
      'requireApprovalToResume', 'desktopAppEnabledRoles', 'heartbeatIntervalSeconds',
      'autoStartEnabled', 'ruleBookText',
    ];
    const data: Record<string, any> = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        if (key === 'financePin' &&
          (typeof req.body[key] !== 'string' || !/^\d{4}$/.test(req.body[key]))) {
          res.status(400).json({ message: 'Finance PIN must be exactly 4 digits' });
          return;
        }
        data[key] = key === 'financePin'
          ? await bcrypt.hash(req.body[key], 12)
          : req.body[key];
      }
    }
    const settings = await prisma.systemSettings.upsert({
      where: { id: 'default' },
      update: data,
      create: { ...data, id: 'default' }
    });

    try {
      await prisma.activityLog.create({
        data: {
          type: 'SETTINGS_UPDATED',
          message: `${req.user?.name || 'Admin'} updated system settings`,
          entityType: 'SETTINGS',
          entityId: 'default',
          userId: req.user?.id,
        }
      });
    } catch (auditErr) {
      console.error('[AUDIT] settings update audit write failed:', auditErr);
    }

    const { financePin: _financePin, ...safeSettings } = settings;
    res.json(safeSettings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update settings' });
  }
};

export const getNotificationSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    let setting = await prisma.notificationSetting.findUnique({ where: { userId } });

    if (!setting) {
      setting = await prisma.notificationSetting.create({
        data: { userId, enabledTypes: ALL_NOTIFICATION_TYPES },
      });
    }

    res.status(200).json(setting);
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
};

export const updateNotificationSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { enabledTypes } = req.body;

    if (!Array.isArray(enabledTypes)) {
      res.status(400).json({ error: 'enabledTypes must be an array' });
      return;
    }

    if (!enabledTypes.every((type) =>
      type === 'ALL' || (typeof type === 'string' && ALL_NOTIFICATION_TYPES.includes(type as NotificationType))
    )) {
      res.status(400).json({ error: 'enabledTypes contains an unsupported notification type' });
      return;
    }

    const setting = await prisma.notificationSetting.upsert({
      where: { userId },
      update: { enabledTypes },
      create: { userId, enabledTypes },
    });

    res.status(200).json(setting);
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
};
