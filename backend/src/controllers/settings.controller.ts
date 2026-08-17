import { Request, Response } from 'express';
import prisma from '../lib/prisma';

interface AuthRequest extends Request {
  user?: any;
}

const ALL_NOTIFICATION_TYPES = [
  'TASK_ASSIGNED',
  'COMMENT_ADDED',
  'PROJECT_UPDATED',
  'DOCUMENT_UPLOADED',
  'TASK_DUE_SOON',
  'TASK_OVERDUE',
  'LATE_ARRIVAL',
  'ATTENDANCE_PUNCH_OUT',
  'SOD_REMINDER',
  'EOD_REMINDER',
  'PAYMENT_DUE_SOON',
  'PAYMENT_DUE_TODAY',
  'PAYMENT_OVERDUE',
  'TIMER_FORGOTTEN',
  'MISSING_TIMESHEET',
  'ENTRY_REJECTED',
  'LOW_TRACKED_HOURS',
  'PENDING_APPROVAL',
];

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

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const settings = await prisma.systemSettings.upsert({
      where: { id: 'default' },
      update: data,
      create: { ...data, id: 'default' }
    });
    res.json(settings);
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
