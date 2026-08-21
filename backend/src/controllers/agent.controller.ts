import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { ActivityStatus, SystemEventType } from '@prisma/client';
import { z } from 'zod';

const MAX_SYNC_BATCH_SIZE = 500;
const activityStatusSchema = z.enum(Object.values(ActivityStatus) as [ActivityStatus, ...ActivityStatus[]]);
const eventTypeSchema = z.enum(Object.values(SystemEventType) as [SystemEventType, ...SystemEventType[]]);
const timestampSchema = z.coerce.date();
const heartbeatSchema = z.object({
  status: activityStatusSchema,
  timerSessionId: z.string().optional(),
  timestamp: timestampSchema,
});
const eventSchema = z.object({
  type: eventTypeSchema,
  timestamp: timestampSchema,
});

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

export const registerDevice = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { deviceId, deviceName, os, appVersion } = req.body;

    if (typeof deviceId !== 'string' || !deviceId || deviceId.length > 255) {
      return res.status(400).json({ message: 'A valid device ID is required' });
    }

    const existingDevice = await prisma.deviceRegistration.findUnique({ where: { deviceId } });
    if (existingDevice && existingDevice.userId !== userId) {
      return res.status(403).json({ message: 'Device is registered to another user' });
    }
    const device = existingDevice
      ? await prisma.deviceRegistration.update({
          where: { deviceId },
          data: { deviceName, os, appVersion, isRevoked: false, lastSeenAt: new Date() }
        })
      : await prisma.deviceRegistration.create({
          data: { userId, deviceId, deviceName, os, appVersion, lastSeenAt: new Date() }
        });

    res.json(device);
  } catch (error) {
    console.error('Register Device Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const heartbeat = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { deviceId, status, timerSessionId } = req.body;

    if (typeof deviceId !== 'string' || !deviceId || deviceId.length > 255) {
      return res.status(400).json({ message: 'A valid device ID is required' });
    }
    const parsedStatus = activityStatusSchema.safeParse(status);
    if (!parsedStatus.success) return res.status(400).json({ message: 'Invalid activity status' });

    // Validate device belongs to user and is not revoked
    const device = await prisma.deviceRegistration.findUnique({
      where: { deviceId }
    });

    if (!device || device.userId !== userId || device.isRevoked) {
      return res.status(403).json({ message: 'Device not registered or revoked' });
    }

    // Create heartbeat record
    await prisma.agentHeartbeat.create({
      data: {
        deviceId,
        status: parsedStatus.data,
        timerSessionId,
        timestamp: new Date()
      }
    });

    // Update device last seen
    await prisma.deviceRegistration.update({
      where: { deviceId },
      data: { lastSeenAt: new Date() }
    });

    // Update global activity session
    const finalStatus = req.user?.role === 'ADMIN' ? 'ACTIVE' : (status === 'IDLE' ? 'IDLE' : 'ACTIVE');
    
    await prisma.userActivitySession.upsert({
      where: { userId },
      update: {
        lastActivityAt: new Date(),
        status: finalStatus
      },
      create: {
        userId,
        lastActivityAt: new Date(),
        status: finalStatus
      }
    });

    res.json({ status: 'OK' });
  } catch (error) {
    console.error('Agent Heartbeat Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const syncLogs = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { deviceId, heartbeats, events } = req.body;

    if (typeof deviceId !== 'string' || !deviceId || deviceId.length > 255) {
      return res.status(400).json({ message: 'A valid device ID is required' });
    }
    if ((heartbeats !== undefined && !Array.isArray(heartbeats)) ||
      (events !== undefined && !Array.isArray(events)) ||
      (heartbeats?.length || 0) > MAX_SYNC_BATCH_SIZE ||
      (events?.length || 0) > MAX_SYNC_BATCH_SIZE) {
      return res.status(400).json({ message: `Each sync batch must contain at most ${MAX_SYNC_BATCH_SIZE} records` });
    }

    const device = await prisma.deviceRegistration.findUnique({
      where: { deviceId }
    });

    if (!device || device.userId !== userId || device.isRevoked) {
      return res.status(403).json({ message: 'Device not registered or revoked' });
    }

    // Process batch heartbeats
    if (heartbeats && Array.isArray(heartbeats)) {
      const parsedHeartbeats = z.array(heartbeatSchema).safeParse(heartbeats);
      if (!parsedHeartbeats.success) return res.status(400).json({ message: 'Invalid heartbeat data' });
      const heartbeatData = parsedHeartbeats.data.map((hb) => ({
        deviceId,
        status: hb.status,
        timerSessionId: hb.timerSessionId,
        timestamp: hb.timestamp
      }));

      await prisma.agentHeartbeat.createMany({
        data: heartbeatData
      });
    }

    // Process batch events
    if (events && Array.isArray(events)) {
      const parsedEvents = z.array(eventSchema).safeParse(events);
      if (!parsedEvents.success) return res.status(400).json({ message: 'Invalid system event data' });
      const eventData = parsedEvents.data.map((ev) => ({
        deviceId,
        eventType: ev.type,
        timestamp: ev.timestamp
      }));

      await prisma.systemEventLog.createMany({
        data: eventData
      });
    }

    res.json({ success: true, processed: { heartbeats: heartbeats?.length || 0, events: events?.length || 0 } });
  } catch (error) {
    console.error('Sync Logs Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAgentSettings = async (req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'default' }
    });
    if (!settings) return res.json(null);
    const { financePin: _financePin, ...safeSettings } = settings;
    res.json(safeSettings);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
