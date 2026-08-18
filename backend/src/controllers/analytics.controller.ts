import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getShiftBounds, isWeekend } from '../lib/date-utils';

export const getEmployeeStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const total = await prisma.employee.count();
        const active = await prisma.employee.count({ where: { status: 'ACTIVE' } });
        
        const departments = await prisma.department.findMany({
            include: { _count: { select: { employees: true } } }
        });
        const byDepartment = departments.map(d => ({
             name: d.name,
             count: d._count.employees
        }));

        res.status(200).json({ total, active, byDepartment });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch employee stats' });
    }
};

export const getAttendanceStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const today = getShiftBounds();
        
        // Count statuses for the current shift
        const absentRecord = await prisma.attendance.count({ where: { date: today, status: 'ABSENT' }});
        const halfDay = await prisma.attendance.count({ where: { date: today, status: 'HALFDAY' }});
        const late = await prisma.attendance.count({ where: { date: today, status: 'LATE' }});
        const weekend = await prisma.attendance.count({ where: { date: today, status: 'WEEKEND' }});
        const weekendWork = await prisma.attendance.count({ where: { date: today, status: 'WEEKEND_WORK' }});
        
        // Present today = sum of all active checked-in presence statuses
        const present = await prisma.attendance.count({ 
            where: { 
                date: today,
                status: { in: ['PRESENT', 'HALFDAY', 'WEEKEND_WORK'] }
            } 
        });

        // Calculate virtual absence: Total Active Employees - Those with any recorded status today
        const totalActive = await prisma.employee.count({ where: { status: 'ACTIVE' } });
        const totalRecorded = await prisma.attendance.count({ 
            where: { 
                date: today,
                status: { in: ['PRESENT', 'HALFDAY', 'WEEKEND_WORK', 'ABSENT'] }
            } 
        });
        
        // Final absent count = those explicitly marked absent + active employees with no record at all today
        // However, if it's a weekend, we don't calculate virtual absence unless they are supposed to work.
        let absent = absentRecord;
        if (!isWeekend(today)) {
            absent += Math.max(0, totalActive - totalRecorded);
        }

        // Employees on approved leave covering today (distinct from absent/no-record)
        const onLeave = await prisma.leave.count({
            where: {
                status: 'APPROVED',
                startDate: { lte: today },
                endDate: { gte: today }
            }
        });

        const thirtyDaysAgo = getShiftBounds(new Date());
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const trendRaw = await prisma.attendance.groupBy({
            by: ['date', 'status'],
            where: { date: { gte: thirtyDaysAgo } },
            _count: { id: true },
            orderBy: { date: 'asc' }
        });
        
        res.status(200).json({ present, absent, halfDay, late, onLeave, weekend, weekendWork, trend: trendRaw });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch attendance stats' });
    }
};

export const getTaskStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const total = await prisma.task.count();
        const countsRaw = await prisma.task.groupBy({
           by: ['status'],
           _count: { id: true }
        });

        let completed = 0;
        let inProgress = 0;
        countsRaw.forEach(c => {
             if (c.status === 'COMPLETED') completed += c._count.id;
             if (c.status === 'IN_PROGRESS') inProgress += c._count.id;
        });
        
        const now = new Date();
        const overdue = await prisma.task.count({
           where: { deadline: { lt: now }, status: { not: 'COMPLETED' } }
        });

        // Top Performers Logic (extensible framework structure)
        const topPerformersRaw = await prisma.task.groupBy({
             by: ['assignedId'],
             where: { status: 'COMPLETED', assignedId: { not: null } },
             _count: { id: true },
             orderBy: { _count: { id: 'desc' } },
             take: 10
        });

        const employeeIds = topPerformersRaw.map(t => t.assignedId!).filter(id => id);
        const employees = await prisma.employee.findMany({
            where: { id: { in: employeeIds } },
            select: { id: true, name: true, department: { select: { name: true } } }
        });

        const topPerformers = topPerformersRaw.map(raw => {
             const emp = employees.find(e => e.id === raw.assignedId);
             return {
                 employeeId: emp?.id,
                 name: emp?.name,
                 department: emp?.department?.name || '-',
                 score: raw._count.id, // currently based purely on completed tasks sum
                 completedCount: raw._count.id
             };
        });
        
        res.status(200).json({ total, completed, inProgress, overdue, topPerformers });
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch task stats' });
    }
};

