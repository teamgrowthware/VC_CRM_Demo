import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { logAudit } from '../lib/audit';

interface AuthRequest extends Request {
  user?: any;
}

const createAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  message: z.string().min(1, 'Message is required').max(2000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('LOW'),
  isActive: z.boolean().default(true),
  expiresAt: z.string().datetime().optional().nullable(),
});

const updateAnnouncementSchema = createAnnouncementSchema.partial();

export const getActiveAnnouncements = async (req: Request, res: Response): Promise<void> => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, announcements });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getAllAnnouncements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: announcements });
  } catch (error) {
    console.error('Error fetching all announcements:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch announcements' });
  }
};

export const getAnnouncementById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const announcement = await prisma.announcement.findUnique({ where: { id } });

    if (!announcement) {
      res.status(404).json({ success: false, message: 'Announcement not found' });
      return;
    }

    res.status(200).json({ success: true, data: announcement });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch announcement' });
  }
};

export const createAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = createAnnouncementSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.issues });
      return;
    }

    const { title, message, priority, isActive, expiresAt } = parsed.data;

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        priority,
        isActive,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      }
    });

    if (req.user?.id) {
      await logAudit({
        userId: req.user.id,
        action: 'ANNOUNCEMENT_CREATED',
        message: `Created announcement: ${title}`,
        entityType: 'ANNOUNCEMENT',
        entityId: announcement.id,
      });
    }

    res.status(201).json({ success: true, message: 'Announcement created', data: announcement });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ success: false, message: 'Failed to create announcement' });
  }
};

export const updateAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.announcement.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Announcement not found' });
      return;
    }

    const parsed = updateAnnouncementSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.issues });
      return;
    }

    const data = parsed.data;
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.message !== undefined) updateData.message = data.message;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

    const announcement = await prisma.announcement.update({
      where: { id },
      data: updateData,
    });

    if (req.user?.id) {
      await logAudit({
        userId: req.user.id,
        action: 'ANNOUNCEMENT_UPDATED',
        message: `Updated announcement: ${announcement.title}`,
        entityType: 'ANNOUNCEMENT',
        entityId: announcement.id,
      });
    }

    res.status(200).json({ success: true, message: 'Announcement updated', data: announcement });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ success: false, message: 'Failed to update announcement' });
  }
};

export const deleteAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.announcement.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Announcement not found' });
      return;
    }

    await prisma.announcement.delete({ where: { id } });

    if (req.user?.id) {
      await logAudit({
        userId: req.user.id,
        action: 'ANNOUNCEMENT_DELETED',
        message: `Deleted announcement: ${existing.title}`,
        entityType: 'ANNOUNCEMENT',
        entityId: existing.id,
      });
    }

    res.status(200).json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ success: false, message: 'Failed to delete announcement' });
  }
};

export const toggleAnnouncementActive = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.announcement.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Announcement not found' });
      return;
    }

    const announcement = await prisma.announcement.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    if (req.user?.id) {
      await logAudit({
        userId: req.user.id,
        action: 'ANNOUNCEMENT_TOGGLED',
        message: `Toggled announcement "${announcement.title}" to ${announcement.isActive ? 'active' : 'inactive'}`,
        entityType: 'ANNOUNCEMENT',
        entityId: announcement.id,
      });
    }

    res.status(200).json({ success: true, message: `Announcement ${announcement.isActive ? 'activated' : 'deactivated'}`, data: announcement });
  } catch (error) {
    console.error('Error toggling announcement:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle announcement' });
  }
};
