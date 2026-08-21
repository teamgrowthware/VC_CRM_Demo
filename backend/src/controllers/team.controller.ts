import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';
import { logActivity } from '../services/activity.service';

interface AuthRequest extends Request {
  user?: any;
}

const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  description: z.string().optional(),
});

export const getTeams = async (_req: Request, res: Response): Promise<void> => {
  try {
    const teams = await prisma.team.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { projects: true, members: true } },
        members: {
          include: {
            employee: { select: { id: true, name: true, email: true, avatarUrl: true, designation: true } }
          }
        }
      },
    });
    res.status(200).json({ success: true, data: teams });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch teams' });
  }
};

export const createTeam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = teamSchema.parse(req.body);

    const existing = await prisma.team.findUnique({ where: { name: data.name } });
    if (existing) {
      res.status(400).json({ success: false, message: 'A team with this name already exists' });
      return;
    }

    const team = await prisma.team.create({ data });
    res.status(201).json({ success: true, data: team });
  } catch (error) {
    console.error('Create team error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: error.issues });
    } else {
      res.status(500).json({ success: false, message: 'Failed to create team' });
    }
  }
};

export const updateTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const data = teamSchema.partial().parse(req.body);

    const team = await prisma.team.update({
      where: { id },
      data,
    });

    res.status(200).json({ success: true, data: team });
  } catch (error) {
    console.error('Update team error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: error.issues });
    } else {
      res.status(500).json({ success: false, message: 'Failed to update team' });
    }
  }
};

export const deleteTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);

    const projectCount = await prisma.project.count({ where: { teamId: id } });
    if (projectCount > 0) {
      res.status(400).json({ success: false, message: `Cannot delete team: ${projectCount} project(s) are assigned to it` });
      return;
    }

    await prisma.teamMember.deleteMany({ where: { teamId: id } });
    await prisma.team.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete team' });
  }
};

export const addTeamMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teamId = String(req.params.id);
    const { employeeIds } = req.body;

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      res.status(400).json({ success: false, message: 'employeeIds array is required' });
      return;
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      res.status(404).json({ success: false, message: 'Team not found' });
      return;
    }

    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds }, status: 'ACTIVE' },
      select: { id: true, name: true }
    });

    if (employees.length === 0) {
      res.status(400).json({ success: false, message: 'No valid active employees found' });
      return;
    }

    const result = await prisma.teamMember.createMany({
      data: employees.map(emp => ({ teamId, employeeId: emp.id })),
      skipDuplicates: true
    });

    if (req.user?.id) {
      await logActivity(
        req.user.id,
        'TEAM_MEMBERS_ADDED',
        `added ${result.count} member(s) to team: ${team.name}`,
        'SYSTEM',
        teamId
      );
    }

    res.status(201).json({ success: true, message: `${result.count} member(s) added to team`, data: { count: result.count } });
  } catch (error) {
    console.error('Add team members error:', error);
    res.status(500).json({ success: false, message: 'Failed to add team members' });
  }
};

export const removeTeamMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teamId = String(req.params.id);
    const employeeId = String(req.params.employeeId);

    const member = await prisma.teamMember.findUnique({
      where: { teamId_employeeId: { teamId, employeeId } }
    });

    if (!member) {
      res.status(404).json({ success: false, message: 'Member not found in this team' });
      return;
    }

    await prisma.teamMember.delete({ where: { id: member.id } });
    res.status(200).json({ success: true, message: 'Member removed from team' });
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove team member' });
  }
};