export const getProjectStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const total = await prisma.project.count();
        const active = await prisma.project.count({ where: { status: 'ACTIVE' } });
        const completed = await prisma.project.count({ where: { status: 'COMPLETED' } });
        
        const next14Days = new Date();
        next14Days.setDate(next14Days.getDate() + 14);
        const nearingDeadline = await prisma.project.findMany({
            where: { deadline: { lte: next14Days, gte: new Date() }, status: { not: 'COMPLETED' } },
            include: { manager: { select: { name: true } } }
        });
        
        res.status(200).json({ total, active, completed, nearingDeadline });
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch project stats' });
    }
};

export const getProductivityStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const today = getShiftBounds();
        
        const sods = await prisma.dailyReport.count({ where: { date: today } });
        const eods = await prisma.dailyReport.count({ where: { date: today, eodText: { not: null } } });
        
        const pendingEods = await prisma.dailyReport.findMany({
            where: { date: today, eodText: null },
            include: { employee: { select: { name: true, department: { select: { name: true } } } } }
        });
        
        // Rough average metrics can be evaluated here across time
        res.status(200).json({ sodsSubmitted: sods, eodsSubmitted: eods, pendingEods });
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch productivity stats' });
    }
};

export const getEfficiencyStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const today = getShiftBounds();
        
        const attendance = await prisma.attendance.findMany({
            where: { date: today, punchIn: { not: null } },
            select: { employeeId: true, totalHours: true, employee: { select: { name: true } } }
        });

        const efficiency = await Promise.all(attendance.map(async (record) => {
            const trackedMinutes = await prisma.timeEntry.aggregate({
                where: { employeeId: record.employeeId, date: today, status: 'APPROVED' },
                _sum: { durationMinutes: true }
            });

            const trackedHours = (trackedMinutes._sum.durationMinutes || 0) / 60;
            const attendanceHours = record.totalHours || 0;
            const missingHours = Math.max(0, attendanceHours - trackedHours);
            const efficiencyScore = attendanceHours > 0 ? (trackedHours / attendanceHours) * 100 : 0;

            return {
                name: record.employee.name,
                attendanceHours: Number(attendanceHours.toFixed(1)),
                trackedHours: Number(trackedHours.toFixed(1)),
                missingHours: Number(missingHours.toFixed(1)),
                efficiency: Number(efficiencyScore.toFixed(1))
            };
        }));

        res.status(200).json(efficiency);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch efficiency stats' });
    }
};

export const getTeamProductivity = async (req: Request, res: Response): Promise<void> => {
    try {
        const employees = await prisma.employee.findMany({
            where: { status: 'ACTIVE' },
            include: {
                tasks: true
            }
        });

        const now = new Date();

        const productivity = employees.map(emp => {
            const tasks = emp.tasks;
            const totalTasks = tasks.length;
            const completed = tasks.filter(t => t.status === 'COMPLETED').length;
            const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;
            
            const overdue = tasks.filter(t => 
                t.status !== 'COMPLETED' && 
                t.deadline && 
                new Date(t.deadline) < now
            ).length;

            const score = Math.round((completionRate * 0.6) - (overdue * 2));

            return {
                id: emp.id,
                name: emp.name,
                totalTasks,
                completed,
                completionRate,
                overdue,
                score
            };
        });

        res.status(200).json(productivity);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getProjectHealth = async (req: Request, res: Response): Promise<void> => {
    try {
        const tasks = await prisma.task.findMany();
        
        let onTime = 0;
        let late = 0;
        let pending = 0;

        tasks.forEach((task) => {
            if (task.status !== 'COMPLETED') {
                pending++;
            } else {
                if (task.completedAt && task.deadline) {
                    if (new Date(task.completedAt) <= new Date(task.deadline)) {
                        onTime++;
                    } else {
                        late++;
                    }
                } else {
                    onTime++;
                }
            }
        });

        res.status(200).json({ onTime, late, pending });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
