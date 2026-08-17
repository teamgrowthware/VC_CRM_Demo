import prisma from '../lib/prisma';
import { createNotification } from './notification.service';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export const checkForgottenTimers = async () => {
  try {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    
    const forgottenTimers = await prisma.timerSession.findMany({
      where: {
        isActive: true,
        startTime: {
          lt: twelveHoursAgo
        }
      }
    });

    for (const timer of forgottenTimers) {
      await createNotification(
        timer.employeeId,
        'TIMER_FORGOTTEN',
        'Your timer has been running for over 12 hours. Please stop or update it.',
        '/dashboard/timesheet'
      );
    }
    
    return forgottenTimers.length;
  } catch (error) {
    console.error('Forgotten Timers Check Error:', error);
    return 0;
  }
};

export const checkLowTrackedHours = async (dateToCheck: Date = subDays(new Date(), 1)) => {
  try {
    const start = startOfDay(dateToCheck);
    const end = endOfDay(dateToCheck);

    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE', role: 'EMPLOYEE' }
    });

    for (const employee of employees) {
      const entries = await prisma.timeEntry.findMany({
        where: {
          employeeId: employee.id,
          date: { gte: start, lte: end }
        }
      });

      const totalMinutes = entries.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
      const totalHours = totalMinutes / 60;

      if (totalHours < 6) {
        await createNotification(
          employee.id,
          'LOW_TRACKED_HOURS',
          `You only tracked ${totalHours.toFixed(1)}h for ${format(dateToCheck, 'MMM dd')}. Requirement is 8h.`,
          '/dashboard/timesheet'
        );
      }
    }
  } catch (error) {
    console.error('Low Tracked Hours Check Error:', error);
  }
};

export const notifyPendingApprovals = async () => {
  try {
    const pendingCount = await prisma.timeEntry.count({
      where: { status: 'SUBMITTED' }
    });

    if (pendingCount > 0) {
      const admins = await prisma.employee.findMany({
        where: { role: { in: ['ADMIN', 'MANAGER'] } }
      });

      for (const admin of admins) {
        await createNotification(
          admin.id,
          'PENDING_APPROVAL',
          `There are ${pendingCount} timesheet entries pending your approval.`,
          '/dashboard/timesheet'
        );
      }
    }
  } catch (error) {
    console.error('Pending Approvals Notify Error:', error);
  }
};

function format(date: Date, fmt: string) {
  return date.toLocaleDateString(); // Simple fallback
}
