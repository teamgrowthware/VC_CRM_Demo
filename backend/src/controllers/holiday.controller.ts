import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { logActivity } from '../services/activity.service';

interface AuthRequest extends Request {
  user?: any;
}

export const addHoliday = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, date, type } = req.body;

    if (!name || !date) {
      res.status(400).json({ success: false, message: 'Name and date are required' });
      return;
    }

    const parsedDate = new Date(date);
    
    // Check if a holiday with this date already exists
    const existingHoliday = await prisma.holiday.findUnique({
      where: { date: parsedDate }
    });

    if (existingHoliday) {
      res.status(400).json({ success: false, message: 'A holiday already exists for this date' });
      return;
    }

    const holiday = await prisma.holiday.create({
      data: {
        name,
        date: parsedDate,
        type: type || 'PUBLIC'
      }
    });

    if (req.user?.id) {
      await logActivity(
        req.user.id,
        'HOLIDAY_ADDED',
        `added new holiday: ${name}`,
        'SYSTEM',
        holiday.id
      );
    }

    res.status(201).json({ success: true, message: 'Holiday added successfully', data: holiday });
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
