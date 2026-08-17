import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { WorkCategory, TimeEntryStatus, TimeEntryType } from '@prisma/client';
import { differenceInMinutes, differenceInSeconds } from 'date-fns';
import { getShiftBounds } from '../lib/date-utils';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

export const startTimer = async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.user?.id;
    if (!employeeId) return res.status(401).json({ message: 'Unauthorized' });
    
    const { taskId, projectId, description, workCategory } = req.body;

    // Check for existing active timer
    const existingTimer = await prisma.timerSession.findUnique({
      where: { employeeId: employeeId }
    });

    if (existingTimer && existingTimer.isActive) {
      return res.status(400).json({ 
        message: 'You already have an active timer running.',
        activeTimer: existingTimer
      });
    }

    const timer = await prisma.timerSession.upsert({
      where: { employeeId: employeeId },
      update: {
        taskId: taskId || null,
        projectId: projectId || null,
        description: description || null,
        workCategory: workCategory as any,
        startTime: new Date(),
        lastPausedAt: null,
        totalPausedSeconds: 0,
        totalIdleMinutes: 0,
        status: 'RUNNING',
        lastActivityAt: new Date(),
        autoPausedAt: null,
        resumeRequiresApproval: false,
        isActive: true,
        pauseIntervals: {
          deleteMany: {},
        },
      },
      create: {
        employeeId: employeeId,
        taskId: taskId || null,
        projectId: projectId || null,
        description: description || null,
        workCategory: workCategory as any,
        startTime: new Date(),
        isActive: true,
        status: 'RUNNING',
        lastActivityAt: new Date(),
      },
    });

    res.status(201).json(timer);
  } catch (error) {
    console.error('Start Timer Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const pauseTimer = async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.user?.id;
    if (!employeeId) return res.status(401).json({ message: 'Unauthorized' });
    const now = new Date();

    const timer = await prisma.timerSession.findUnique({
      where: { employeeId: employeeId }
    });

    if (!timer || !timer.isActive) {
      return res.status(400).json({ message: 'No active timer found.' });
    }

    if (timer.lastPausedAt) {
      return res.status(400).json({ message: 'Timer is already paused.' });
    }

    const updatedTimer = await prisma.timerSession.update({
      where: { employeeId: employeeId },
      data: {
        lastPausedAt: now,
        status: 'PAUSED',
        pauseIntervals: {
          create: { pausedAt: now }
        }
      }
    });

    res.json(updatedTimer);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const resumeTimer = async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.user?.id;
    if (!employeeId) return res.status(401).json({ message: 'Unauthorized' });
    const now = new Date();

    const timer = await prisma.timerSession.findUnique({
      where: { employeeId: employeeId },
      include: { 
        pauseIntervals: { 
          where: { resumedAt: null },
          orderBy: { pausedAt: 'desc' },
          take: 1
        } 
      }
    });

    if (!timer || !timer.isActive || !timer.lastPausedAt) {
      return res.status(400).json({ message: 'Timer is not paused.' });
    }

    const lastInterval = timer.pauseIntervals[0];
    if (lastInterval) {
      await prisma.timerPauseInterval.update({
        where: { id: lastInterval.id },
        data: { resumedAt: now }
      });
    }

    const pausedSeconds = differenceInSeconds(now, timer.lastPausedAt);

    const updatedTimer = await prisma.timerSession.update({
      where: { employeeId: employeeId },
      data: {
        lastPausedAt: null,
        status: 'RUNNING',
        lastActivityAt: now,
        totalPausedSeconds: timer.totalPausedSeconds + pausedSeconds
      }
    });

    res.json(updatedTimer);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const stopTimer = async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.user?.id;
    if (!employeeId) return res.status(401).json({ message: 'Unauthorized' });
    const { description, workCategory, productivityRating, isBillable } = req.body;

    const timer = await prisma.timerSession.findUnique({
      where: { employeeId: employeeId },
      include: { pauseIntervals: true }
    });

    if (!timer || !timer.isActive) {
      return res.status(400).json({ message: 'No active timer found.' });
    }

    const endTime = new Date();
    
    // Server-side duration calculation from pause intervals
    let totalPausedSeconds = 0;
    timer.pauseIntervals.forEach(interval => {
      const start = interval.pausedAt;
      const end = interval.resumedAt || endTime;
      totalPausedSeconds += differenceInSeconds(end, start);
    });

    const totalElapsedSeconds = differenceInSeconds(endTime, timer.startTime);
    const netSeconds = Math.max(0, totalElapsedSeconds - totalPausedSeconds - (timer.totalIdleMinutes * 60));
    const durationMinutes = Math.max(1, Math.round(netSeconds / 60));

    const timeEntry = await prisma.timeEntry.create({
      data: {
        employeeId,
        taskId: timer.taskId,
        projectId: timer.projectId,
        startTime: timer.startTime,
        endTime,
        durationMinutes,
        description: description || timer.description,
        workCategory: workCategory || (timer.workCategory as any),
        productivityRating: productivityRating ? Number(productivityRating) : null,
        isBillable: isBillable ?? true,
        type: 'TIMER',
        status: 'SUBMITTED',
        idleMinutes: timer.totalIdleMinutes,
        date: getShiftBounds()
      }
    });

    // Reset/Delete session
    await prisma.timerSession.delete({ where: { employeeId: employeeId } });

    res.status(201).json(timeEntry);
  } catch (error) {
    console.error('Stop Timer Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getActiveTimer = async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.user?.id;
    if (!employeeId) return res.status(401).json({ message: 'Unauthorized' });
    const timer = await prisma.timerSession.findUnique({
      where: { employeeId: employeeId }
    });
    res.json(timer);
  } catch (error) {
    console.error('Get Active Timer Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const addManualEntry = async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.user?.id;
    if (!employeeId) return res.status(401).json({ message: 'Unauthorized' });
    const { taskId, projectId, startTime, endTime, description, date, isBillable, workCategory, manualProjectName } = req.body;

    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMinutes = differenceInMinutes(end, start);

    if (durationMinutes <= 0) {
      return res.status(400).json({ message: 'End time must be after start time.' });
    }

    // Overlap check
    const overlap = await prisma.timeEntry.findFirst({
      where: {
        employeeId: employeeId,
        OR: [
          { startTime: { lte: start }, endTime: { gte: start } },
          { startTime: { lte: end }, endTime: { gte: end } },
          { startTime: { gte: start }, endTime: { lte: end } }
        ]
      }
    });

    if (overlap) {
      return res.status(400).json({ message: 'This entry overlaps with an existing time log.' });
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        employeeId: employeeId,
        taskId: taskId || null,
        projectId: projectId || null,
        manualProjectName: manualProjectName || null,
        startTime: start,
        endTime: end,
        durationMinutes,
        description,
        workCategory: workCategory as any,
        type: 'MANUAL',
        status: 'SUBMITTED', // Manual entries always require approval
        isBillable: isBillable ?? true,
        date: getShiftBounds(date ? new Date(date) : new Date())
      }
    });

    res.status(201).json(timeEntry);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateTimeEntry = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const employeeId = req.user?.id;
    const role = req.user?.role;
    if (!employeeId) return res.status(401).json({ message: 'Unauthorized' });
    const updates = req.body;

    const entry = await prisma.timeEntry.findUnique({ where: { id } });

    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    // Protection: Locked entries cannot be edited by employees
    if (entry.isLocked && role === 'EMPLOYEE') {
      return res.status(403).json({ message: 'Approved entries are locked and cannot be edited.' });
    }

    // Recompute duration if start/end times change
    if (updates.startTime || updates.endTime) {
      const start = new Date(updates.startTime || entry.startTime);
      const end = new Date(updates.endTime || entry.endTime);
      const newDuration = differenceInMinutes(end, start);
      if (newDuration <= 0) {
        return res.status(400).json({ message: 'End time must be after start time.' });
      }
      updates.durationMinutes = newDuration;
    }

    const updatedEntry = await prisma.timeEntry.update({
      where: { id },
      data: updates
    });

    // Audit log if admin edits
    if (role !== 'EMPLOYEE') {
      await prisma.activityLog.create({
        data: {
          type: 'TIMESHEET_EDITED',
          message: `Timesheet entry ${id} edited by admin ${employeeId}`,
          entityType: 'TimeEntry',
          entityId: id as string,
          userId: employeeId
        }
      });
    }

    res.json(updatedEntry);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteTimeEntry = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const employeeId = req.user?.id;
    const role = req.user?.role;
    if (!employeeId) return res.status(401).json({ message: 'Unauthorized' });

    const entry = await prisma.timeEntry.findUnique({ where: { id } });

    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    const isOwner = entry.employeeId === employeeId;
    const isAdmin = ['ADMIN', 'MANAGER', 'PROJECT_MANAGER'].includes(role || '');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You can only delete your own entries.' });
    }

    if (entry.isLocked && !isAdmin) {
      return res.status(403).json({ message: 'Approved entries are locked and cannot be deleted.' });
    }

    await prisma.timeEntry.delete({ where: { id } });

    res.json({ success: true, id });
  } catch (error) {
    console.error('Delete Time Entry Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMyTimesheets = async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.user?.id;
    if (!employeeId) return res.status(401).json({ message: 'Unauthorized' });
    const month = req.query.month as string;
    const year = req.query.year as string;

    let where: any = { employeeId };

    if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0);
      where.date = {
        gte: startDate,
        lte: endDate
      };
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        project: { select: { name: true, projectId: true } },
        task: { select: { title: true, taskId: true } }
      },
      orderBy: { date: 'desc' }
    });

    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAdminOverview = async (req: Request, res: Response) => {
  try {
    const month = req.query.month ? Number(req.query.month) : new Date().getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const entries = await prisma.timeEntry.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        status: 'APPROVED'
      }
    }) as any[];

    const pendingCount = await prisma.timeEntry.count({
      where: { status: 'SUBMITTED' }
    });

    const totalMinutes = entries.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
    const billableMinutes = entries.filter(e => e.isBillable).reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);

    res.json({
      totalHours: (totalMinutes / 60).toFixed(2),
      billableHours: (billableMinutes / 60).toFixed(2),
      pendingApprovals: pendingCount,
      totalEntries: entries.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAdminEntries = async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const employeeIdQuery = req.query.employeeId as string;
    const projectIdQuery = req.query.projectId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    let where: any = {};
    if (status) where.status = status;
    if (employeeIdQuery) where.employeeId = employeeIdQuery;
    if (projectIdQuery) where.projectId = projectIdQuery;
    if (startDate && endDate) {
      where.date = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        employee: { select: { name: true, employeeId: true } },
        project: { select: { name: true, projectId: true } },
        task: { select: { title: true, taskId: true } }
      },
      orderBy: { date: 'desc' }
    }) as any[];

    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const approveEntry = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const adminId = req.user?.id;
    if (!adminId) return res.status(401).json({ message: 'Unauthorized' });

    const entry = await prisma.timeEntry.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: adminId,
        approvedAt: new Date(),
        isLocked: true
      }
    });

    // Audit log
    await prisma.activityLog.create({
      data: {
        type: 'TIMESHEET_APPROVED',
        message: `Timesheet entry ${id} approved by admin ${adminId}`,
        entityType: 'TimeEntry',
        entityId: id,
        userId: adminId
      }
    });

    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const rejectEntry = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;

    const entry = await prisma.timeEntry.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        isLocked: false
      }
    });

    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getProjectTimesheets = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, employeeId, taskId } = req.query;

    let where: any = { projectId: id };
    if (status) where.status = status as string;
    if (employeeId) where.employeeId = employeeId as string;
    if (taskId) where.taskId = taskId as string;

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        employee: { select: { name: true, employeeId: true, designation: true } },
        task: { select: { title: true, taskId: true } }
      },
      orderBy: { date: 'desc' }
    }) as any[];

    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getProjectTimeSummary = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const entries = await prisma.timeEntry.findMany({
      where: { projectId: id as string, status: 'APPROVED' },
      include: {
        employee: { select: { name: true } },
        task: { select: { title: true } }
      }
    }) as any[];

    const totalMinutes = entries.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);

    // Member-wise breakdown
    const memberSummary: Record<string, number> = {};
    entries.forEach(entry => {
      const name = entry.employee.name;
      memberSummary[name] = (memberSummary[name] || 0) + (entry.durationMinutes || 0);
    });

    // Task-wise breakdown
    const taskSummary: Record<string, number> = {};
    entries.forEach(entry => {
      const title = entry.task?.title || 'Unknown Task';
      taskSummary[title] = (taskSummary[title] || 0) + (entry.durationMinutes || 0);
    });

    res.json({
      totalHours: (totalMinutes / 60).toFixed(2),
      memberBreakdown: Object.entries(memberSummary).map(([name, mins]) => ({ name, hours: (mins / 60).toFixed(2) })),
      taskBreakdown: Object.entries(taskSummary).map(([title, mins]) => ({ title, hours: (mins / 60).toFixed(2) }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getProjectAnalytics = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        milestones: true,
        tasks: { include: { timeEntries: { where: { status: 'APPROVED' } } } }
      }
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });

    const totalMinutes = (project as any).tasks.reduce((acc: number, task: any) => {
      return acc + task.timeEntries.reduce((tAcc: number, entry: any) => tAcc + (entry.durationMinutes || 0), 0);
    }, 0);

    const billableMinutes = (project as any).tasks.reduce((acc: number, task: any) => {
      return acc + task.timeEntries.filter((e: any) => e.isBillable).reduce((tAcc: number, entry: any) => tAcc + (entry.durationMinutes || 0), 0);
    }, 0);

    res.json({
      totalHours: (totalMinutes / 60).toFixed(2),
      billableHours: (billableMinutes / 60).toFixed(2),
      productivity: totalMinutes > 0 ? ((billableMinutes / totalMinutes) * 100).toFixed(2) : 0,
      milestoneProgress: (project as any).milestones.length,
      taskCount: (project as any).tasks.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTeamAnalytics = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    const entries = await prisma.timeEntry.findMany({
      where: {
        status: 'APPROVED',
        date: {
          gte: startDate ? new Date(startDate as string) : undefined,
          lte: endDate ? new Date(endDate as string) : undefined
        }
      },
      include: { employee: { select: { name: true, employeeId: true } } }
    });

    const employeeStats: Record<string, any> = {};
    entries.forEach((entry: any) => {
      const id = entry.employeeId;
      if (!employeeStats[id]) {
        employeeStats[id] = { name: entry.employee.name, employeeId: entry.employee.employeeId, totalMinutes: 0, billableMinutes: 0 };
      }
      employeeStats[id].totalMinutes += (entry.durationMinutes || 0);
      if (entry.isBillable) employeeStats[id].billableMinutes += (entry.durationMinutes || 0);
    });

    res.json(Object.values(employeeStats).map((s: any) => ({
      ...s,
      totalHours: (s.totalMinutes / 60).toFixed(2),
      billableHours: (s.billableMinutes / 60).toFixed(2)
    })));
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAttendanceVsTracked = async (req: Request, res: Response) => {
  try {
    const employeeIdQuery = req.query.employeeId as string;
    const dateQuery = req.query.date as string;
    if (!employeeIdQuery || !dateQuery) {
      return res.status(400).json({ message: 'EmployeeId and Date are required.' });
    }

    const queryDate = new Date(dateQuery);
    const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

    const attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employeeIdQuery,
          date: startOfDay
        }
      }
    });

    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        employeeId: employeeIdQuery,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    const trackedMinutes = timeEntries.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
    const attendanceHours = attendance?.totalHours || 0;
    const trackedHours = Number((trackedMinutes / 60).toFixed(2));
    const idleHours = Math.max(0, attendanceHours - trackedHours);

    res.json({
      date: startOfDay,
      attendanceHours,
      trackedHours,
      idleHours,
      punchIn: attendance?.punchIn,
      punchOut: attendance?.punchOut,
      status: attendance?.status
    });
  } catch (error) {
    console.error('Attendance Comparison Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
