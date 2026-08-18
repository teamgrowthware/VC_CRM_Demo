import { Request, Response } from 'express';
import prisma from '../lib/prisma';

const getUpcomingDates = (base: Date, days: number): { month: number, day: number }[] => {
  const dates: { month: number, day: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    dates.push({ month: d.getMonth(), day: d.getDate() });
  }
  return dates;
};

export const getUpcomingEvents = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const window = getUpcomingDates(today, 8);

    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, joiningDate: true, dateOfBirth: true, department: true }
    });

    const birthdays = employees
      .filter(e => e.dateOfBirth)
      .map(e => {
        const dob = new Date(e.dateOfBirth as Date);
        const upcoming = window.find(w => w.month === dob.getMonth() && w.day === dob.getDate());
        return {
          id: e.id,
          name: e.name,
          date: upcoming ? new Date(today.getFullYear(), upcoming.month, upcoming.day) : dob,
          years: today.getFullYear() - dob.getFullYear()
        };
      })
      .filter(b => window.some(w => {
        const d = new Date(b.date);
        return w.month === d.getMonth() && w.day === d.getDate();
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const anniversaries = employees
      .map(e => {
        const joinDate = new Date(e.joiningDate);
        const upcoming = window.find(w => w.month === joinDate.getMonth() && w.day === joinDate.getDate());
        return {
          id: e.id,
          name: e.name,
          date: upcoming ? new Date(today.getFullYear(), upcoming.month, upcoming.day) : joinDate,
          years: today.getFullYear() - joinDate.getFullYear()
        };
      })
      .filter(a => window.some(w => {
        const d = new Date(a.date);
        return w.month === d.getMonth() && w.day === d.getDate();
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
