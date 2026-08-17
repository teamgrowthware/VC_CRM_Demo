import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';
import { logActivity } from '../services/activity.service';
import { createNotification } from '../services/notification.service';
import { logDeviceAction } from '../utils/deviceMetadata';

interface AuthRequest extends Request {
  user?: any;
}

import { getShiftBounds, isWeekend } from '../lib/date-utils';

export const punchIn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.user.id;
    const { deviceMetadata } = req.body;
    const now = new Date();
    const today = getShiftBounds(now);

    const existingAttendance = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } }
    });

    if (existingAttendance && existingAttendance.punchIn) {
      res.status(400).json({ success: false, message: 'Already punched in for today' });
      return;
    }

    // Fetch system settings
    const settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } }) || {
      officeStartTime: "09:30",
      lateThreshold: "09:45",
      lateComingEnabled: false,
      halfDayEnabled: false,
    } as any;

    const [startH, startM] = settings.officeStartTime.split(':').map(Number);
    const officeStartTimeDecimal = startH + (startM / 60);
    
    const [lateH, lateM] = (settings.lateThreshold || "09:45").split(':').map(Number);
    const LATE_GRACE_THRESHOLD = lateH + (lateM / 60);

    let status: any = 'PRESENT';
    const isTodayWeekend = isWeekend(now);
    let autoLeave = false;
    let isLate = false;

    // Use Asia/Kolkata timezone to determine local time
    const options = { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: 'numeric', hour12: false } as const;
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const timeParts = formatter.format(now).split(':');
    let localHours = parseInt(timeParts[0], 10);
    // Handle midnight mapping (24 -> 0)
    if (localHours === 24) localHours = 0;
    const localMinutes = parseInt(timeParts[1], 10);

    const timeInHours = localHours + (localMinutes / 60);

    const HALFDAY_DIRECT_THRESHOLD = settings.halfDayEnabled ? 10.0 : 13.0; // 10:00 AM if enabled, else 01:00 PM
    const ABSENT_DIRECT_THRESHOLD = 14.0; // 02:00 PM

    if (isTodayWeekend) {
      status = 'WEEKEND_WORK';
    } else if (timeInHours > ABSENT_DIRECT_THRESHOLD) {
      status = 'ABSENT';
      autoLeave = true;
    } else if (timeInHours > HALFDAY_DIRECT_THRESHOLD) {
      status = 'HALFDAY';
      autoLeave = true;
    } else if (settings.lateComingEnabled && timeInHours > LATE_GRACE_THRESHOLD) {
      isLate = true;
      // Get start and end of current month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Count late punch-ins for the current month
      const latesThisMonth = await prisma.attendance.findMany({
        where: {
          employeeId,
          date: { gte: startOfMonth, lte: endOfMonth },
          punchIn: { not: null }
        }
      });

      let lateCount = 0;
      latesThisMonth.forEach(record => {
        if (record.punchIn) {
          const recParts = formatter.format(record.punchIn).split(':');
          let recH = parseInt(recParts[0], 10);
          if (recH === 24) recH = 0;
          const recM = parseInt(recParts[1], 10);
          const punchHour = recH + (recM / 60);
          if (punchHour > LATE_GRACE_THRESHOLD && punchHour <= HALFDAY_DIRECT_THRESHOLD) {
            lateCount++;
          }
        }
      });

      // Rules for accumulated lates:
      if (lateCount < 2) {
        status = 'LATE';
      } else if (lateCount < 5) {
        status = 'HALFDAY';
        autoLeave = true;
      } else {
        status = 'ABSENT';
        autoLeave = true;
      }
    }

    const attendance = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId, date: today } },
      update: { punchIn: now, status: status as any },
      create: { employeeId, date: today, punchIn: now, status: status as any }
    });

    await logDeviceAction(req, employeeId, attendance.id, 'PUNCH_IN', deviceMetadata);

    if (isLate) {
      await createNotification(
        employeeId,
        'LATE_ARRIVAL',
        `Late Warning: You punched in at ${now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}. Please adhere to the shift start time.`,
        '/dashboard/attendance'
      );
    }

    if (autoLeave) {
      const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
      const perDaySalary = (employee?.baseSalary || 15000) / 30;
      const numDays = (status === 'HALFDAY' || (isLate && status === 'HALFDAY')) ? 0.5 : 1;
      const penaltyAmount = perDaySalary * numDays;

      await prisma.leave.create({
        data: {
          employeeId,
          leaveType: 'AUTO_DEDUCTED',
          startDate: today,
          endDate: today,
          numberOfDays: numDays === 0.5 ? 0 : 1,
          reason: `System Auto-Deducted ${status}: ${status === 'ABSENT' ? 'Arrival after 02:00 PM / 6th late' : (settings.halfDayEnabled ? 'Arrival after 10 AM / 3rd late' : 'Arrival after 01:00 PM')}`,
          status: 'APPROVED'
        }
      });

      await prisma.penalty.create({
        data: {
          employeeId,
          amount: penaltyAmount,
          reason: `Auto-Penalty: ${status} arrival at ${now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}`,
          date: now
        }
      });
    }

    await logActivity(
      employeeId,
      'ATTENDANCE_PUNCH_IN',
      `punched in (Status: ${status})`,
      'ATTENDANCE',
      attendance.id
    );

    await createNotification(
      employeeId,
      'SOD_REMINDER',
      'Punch-In Successful! Please remember to submit your Start of Day (SOD) report.',
      '/dashboard/daily-reports'
    );

    res.status(201).json({ success: true, message: 'Punch in successful', data: attendance, isLate, autoLeave });
  } catch (error) {
    console.error('Punch in error:', error);
    res.status(500).json({ success: false, message: 'Failed to punch in' });
  }
};

