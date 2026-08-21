import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import webpush from 'web-push';
import { z } from 'zod';
import { NotificationType } from '@prisma/client';

interface AuthRequest extends Request {
  user?: any;
}

// Zod schemas for validation
const SubscribeSchema = z.object({
  endpoint: z.string(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  })
});

const SettingsSchema = z.object({
  enabledTypes: z.array(z.enum(['ALL', ...Object.values(NotificationType)] as [string, ...string[]]))
});

export const subscribe = async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint, keys } = SubscribeSchema.parse(req.body);
    const userId = req.user!.id;

    // Save or update subscription
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId,
      }
    });

    res.status(201).json({ message: 'Subscription saved successfully.' });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(400).json({ error: 'Invalid data or server error' });
  }
};

export const unsubscribe = async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint } = z.object({ endpoint: z.string() }).parse(req.body);

    await prisma.pushSubscription.delete({
      where: { endpoint }
    });

    res.json({ message: 'Unsubscribed successfully.' });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    res.status(400).json({ error: 'Failed to unsubscribe' });
  }
};

export const getSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    let settings = await prisma.notificationSetting.findUnique({
      where: { userId }
    });
    
    if (!settings) {
      // Default to all notifications being enabled for new users
      settings = await prisma.notificationSetting.create({
        data: {
          userId,
          enabledTypes: ['ALL'] // 'ALL' or specific types
        }
      });
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
};

export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { enabledTypes } = SettingsSchema.parse(req.body);
    
    const settings = await prisma.notificationSetting.upsert({
      where: { userId },
      update: { enabledTypes },
      create: { userId, enabledTypes }
    });
    
    res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(400).json({ error: 'Failed to update settings' });
  }
};
