import cron from 'node-cron';
import { format } from 'date-fns';
import prisma from './prisma';
import { runBackup } from './backup';
import { checkDeadlines } from '../services/deadline.service';
import { createNotification } from '../services/notification.service';

import { getShiftBounds, isWeekend } from './date-utils';

export const initCronJobs = () => {
  // Run every day at 11:59 PM (23:59)
  cron.schedule('59 23 * * *', async () => {
    try {
      console.log('[Cron] Running daily attendance check for absent employees...');
      
      const today = getShiftBounds();

      // Check if today is a holiday
      const todayHoliday = await prisma.holiday.findFirst({ where: { date: today } });

      // Get all active employees
      const activeEmployees = await prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true }
      });

      // Get attendance records for today (Shift starting at 4 AM)
      const todaysAttendance = await prisma.attendance.findMany({
        where: { date: today },
        select: { employeeId: true }
      });

      const attendedEmployeeIds = new Set(todaysAttendance.map(a => a.employeeId));

      // Find employees who haven't punched in today
      const absentEmployees = activeEmployees.filter(emp => !attendedEmployeeIds.has(emp.id));

      if (absentEmployees.length > 0) {
        let status: string;
        if (todayHoliday) {
          status = 'HOLIDAY';
          console.log(`[Cron] Today is a holiday (${todayHoliday.name}). Marking ${absentEmployees.length} employees as HOLIDAY.`);
        } else {
          const isOffDay = isWeekend(today);
          status = isOffDay ? 'WEEKEND' : 'ABSENT';
          console.log(`[Cron] Found ${absentEmployees.length} absent employees. Marking as ${status}.`);
        }
        
        await prisma.attendance.createMany({
          data: absentEmployees.map(emp => ({
            employeeId: emp.id,
            date: today,
            status: status as any,
            totalHours: 0
          })),
          skipDuplicates: true,
        });
      }

      console.log('[Cron] Daily attendance check completed.');
    } catch (error) {
      console.error('[Cron] Error running daily attendance check:', error);
    }
  });
  
  // Run every hour to check for task deadlines
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Running hourly task deadline check...');
    await checkDeadlines();
  });

  // Daily check at 9:00 AM IST (3:30 AM UTC) for payment reminders
  cron.schedule('30 3 * * *', async () => {
    console.log('[Cron] Running daily payment reminder check...');
    await checkPaymentMilestones();
  });

  // Check for SOD/EOD Reminders every minute based on dynamic settings
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const currentTimeStr = format(now, 'HH:mm');
      
      const settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
      if (!settings) return;

      const today = getShiftBounds();

      // SOD REMINDER
      if (currentTimeStr === settings.sodReminderTime) {
         console.log('[Cron] Triggering dynamic SOD reminder...');
         const attendance = await prisma.attendance.findMany({
           where: { date: today, punchIn: { not: null } },
           select: { employeeId: true }
         });
         const reports = await prisma.dailyReport.findMany({
           where: { date: today, sodText: { not: '' } },
           select: { employeeId: true }
         });
         const reportedIds = new Set(reports.map(r => r.employeeId));
         const missingIds = attendance.map(a => a.employeeId).filter(id => !reportedIds.has(id));
         
         for (const id of missingIds) {
           await createNotification(id, 'SOD_REMINDER', 'Reminder: You haven\'t submitted your SOD report yet.', '/dashboard/daily-reports');
         }
      }

      // EOD REMINDER
      if (currentTimeStr === settings.eodReminderTime) {
         console.log('[Cron] Triggering dynamic EOD reminder...');
         const attendance = await prisma.attendance.findMany({
           where: { date: today, punchIn: { not: null } },
           select: { employeeId: true }
         });
         const reports = await prisma.dailyReport.findMany({
           where: { date: today, eodText: { not: null } },
           select: { employeeId: true }
         });
         const reportedIds = new Set(reports.map(r => r.employeeId));
         const missingIds = attendance.map(a => a.employeeId).filter(id => !reportedIds.has(id));

         for (const id of missingIds) {
           await createNotification(id, 'EOD_REMINDER', 'Reminder: Please submit your EOD report.', '/dashboard/daily-reports');
         }
      }

      // 4. FORGOTTEN TIMER CHECK (Every Hour)
      // Check for active sessions running > 10 hours
      const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000);
      const longRunningTimers = await prisma.timerSession.findMany({
        where: { isActive: true, startTime: { lt: tenHoursAgo } },
        select: { employeeId: true, startTime: true, description: true }
      });

      for (const timer of longRunningTimers) {
        await createNotification(
          timer.employeeId,
          'TIMER_FORGOTTEN',
          `Alert: Your timer for "${timer.description || 'Task'}" has been running for over 10 hours. Did you forget to stop it?`,
          '/dashboard/timesheet'
        );
      }

    } catch (err) {
      console.error('[Cron] Dynamic reminder error:', err);
    }
  });

  // 5. DAILY PRODUCTIVITY AUDIT (At 10:00 PM)
  cron.schedule('0 22 * * *', async () => {
    try {
      console.log('[Cron] Running daily productivity audit...');
      const today = getShiftBounds();
      
      const attendance = await prisma.attendance.findMany({
        where: { date: today, punchIn: { not: null }, totalHours: { gt: 4 } },
        select: { employeeId: true, totalHours: true }
      });

      const trackedMinutes = await prisma.timeEntry.groupBy({
        by: ['employeeId'],
        where: { date: today, status: 'APPROVED', employeeId: { in: attendance.map(record => record.employeeId) } },
        _sum: { durationMinutes: true }
      });
      const trackedByEmployee = new Map(trackedMinutes.map(entry => [entry.employeeId, entry._sum.durationMinutes || 0]));

      for (const record of attendance) {

        const trackedHours = (trackedByEmployee.get(record.employeeId) || 0) / 60;
        const attendanceHours = record.totalHours || 0;
        const ratio = attendanceHours > 0 ? trackedHours / attendanceHours : 0;

        if (attendanceHours > 4 && ratio < 0.4) { // Less than 40% of attendance hours tracked
          await createNotification(
            record.employeeId,
            'LOW_TRACKED_HOURS',
            `Productivity Alert: You have only tracked ${trackedHours.toFixed(1)}h out of your ${attendanceHours.toFixed(1)}h attendance today.`,
            '/dashboard/timesheet'
          );
        }
      }
    } catch (err) {
      console.error('[Cron] Productivity audit error:', err);
    }
  });

  // Daily database backup at 3:15 AM server time
  cron.schedule('15 3 * * *', async () => {
    try {
      console.log('[Cron] Running daily database backup...');
      const result = await runBackup();
      console.log(`[Cron] Backup complete: ${result.tables} tables, ${result.rows} rows -> ${result.jsonFile}`);
    } catch (error) {
      console.error('[Cron] Database backup failed:', error);
    }
  });

  console.log('Cron jobs initialized successfully.');
};