export const startBreak = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.user.id;
    const { deviceMetadata } = req.body;
    const today = getShiftBounds();

    const attendance = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } }
    });

    if (!attendance || !attendance.punchIn) {
      res.status(400).json({ success: false, message: 'Must punch in first' });
      return;
    }
    if (attendance.punchOut) {
      res.status(400).json({ success: false, message: 'Already punched out for today' });
      return;
    }

    let updateData: any = {};
    if (!attendance.break1Start) {
      updateData = { break1Start: new Date() };
    } else if (attendance.break1End && attendance.lunchEnd && !attendance.break2Start) {
      updateData = { break2Start: new Date() };
    } else {
      res.status(400).json({ success: false, message: 'Cannot start break. Ensure correct sequence.' });
      return;
    }

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: updateData
    });

    await logDeviceAction(req, employeeId, attendance.id, 'BREAK_START', deviceMetadata);

    res.status(200).json({ success: true, message: 'Break started', data: updated });
  } catch (error) {
    console.error('Start break error:', error);
    res.status(500).json({ success: false, message: 'Failed to start break' });
  }
};

export const endBreak = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.user.id;
    const { deviceMetadata } = req.body;
    const today = getShiftBounds();

    const attendance = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } }
    });

    if (!attendance) {
      res.status(400).json({ success: false, message: 'No attendance record found' });
      return;
    }

    let updateData: any = {};
    if (attendance.break1Start && !attendance.break1End) {
      updateData = { break1End: new Date() };
    } else if (attendance.break2Start && !attendance.break2End) {
      updateData = { break2End: new Date() };
    } else {
      res.status(400).json({ success: false, message: 'No active break to end' });
      return;
    }

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: updateData
    });

    await logDeviceAction(req, employeeId, attendance.id, 'BREAK_END', deviceMetadata);

    res.status(200).json({ success: true, message: 'Break ended', data: updated });
  } catch (error) {
    console.error('End break error:', error);
    res.status(500).json({ success: false, message: 'Failed to end break' });
  }
};

export const startLunch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.user.id;
    const { deviceMetadata } = req.body;
    const today = getShiftBounds();

    const attendance = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } }
    });

    if (!attendance || !attendance.punchIn) {
      res.status(400).json({ success: false, message: 'Must punch in first' });
      return;
    }
    if (attendance.punchOut) {
      res.status(400).json({ success: false, message: 'Already punched out for today' });
      return;
    }

    if (!attendance.break1End) {
      res.status(400).json({ success: false, message: 'Lunch cannot start before Break 1 ends' });
      return;
    }

    if (attendance.lunchStart) {
      res.status(400).json({ success: false, message: 'Lunch already started' });
      return;
    }

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: { lunchStart: new Date() }
    });

    await logDeviceAction(req, employeeId, attendance.id, 'LUNCH_START', deviceMetadata);

    res.status(200).json({ success: true, message: 'Lunch started', data: updated });
  } catch (error) {
    console.error('Start lunch error:', error);
    res.status(500).json({ success: false, message: 'Failed to start lunch' });
  }
};

