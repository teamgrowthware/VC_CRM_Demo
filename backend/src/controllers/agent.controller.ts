import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { ActivityStatus, SystemEventType } from '@prisma/client';

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

    if (!deviceId) return res.status(400).json({ message: 'Device ID is required' });

    const device = await prisma.deviceRegistration.upsert({
      where: { deviceId },
      update: {
        userId,
        deviceName,
        os,
        appVersion,
        isRevoked: false,
        lastSeenAt: new Date()
      },
      create: {
        userId,
        deviceId,
        deviceName,
        os,
        appVersion,
        lastSeenAt: new Date()
      }
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

    if (!deviceId) return res.status(400).json({ message: 'Device ID is required' });

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
        status: status as ActivityStatus,
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

    if (!deviceId) return res.status(400).json({ message: 'Device ID is required' });

    const device = await prisma.deviceRegistration.findUnique({
      where: { deviceId }
    });

    if (!device || device.userId !== userId || device.isRevoked) {
      return res.status(403).json({ message: 'Device not registered or revoked' });
    }

    // Process batch heartbeats
    if (heartbeats && Array.isArray(heartbeats)) {
      const heartbeatData = heartbeats.map((hb: any) => ({
        deviceId,
        status: hb.status as ActivityStatus,
        timerSessionId: hb.timerSessionId,
        timestamp: new Date(hb.timestamp)
      }));

      await prisma.agentHeartbeat.createMany({
        data: heartbeatData
      });
    }

    // Process batch events
    if (events && Array.isArray(events)) {
      const eventData = events.map((ev: any) => ({
        deviceId,
        eventType: ev.type as SystemEventType,
        timestamp: new Date(ev.timestamp)
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
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
