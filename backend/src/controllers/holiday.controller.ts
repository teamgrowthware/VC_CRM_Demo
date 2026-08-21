import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { logActivity } from '../services/activity.service';

interface AuthRequest extends Request {
  user?: any;
}

export const addHoliday = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, date, endDate, type } = req.body;

    if (!name || !date) {
      res.status(400).json({ success: false, message: 'Name and date are required' });
      return;
    }

    const parsedStart = new Date(date);
    const parsedEnd = endDate ? new Date(endDate) : null;

    if (parsedEnd && parsedEnd < parsedStart) {
      res.status(400).json({ success: false, message: 'End date cannot be before start date' });
      return;
    }

    const created: any[] = [];
    const skipped: string[] = [];

    if (parsedEnd) {
      // Date range: create one holiday per day
      const current = new Date(parsedStart);
      while (current <= parsedEnd) {
        const dateStr = current.toISOString().split('T')[0];
        const dayDate = new Date(dateStr + 'T00:00:00.000Z');

        const existing = await prisma.holiday.findFirst({ where: { date: dayDate } });
        if (existing) {
          skipped.push(dateStr);
        } else {
          const h = await prisma.holiday.create({
            data: { name, date: dayDate, endDate: null, type: type || 'PUBLIC' }
          });
          created.push(h);
        }
        current.setDate(current.getDate() + 1);
      }
    } else {
      // Single date
      const dayDate = new Date(parsedStart.toISOString().split('T')[0] + 'T00:00:00.000Z');
      const existing = await prisma.holiday.findFirst({ where: { date: dayDate } });
      if (existing) {
        skipped.push(dayDate.toISOString().split('T')[0]);
      } else {
        const h = await prisma.holiday.create({
          data: { name, date: dayDate, type: type || 'PUBLIC' }
        });
        created.push(h);
      }
    }

    if (req.user?.id && created.length > 0) {
      await logActivity(
        req.user.id,
        'HOLIDAY_ADDED',
        `added holiday: ${name} (${created.length} day${created.length > 1 ? 's' : ''})`,
        'SYSTEM',
        created[0].id
      );
    }

    const msg = created.length > 0
      ? `${created.length} holiday added${skipped.length > 0 ? ` (${skipped.length} skipped - already exists)` : ''}`
      : `All ${skipped.length} dates already have holidays`;

    res.status(201).json({ success: true, message: msg, data: created });
  } catch (error) {
    console.error('Add holiday error:', error);
    res.status(500).json({ success: false, message: 'Failed to add holiday' });
  }
};

export const getHolidays = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const holidays = await prisma.holiday.findMany({
      orderBy: { date: 'asc' }
    });
    
    res.status(200).json({ success: true, data: holidays });
  } catch (error) {
    console.error('Get holidays error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch holidays' });
  }
};

export const deleteHoliday = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const holiday = await prisma.holiday.findUnique({
      where: { id: id as string }
    });

    if (!holiday) {
      res.status(404).json({ success: false, message: 'Holiday not found' });
      return;
    }

    await prisma.holiday.delete({
      where: { id: id as string }
    });

    if (req.user?.id) {
      await logActivity(
        req.user.id,
        'HOLIDAY_DELETED',
        `deleted holiday: ${holiday.name}`,
        'SYSTEM',
        holiday.id
      );
    }

    res.status(200).json({ success: true, message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error('Delete holiday error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete holiday' });
  }
};