export const endLunch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.user.id;
    const { deviceMetadata } = req.body;
    const today = getShiftBounds();

    const attendance = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } }
    });

    if (!attendance || !attendance.lunchStart) {
      res.status(400).json({ success: false, message: 'Lunch not started' });
      return;
    }

    if (attendance.lunchEnd) {
      res.status(400).json({ success: false, message: 'Lunch already ended' });
      return;
    }

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: { lunchEnd: new Date() }
    });

    await logDeviceAction(req, employeeId, attendance.id, 'LUNCH_END', deviceMetadata);

    res.status(200).json({ success: true, message: 'Lunch ended', data: updated });
  } catch (error) {
    console.error('End lunch error:', error);
    res.status(500).json({ success: false, message: 'Failed to end lunch' });
  }
};

export const punchOut = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.user.id;
    const { earlyExitReason, deviceMetadata } = req.body;
    const today = getShiftBounds();

    const attendance = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
      include: { employee: true }
    });

    if (!attendance || !attendance.punchIn) {
      res.status(400).json({ success: false, message: 'No punch-in found for today' });
      return;
    }

    if (attendance.punchOut) {
      res.status(400).json({ success: false, message: 'Already punched out for today' });
      return;
    }

    // Check for active breaks or lunch
    if (attendance.break1Start && !attendance.break1End) {
      res.status(400).json({ success: false, message: 'Cannot punch out. End Break 1 first.' });
      return;
    }
    if (attendance.lunchStart && !attendance.lunchEnd) {
      res.status(400).json({ success: false, message: 'Cannot punch out. End Lunch first.' });
      return;
    }
    if (attendance.break2Start && !attendance.break2End) {
      res.status(400).json({ success: false, message: 'Cannot punch out. End Break 2 first.' });
      return;
    }

    const punchOutTime = new Date();
    const punchInTime = attendance.punchIn;

    // Check for any pending idle logs and auto-close them
    const pendingIdleLog = await prisma.idleLog.findFirst({
      where: { userId: employeeId, status: 'PENDING_APPROVAL' },
      orderBy: { createdAt: 'desc' }
    });

    if (pendingIdleLog) {
      const idleDurationMinutes = Math.max(0, (punchOutTime.getTime() - pendingIdleLog.idleStartedAt.getTime()) / (1000 * 60));
      
      const updateResult = await prisma.idleLog.updateMany({
        where: { id: pendingIdleLog.id, status: 'PENDING_APPROVAL' },
        data: {
          status: 'APPROVED',
          idleEndedAt: punchOutTime,
          idleDurationMinutes,
          adminComment: 'Auto-closed during Punch Out'
        }
      });

      // Only increment if we actually updated the log (wasn't already resumed by another request)
      if (updateResult.count > 0) {
        // Update Attendance totalIdleMinutes for the day
        await prisma.attendance.updateMany({
          where: { id: attendance.id },
          data: {
            totalIdleMinutes: { increment: Math.floor(idleDurationMinutes) }
          }
        });
      }
      
      // Update UserActivitySession to ACTIVE
      await prisma.userActivitySession.updateMany({
        where: { userId: employeeId },
        data: { status: 'ACTIVE', lastActivityAt: punchOutTime }
      });
    }

    // Calculate breaks
    let breakMilliseconds = 0;
    if (attendance.break1Start && attendance.break1End) {
      breakMilliseconds += attendance.break1End.getTime() - attendance.break1Start.getTime();
    }
    if (attendance.break2Start && attendance.break2End) {
      breakMilliseconds += attendance.break2End.getTime() - attendance.break2Start.getTime();
    }
    let lunchMilliseconds = 0;
    if (attendance.lunchStart && attendance.lunchEnd) {
      lunchMilliseconds += attendance.lunchEnd.getTime() - attendance.lunchStart.getTime();
    }

    const activeMilliseconds = (punchOutTime.getTime() - punchInTime.getTime()) - breakMilliseconds - lunchMilliseconds;
    const totalHours = Math.max(0, activeMilliseconds / (1000 * 60 * 60));

    // Check for Overstay Penalties (System Settings)
    const settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } }) || {
      lunchDuration: 60,
      breakDuration: 30,
    };

    const lunchMinutes = Math.floor(lunchMilliseconds / (1000 * 60));
    const breakMinutes = Math.floor(breakMilliseconds / (1000 * 60));

    if (lunchMinutes > settings.lunchDuration) {
      await createNotification(
        employeeId,
        'ATTENDANCE_PUNCH_OUT',
        `Policy Alert: Your lunch break was ${lunchMinutes} mins (Max: ${settings.lunchDuration} mins). Please adhere to the timing policy.`,
        '/dashboard/attendance'
      );
    }

    if (breakMinutes > settings.breakDuration) {
      await createNotification(
        employeeId,
        'ATTENDANCE_PUNCH_OUT',
        `Policy Alert: Your total short breaks were ${breakMinutes} mins (Max: ${settings.breakDuration} mins).`,
        '/dashboard/attendance'
      );
    }

    // Determine status - Preserve penalty status if applicable
    let finalStatus = attendance.status;

    // Only upgrade or downgrade if it's not a severe penalty
    if (finalStatus !== 'ABSENT' && finalStatus !== 'HALFDAY') {
      if (totalHours >= 8) {
        // Keep as PRESENT (they completed hours)
      } else if (totalHours >= 4) {
        finalStatus = 'HALFDAY';
      } else {
        finalStatus = 'ABSENT';
      }
    } else if (finalStatus === 'HALFDAY' && totalHours < 4) {
      // If penalized to halfday but didn't even complete 4 hours
      finalStatus = 'ABSENT';
    }

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        punchOut: punchOutTime,
        totalHours: Number(totalHours.toFixed(2)),
        status: finalStatus as any,
        earlyExitReason: earlyExitReason || null
      }
    });

    // Stop Timer Session if active
    await prisma.timerSession.updateMany({
      where: { employeeId: employeeId, isActive: true },
      data: {
        isActive: false,
        status: 'STOPPED'
      }
    });

    // Set UserActivitySession to IDLE
    await prisma.userActivitySession.updateMany({
      where: { userId: employeeId },
      data: { status: 'IDLE' }
    });

    if (earlyExitReason) {
      // Notify admins
      const admins = await prisma.employee.findMany({
        where: { role: 'ADMIN' }
      });

      for (const admin of admins) {
        await createNotification(
          admin.id,
          'ATTENDANCE_PUNCH_OUT',
          `Early Exit: ${attendance.employee.name} left early. Reason: ${earlyExitReason}`,
          `/dashboard/hr` // Assuming HR/Admin dashboard is here
        );
      }
    }

    await logActivity(
      employeeId,
      'ATTENDANCE_PUNCH_OUT',
      `punched out (Total Hours: ${updated.totalHours})`,
      'ATTENDANCE',
      updated.id
    );

    await logDeviceAction(req, employeeId, attendance.id, 'PUNCH_OUT', deviceMetadata);

    res.status(200).json({ success: true, message: 'Punched out successfully', data: updated });
  } catch (error) {
    console.error('Punch out error:', error);
    res.status(500).json({ success: false, message: 'Failed to punch out' });
  }
};

