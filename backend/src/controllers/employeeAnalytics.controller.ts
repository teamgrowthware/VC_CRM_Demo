import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getEmployeeProfile = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const profile = await prisma.employee.findUnique({
      where: { id },
      select: {
         id: true,
         employeeId: true,
         name: true,
         email: true,
         phone: true,
         role: true,
         status: true,
         joiningDate: true,
         department: { select: { name: true } },
         designation: true,
      }
    });

    if (!profile) return res.status(404).json({ error: 'Employee not found' });
    res.json(profile);
  } catch (error) {
    console.error('getEmployeeProfile Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getEmployeeAttendanceStats = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const totalWorkingDays = await prisma.attendance.count({ where: { employeeId: id } });
    const presentDays = await prisma.attendance.count({ where: { employeeId: id, status: 'PRESENT' } });
    // Getting trend for a simple chart
    const recentAttendance = await prisma.attendance.findMany({
       where: { employeeId: id },
       orderBy: { date: 'desc' },
       take: 14 // last two weeks
    });

    res.json({
       totalWorkingDays,
       presentDays,
       recentAttendance: recentAttendance.reverse() // Chronological for graph
    });

  } catch (error) {
    console.error('getEmployeeAttendanceStats Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getEmployeeTaskStats = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    
    // Using Promise.all for internal queries can be faster, but let's be safe
    const [total, completed, pending, overdue] = await Promise.all([
      prisma.task.count({ where: { assignedId: id } }),
      prisma.task.count({ where: { assignedId: id, status: 'COMPLETED' } }),
      prisma.task.count({ where: { assignedId: id, status: { in: ['TODO', 'IN_PROGRESS', 'TESTING'] } } }),
      prisma.task.count({ 
        where: { 
          assignedId: id, 
          deadline: { lt: new Date() },
          status: { notIn: ['COMPLETED'] }
        } 
      }).catch(err => {
        console.warn('Overdue count failed:', err.message);
        return 0;
      })
    ]);

    const recentTasks = await prisma.task.findMany({
      where: { assignedId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        project: { select: { name: true } }
      }
    }).catch(err => {
      console.warn('Recent tasks fetch failed:', err.message);
      return [];
    });

    res.json({ total, completed, pending, overdue, recentTasks });
  } catch (error: any) {
    console.error('getEmployeeTaskStats Error:', error);
    // If the whole thing fails, return empty stats rather than 500
    res.json({ total: 0, completed: 0, pending: 0, overdue: 0, recentTasks: [], error: 'Failed to fetch employee task stats' });
  }
};

export const getEmployeeProjectStats = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    
    // Wrapped in Promise.all for efficiency
    const [projects, total, active, completed] = await Promise.all([
      prisma.project.findMany({
        where: {
          OR: [
            { managerId: id },
            { members: { some: { employeeId: id } } }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.project.count({
        where: {
          OR: [
            { managerId: id },
            { members: { some: { employeeId: id } } }
          ]
        }
      }),
      prisma.project.count({
        where: {
          status: { in: ['ACTIVE', 'PLANNING'] },
          OR: [
            { managerId: id },
            { members: { some: { employeeId: id } } }
          ]
        }
      }),
      prisma.project.count({
        where: {
          status: 'COMPLETED',
          OR: [
            { managerId: id },
            { members: { some: { employeeId: id } } }
          ]
        }
      })
    ]);

    res.json({ total, active, completed, recentProjects: projects });
  } catch (error: any) {
    console.error('getEmployeeProjectStats Error:', error);
    res.json({ total: 0, active: 0, completed: 0, recentProjects: [], error: 'Failed to fetch employee project stats' });
  }
};

export const getEmployeeReportStats = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    
    const [reports, sodCount, eodCount, pendingEodCount] = await Promise.all([
      prisma.dailyReport.findMany({
        where: { employeeId: id },
        orderBy: { date: 'desc' },
        take: 14 // 2 weeks
      }),
      prisma.dailyReport.count({
        where: { employeeId: id, sodText: { not: '' } }
      }),
      prisma.dailyReport.count({
        where: { 
          employeeId: id, 
          eodText: { not: null } 
        }
      }),
      prisma.dailyReport.count({
        where: {
          employeeId: id,
          eodText: null
        }
      })
    ]);

    res.json({
      totalSOD: sodCount,
      totalEOD: eodCount,
      pendingEOD: pendingEodCount,
      recentReports: reports.reverse() // ascending for charts
    });
  } catch (error: any) {
    console.error('getEmployeeReportStats Error:', error);
    res.json({ totalSOD: 0, totalEOD: 0, pendingEOD: 0, recentReports: [], error: 'Failed to fetch employee report stats' });
  }
};
