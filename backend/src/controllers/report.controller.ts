import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

interface AuthRequest extends Request {
  user?: any;
}

import { getShiftBounds } from '../lib/date-utils';


const sodSchema = z.object({
  sodText: z.string().min(5, "SOD description is required")
});

const eodSchema = z.object({
  eodText: z.string().min(5, "EOD description is required"),
  tasksCompleted: z.string().optional(),
  blockers: z.string().optional()
});

export const createSODReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.user.id;
    const validation = sodSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.format() });
      return;
    }

    const shiftStart = getShiftBounds(new Date());
    const shiftEnd = new Date(shiftStart.getTime() + 24 * 60 * 60 * 1000 - 1);


    // Ensure punched in
    const attendance = await prisma.attendance.findFirst({
       where: {
         employeeId,
         date: { gte: shiftStart, lte: shiftEnd },
         punchIn: { not: null }
       }
    });

    if (!attendance) {
      res.status(400).json({ error: 'You must Punch-In before submitting an SOD report.' });
      return;
    }

    // Ensure haven't already submitted
    const existing = await prisma.dailyReport.findFirst({
        where: { employeeId, date: { gte: shiftStart, lte: shiftEnd } }
    });

    if (existing) {
        res.status(400).json({ error: 'SOD already submitted today.' });
        return;
    }

    const report = await prisma.dailyReport.create({
      data: {
        employeeId,
        date: shiftStart,
        sodText: validation.data.sodText,
      }
    });

    res.status(201).json({ message: 'SOD submitted successfully', report });
  } catch (error) {
    console.error('Create SOD error:', error);
    res.status(500).json({ error: 'Failed to submit SOD report' });
  }
};

export const submitEODReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.user.id;
    const { id } = req.params;

    const validation = eodSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.format() });
      return;
    }

    const report = await prisma.dailyReport.findUnique({ where: { id: id as string } });
    if (!report || report.employeeId !== employeeId) {
       res.status(404).json({ error: 'Report not found' });
       return;
    }

    const shiftStart = getShiftBounds(new Date());
    const attendance = await prisma.attendance.findFirst({
       where: {
         employeeId,
         date: { gte: shiftStart }
       }
    });

    // NOTE: Removed literal block preventing EOD after punch out. 
    // EOD is now intrinsically valid if attendance logic applies locally.

    const updated = await prisma.dailyReport.update({
       where: { id: id as string },
       data: {
         eodText: validation.data.eodText,
         tasksCompleted: validation.data.tasksCompleted || null,
         blockers: validation.data.blockers || null
       }
    });

    res.status(200).json({ message: 'EOD submitted successfully', report: updated });
  } catch (error) {
    console.error('Submit EOD error:', error);
    res.status(500).json({ error: 'Failed to submit EOD report' });
  }
};

export const getEmployeeReports = async (req: AuthRequest, res: Response): Promise<void> => {
   try {
      const employeeId = req.user.id;
      const reports = await prisma.dailyReport.findMany({
         where: { employeeId },
         orderBy: { date: 'desc' },
         take: 30
      });
      res.status(200).json(reports);
   } catch (error) {
     console.error('Get employee reports error:', error);
     res.status(500).json({ error: 'Failed to fetch reports' });
   }
};

export const getReportsByDate = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { date } = req.params;
        const queryDate = new Date(date as string);
        const start = getShiftBounds(queryDate);
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);


        const reports = await prisma.dailyReport.findMany({
           where: { date: { gte: start, lte: end } },
           include: {
               employee: { select: { name: true, employeeId: true, department: true } }
           }
        });
        res.status(200).json(reports);
    } catch (e) {
        console.error('Get reports by date error:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const getTeamReports = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = req.user;
        const fullUser = await prisma.employee.findUnique({ where: { id: user.id } });
        if (!fullUser) { res.status(404).json({ error: 'User not found' }); return; }
        
        let whereClause: any = {};
        
        if (fullUser.role === 'PROJECT_MANAGER') {
            const managedProjects = await prisma.project.findMany({
                where: { managerId: fullUser.id },
                include: { members: true }
            });
            const teamIds = new Set<string>();
            teamIds.add(fullUser.id); // Include themselves
            managedProjects.forEach(p => {
                p.members.forEach(m => teamIds.add(m.employeeId));
            });
            whereClause = { employeeId: { in: Array.from(teamIds) } };
        } else if (fullUser.role === 'MANAGER' && fullUser.departmentId) {
            whereClause = { employee: { departmentId: fullUser.departmentId } };
        } else if (fullUser.role === 'ADMIN' || fullUser.role === 'HR') {
            whereClause = {};
        } else {
            res.status(403).json({ error: 'Unauthorized' });
            return;
        }

        const reports = await prisma.dailyReport.findMany({
            where: whereClause,
            include: {
               employee: { select: { name: true, employeeId: true, department: true } }
            },
            orderBy: { date: 'desc' },
            take: 100
        });

        res.status(200).json(reports);
    } catch (e) {
        console.error('Get team reports error', e);
        res.status(500).json({ error: 'Failed to fetch team reports' });
    }
}
