import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getUpcomingEvents = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    // Fetch Birthdays & Anniversaries from Employees
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, joiningDate: true, department: true }
    });

    const birthdays: any[] = []; // Assuming no DOB field yet, returning empty or mock
    const anniversaries = employees.filter(e => {
        const joinDate = new Date(e.joiningDate);
        return joinDate.getDate() >= today.getDate() && joinDate.getDate() <= nextWeek.getDate() && joinDate.getMonth() === today.getMonth();
    }).map(e => ({
        id: e.id,
        name: e.name,
        date: e.joiningDate,
        years: today.getFullYear() - new Date(e.joiningDate).getFullYear()
    }));

    // Fetch official events
    const events = await prisma.event.findMany({
      where: {
        date: {
          gte: today,
          lte: nextWeek
        }
      },
      orderBy: { date: 'asc' }
    });

    res.json({ success: true, birthdays, anniversaries, events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