export const getTodayAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.user.id;
    const today = getShiftBounds();

    const attendance = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } }
    });

    res.status(200).json({ success: true, data: attendance || null });
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch today attendance' });
  }
};

export const getEmployeeAttendanceHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.user.id;

    const { month, year } = req.query;
    const now = new Date();
    
    let startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    if (month && year) {
      startDate = new Date(Number(year), Number(month) - 1, 1);
      endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
    }

    const attendance = await prisma.attendance.findMany({
      where: { 
        employeeId,
        date: { gte: startDate, lte: endDate }
      },
      orderBy: { date: 'desc' },
      include: {
        employee: { select: { name: true, employeeId: true } },
        deviceLogs: { orderBy: { createdAt: 'desc' } }
      }
    });

    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    console.error('Get attendance history error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance history' });
  }
};

export const getAllAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // HR or Admin
    const { date, month, year, status } = req.query;

    let whereCondition: any = {};

    if (date) {
      const qDate = getShiftBounds(new Date(date as string));
      whereCondition.date = qDate;
    } else if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1, 0, 0, 0, 0);
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      whereCondition.date = { gte: startDate, lte: endDate };
    } else {
      const today = getShiftBounds();
      whereCondition.date = today;
    }

    // If a specific date is requested, we want to show all employees even if they don't have a record
    if (date && !month && !year) {
      const qDate = getShiftBounds(new Date(date as string));
      const activeEmployees = await prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: { 
          id: true, 
          name: true, 
          employeeId: true, 
          department: { select: { name: true } } 
        }
      });

      // For the mapping, we fetch ALL records for the date without status filter
      const attendanceRecords = await prisma.attendance.findMany({
        where: { date: qDate },
        include: { 
          employee: { select: { name: true, employeeId: true, department: { select: { name: true } } } },
          deviceLogs: { orderBy: { createdAt: 'desc' } }
        }
      });

      const combinedResults = activeEmployees.map(emp => {
        const record = attendanceRecords.find(r => r.employeeId === emp.id);
        if (record) return record;

        return {
          id: `absent-${emp.id}-${qDate.getTime()}`,
          employeeId: emp.id,
          date: qDate,
          punchIn: null,
          punchOut: null,
          totalHours: null,
          status: isWeekend(qDate) ? 'WEEKEND' : 'ABSENT',
          employee: emp
        };
      });

      // Apply status filter if provided
      const filteredResults = (status && status !== 'ALL')
        ? combinedResults.filter(r => r.status === status)
        : combinedResults;

      res.status(200).json({ success: true, data: filteredResults });
      return;
    }

    // For range views, apply status filter in DB
    if (status && status !== 'ALL') {
      whereCondition.status = status;
    }

    const attendanceRecords = await prisma.attendance.findMany({
      where: whereCondition,
      include: { 
        employee: { select: { name: true, employeeId: true, department: { select: { name: true } } } },
        deviceLogs: { orderBy: { createdAt: 'desc' } }
      },
      orderBy: { date: 'desc' }
    });

    res.status(200).json({ success: true, data: attendanceRecords });
  } catch (error: any) {
    console.error('Get all attendance error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch all attendance',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
};

export const getCalendarData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.user.id;
    const { month, year } = req.query;

    if (!month || !year) {
      res.status(400).json({ success: false, message: 'Month and year are required' });
      return;
    }

    const startDate = new Date(Number(year), Number(month) - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);

    const attendances = await prisma.attendance.findMany({
      where: { employeeId, date: { gte: startDate, lte: endDate } }
    });

    const leaves = await prisma.leave.findMany({
      where: { employeeId, status: 'APPROVED', startDate: { lte: endDate }, endDate: { gte: startDate } }
    });

    const holidays = await prisma.holiday.findMany({
      where: { date: { gte: startDate, lte: endDate } }
    });

    // Structure calendar events
    const calendarData: any[] = [];

    // Map attendances
    attendances.forEach(att => {
      let color = 'green';
      if (att.status === 'LATE') color = 'yellow';
      else if (att.status === 'HALFDAY') color = 'orange';
      else if (att.status === 'ABSENT') color = 'red';
      else if (att.status === 'WEEKEND') color = 'gray';
      else if (att.status === 'WEEKEND_WORK') color = 'indigo';

      calendarData.push({
        type: 'ATTENDANCE',
        title: att.status,
        date: att.date,
        originalStatus: att.status,
        color
      });
    });

    // Map leaves (can span multiple days)
    leaves.forEach(leave => {
      if (leave.leaveType === 'AUTO_DEDUCTED') return;
      let current = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      while (current <= end) {
        if (current >= startDate && current <= endDate) {
          calendarData.push({
            type: 'LEAVE',
            title: `On Leave`,
            date: new Date(current),
            originalStatus: leave.leaveType,
            color: 'red' // Leave usually marked red or different distinct color
          });
        }
        current.setDate(current.getDate() + 1);
      }
    });

    // Map holidays
    holidays.forEach(holiday => {
      calendarData.push({
        type: 'HOLIDAY',
        title: holiday.name,
        date: holiday.date,
        originalStatus: holiday.type,
        color: 'blue'
      });
    });

    res.status(200).json({ success: true, data: calendarData });
  } catch (error) {
    console.error('Get calendar data error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch calendar data' });
  }
};