const checkPaymentMilestones = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pendingMilestones = await prisma.projectMilestone.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIALLY_PAID'] }
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            managerId: true
          }
        }
      }
    });

    const admins = await prisma.employee.findMany({
      where: { role: 'ADMIN' },
      select: { id: true }
    });

    for (const milestone of pendingMilestones) {
      const dueDate = new Date(milestone.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      let type: any = null;
      let message = '';

      if (dueDate.getTime() === tomorrow.getTime() && !milestone.reminderSentOneDayBefore) {
        type = 'PAYMENT_DUE_SOON';
        message = `Payment of ₹${milestone.amount} for project "${milestone.project.name}" is due tomorrow.`;
        await prisma.projectMilestone.update({
          where: { id: milestone.id },
          data: { reminderSentOneDayBefore: true, lastReminderSentAt: new Date() }
        });
      } else if (dueDate.getTime() === today.getTime() && !milestone.reminderSentOnDueDate) {
        type = 'PAYMENT_DUE_TODAY';
        message = `Payment of ₹${milestone.amount} for project "${milestone.project.name}" is due today!`;
        await prisma.projectMilestone.update({
          where: { id: milestone.id },
          data: { reminderSentOnDueDate: true, lastReminderSentAt: new Date() }
        });
      } else if (dueDate.getTime() < today.getTime() && !milestone.reminderSentOverdue) {
        type = 'PAYMENT_OVERDUE';
        message = `Payment of ₹${milestone.amount} for project "${milestone.project.name}" is OVERDUE!`;
        await prisma.projectMilestone.update({
          where: { id: milestone.id },
          data: { reminderSentOverdue: true, lastReminderSentAt: new Date() }
        });
      }

      if (type) {
        const link = `/dashboard/projects/${milestone.projectId}?tab=financials`;
        
        // Notify Admin
        for (const admin of admins) {
          await createNotification(admin.id, type, message, link);
        }

        // Notify Project Manager
        if (milestone.project.managerId) {
          await createNotification(milestone.project.managerId, type, message, link);
        }
      }
    }
  } catch (error) {
    console.error('[Cron] Error in checkPaymentMilestones:', error);
  }
};

