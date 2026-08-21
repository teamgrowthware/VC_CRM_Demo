import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { createNotification } from '../services/notification.service';
import { logActivity } from '../services/activity.service';

interface AuthRequest extends Request {
  user?: any;
}

export const applyLeave = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let employeeId = req.user.id;
    const { leaveType, startDate, endDate, numberOfDays, reason, employeeId: targetEmployeeId } = req.body;

    // Allow Admins and HR to apply leave on behalf of other employees
    if (targetEmployeeId && (req.user.role === 'ADMIN' || req.user.role === 'HR')) {
      employeeId = targetEmployeeId;
    }

    const leave = await prisma.leave.create({
      data: {
        employeeId,
        leaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        numberOfDays,
        reason,
        status: 'PENDING',
      },
    });

    await logActivity(
      employeeId,
      'LEAVE_REQUESTED',
      `requested leave for ${numberOfDays} days (${leaveType})`,
      'LEAVE',
      leave.id
    );

    res.status(201).json({ message: 'Leave application submitted successfully', leave });
  } catch (error) {
    console.error('Apply leave error:', error);
    res.status(500).json({ error: 'Failed to submit leave application' });
  }
};

export const getMyLeaves = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.user.id;
    const leaves = await prisma.leave.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(leaves);
  } catch (error) {
    console.error('Get my leaves error:', error);
    res.status(500).json({ error: 'Failed to fetch leave history' });
  }
};

export const getAllLeaves = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    const fullUser = await prisma.employee.findUnique({ where: { id: user.id } });
    if (!fullUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    let whereClause: any = {};

    if (fullUser.role === 'PROJECT_MANAGER') {
      const managedProjects = await prisma.project.findMany({
        where: { managerId: fullUser.id },
        include: { members: true },
      });
      const teamIds = new Set<string>();
      teamIds.add(fullUser.id);
      managedProjects.forEach(p => {
        p.members.forEach((m: any) => teamIds.add(m.employeeId));
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

    const leaves = await prisma.leave.findMany({
      where: whereClause,
      include: { employee: { select: { name: true, employeeId: true, department: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(leaves);
  } catch (error) {
    console.error('Get all leaves error:', error);
    res.status(500).json({ error: 'Failed to fetch leave applications' });
  }
};

export const markLeaveAsPaid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { isPaid } = req.body;

    if (typeof isPaid !== 'boolean') {
      res.status(400).json({ error: 'isPaid must be a boolean' });
      return;
    }

    const existingLeave = await prisma.leave.findUnique({ where: { id } });
    if (!existingLeave) {
      res.status(404).json({ error: 'Leave not found' });
      return;
    }

    if (existingLeave.status !== 'APPROVED') {
      res.status(400).json({ error: 'Only approved leaves can be marked as paid/unpaid' });
      return;
    }

    const user = req.user;
    if (!['ADMIN', 'HR'].includes(user.role)) {
      res.status(403).json({ error: 'Only Admin or HR can mark leaves as paid' });
      return;
    }

    const updatedLeave = await prisma.leave.update({
      where: { id },
      data: { isPaid },
    });

    await logActivity(
      user.id,
      isPaid ? 'LEAVE_MARKED_PAID' : 'LEAVE_MARKED_UNPAID',
      `${isPaid ? 'marked' : 'unmarked'} leave as paid for employee ${existingLeave.employeeId}`,
      'LEAVE',
      id
    );

    res.status(200).json({
      message: `Leave ${isPaid ? 'marked as paid' : 'marked as unpaid'}`,
      leave: updatedLeave,
    });
  } catch (error) {
    console.error('Mark leave as paid error:', error);
    res.status(500).json({ error: 'Failed to update leave payment status' });
  }
};

export const updateLeaveStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status } = req.body; // APPROVED, REJECTED

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({ error: 'Invalid leave status' });
      return;
    }

    const existingLeave = await prisma.leave.findUnique({ where: { id } });
    if (!existingLeave) {
      res.status(404).json({ error: 'Leave not found' });
      return;
    }

    const user = req.user;
    if (!['ADMIN', 'HR'].includes(user.role)) {
      const fullUser = await prisma.employee.findUnique({ where: { id: user.id } });
      let allowed = false;
      if (fullUser?.role === 'PROJECT_MANAGER') {
        const managedProjects = await prisma.project.findMany({
          where: { managerId: fullUser.id },
          include: { members: true },
        });
        const teamIds = new Set<string>([fullUser.id]);
        managedProjects.forEach(p => {
          p.members.forEach((m: any) => teamIds.add(m.employeeId));
        });
        allowed = teamIds.has(existingLeave.employeeId);
      } else if (fullUser?.role === 'MANAGER') {
        if (!fullUser.departmentId) {
          allowed = true;
        } else {
          const target = await prisma.employee.findUnique({
            where: { id: existingLeave.employeeId },
            select: { departmentId: true },
          });
          allowed = !!target && target.departmentId === fullUser.departmentId;
        }
      }
      if (!allowed) {
        res.status(403).json({ error: "You can only manage your team members' leaves" });
        return;
      }
    }

    const updatedLeave = await prisma.leave.update({
      where: { id },
      data: { status },
    });

    if (status === 'APPROVED') {
      await createNotification(
        updatedLeave.employeeId,
        'LEAVE_APPROVED' as any,
        `Your leave request from ${new Date(updatedLeave.startDate).toLocaleDateString()} has been APPROVED.`,
        '/dashboard/leaves'
      );

      await logActivity(
        (req as any).user.id,
        'LEAVE_APPROVED',
        `approved leave for ${updatedLeave.id}`,
        'LEAVE',
        updatedLeave.id
      );
    }

    if (status === 'REJECTED') {
      await createNotification(
        updatedLeave.employeeId,
        'LEAVE_REJECTED' as any,
        `Your leave request from ${new Date(updatedLeave.startDate).toLocaleDateString()} has been REJECTED.`,
        '/dashboard/leaves'
      );

      await logActivity(
        (req as any).user.id,
        'LEAVE_REJECTED',
        `rejected leave for ${updatedLeave.id}`,
        'LEAVE',
        updatedLeave.id
      );
    }

    res.status(200).json({ message: `Leave status updated to ${status}`, leave: updatedLeave });
  } catch (error) {
    console.error('Update leave status error:', error);
    res.status(500).json({ error: 'Failed to update leave status' });
  }
};