export const updateAttendanceStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status, note } = req.body;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    if (currentUserRole !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Forbidden: Only Admins can update attendance status' });
      return;
    }

    let record;
    if (id.startsWith('absent-')) {
      const parts = id.split('-');
      const timestamp = parseInt(parts[parts.length - 1]);
      const employeeId = parts.slice(1, parts.length - 1).join('-');
      const date = new Date(timestamp);

      // HR cannot update their own attendance
      if (currentUserRole === 'HR' && employeeId === currentUserId) {
        res.status(403).json({ success: false, message: 'HR cannot update their own attendance status. Please contact Admin.' });
        return;
      }

      record = await prisma.attendance.upsert({
        where: { employeeId_date: { employeeId, date } },
        update: { status: status as any, adminNote: note },
        create: { employeeId, date, status: status as any, adminNote: note }
      });

      await logActivity(
        req.user.id,
        'ATTENDANCE_STATUS_UPDATE',
        `created/updated attendance status for employee ${employeeId} on ${date.toDateString()} to ${status}`,
        'ATTENDANCE',
        record.id
      );

      // Always clean up auto-deducted leaves and penalties on manual update to prevent double deductions
      await prisma.leave.deleteMany({
        where: {
          employeeId,
          leaveType: 'AUTO_DEDUCTED',
          startDate: date
        }
      });

      const shiftStart = date;
      const shiftEnd = new Date(shiftStart.getTime() + 24 * 60 * 60 * 1000);
      await prisma.penalty.deleteMany({
        where: {
          employeeId,
          reason: { startsWith: 'Auto-Penalty:' },
          date: { gte: shiftStart, lt: shiftEnd }
        }
      });

      res.status(200).json({ success: true, message: 'Attendance status updated successfully', data: record });
      return;
    }

    record = await prisma.attendance.findUnique({ where: { id } });
    if (!record) {
      res.status(404).json({ success: false, message: 'Attendance record not found' });
      return;
    }

    // HR cannot update their own attendance
    if (currentUserRole === 'HR' && record.employeeId === currentUserId) {
      res.status(403).json({ success: false, message: 'HR cannot update their own attendance status. Please contact Admin.' });
      return;
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        status: status as any,
        adminNote: note,
      }
    });

    await logActivity(
      req.user.id,
      'ATTENDANCE_STATUS_UPDATE',
      `updated attendance status for record ${id} to ${status}`,
      'ATTENDANCE',
      updated.id
    );

    // Always clean up auto-deducted leaves and penalties on manual update to prevent double deductions
    await prisma.leave.deleteMany({
      where: {
        employeeId: record.employeeId,
        leaveType: 'AUTO_DEDUCTED',
        startDate: record.date
      }
    });

    const shiftStart = record.date;
    const shiftEnd = new Date(shiftStart.getTime() + 24 * 60 * 60 * 1000);
    await prisma.penalty.deleteMany({
      where: {
        employeeId: record.employeeId,
        reason: { startsWith: 'Auto-Penalty:' },
        date: { gte: shiftStart, lt: shiftEnd }
      }
    });

    res.status(200).json({ success: true, message: 'Attendance status updated successfully', data: updated });
  } catch (error) {
    console.error('Update attendance status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update attendance status' });
  }
};

export const getEarlyExitAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month as string) || new Date().getMonth() + 1;
    const y = parseInt(year as string) || new Date().getFullYear();

    const startOfMonth = new Date(y, m - 1, 1);
    const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);

    const earlyExits = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        },
        earlyExitReason: {
          not: null
        }
      },
      include: {
        employee: {
          select: { name: true, employeeId: true }
        }
      }
    });

    // Group by employee to find frequent offenders
    const summary = earlyExits.reduce((acc: any, curr) => {
      const empId = curr.employeeId;
      if (!acc[empId]) {
        acc[empId] = {
          name: curr.employee?.name,
          employeeId: curr.employee?.employeeId,
          count: 0,
          reasons: []
        };
      }
      acc[empId].count += 1;
      acc[empId].reasons.push({ date: curr.date, reason: curr.earlyExitReason });
      return acc;
    }, {});

    res.status(200).json({ success: true, data: Object.values(summary) });
  } catch (error) {
    console.error('Get early exit analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
};

export const deletePenalty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const penalty = await prisma.penalty.findUnique({
      where: { id }
    });

    if (!penalty) {
      res.status(404).json({ success: false, message: 'Penalty not found' });
      return;
    }

    await prisma.penalty.delete({
      where: { id }
    });

    await logActivity(
      req.user.id,
      'PENALTY_DELETED',
      `deleted penalty of ${penalty.amount} for employee ${penalty.employeeId}`,
      'PENALTY',
      id
    );

    res.status(200).json({ success: true, message: 'Penalty deleted successfully' });
  } catch (error) {
    console.error('Delete penalty error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete penalty' });
  }
};

