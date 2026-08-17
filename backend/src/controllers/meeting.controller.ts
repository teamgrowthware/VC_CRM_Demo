import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getAllMeetings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const meetings = await (prisma as any).meeting.findMany({
      where: {
        OR: [
          { participants: { some: { id: userId } } },
          { projectId: { not: null } } // Show project meetings to everyone for visibility
        ]
      },
      include: {
        project: { select: { id: true, name: true } },
        participants: { select: { id: true, name: true } }
      },
      orderBy: { startTime: 'asc' }
    });
    res.json(meetings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching meetings', error });
  }
};

export const createMeeting = async (req: Request, res: Response) => {
  const { title, startTime, endTime, location, projectId, meetingUrl, participantIds } = req.body;
  try {
    const meeting = await (prisma as any).meeting.create({
      data: {
        title,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        projectId: projectId || null,
        meetingUrl,
        participants: {
          connect: participantIds?.map((id: string) => ({ id })) || []
        }
      },
      include: {
        participants: true
      }
    });
    res.status(201).json(meeting);
  } catch (error) {
    res.status(500).json({ message: 'Error creating meeting', error });
  }
};

export const getCalendarEvents = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    // Fetch Meetings
    const meetings = await (prisma as any).meeting.findMany({
      where: { participants: { some: { id: userId } } }
    });

    // Fetch Task Deadlines
    const tasks = await (prisma as any).task.findMany({
      where: { 
        assignedId: userId,
        dueDate: { not: null },
        status: { not: 'COMPLETED' }
      },
      include: { project: true }
    });

    // Fetch Project Deadlines
    const projects = await (prisma as any).project.findMany({
      where: { members: { some: { id: userId } }, deadline: { not: null } }
    });

    const events = [
      ...meetings.map((m: any) => ({
        id: m.id,
        title: m.title,
        start: m.startTime,
        end: m.endTime,
        type: 'MEETING',
        color: '#8b5cf6' // Purple
      })),
      ...tasks.map((t: any) => ({
        id: t.id,
        title: `Task: ${t.title}`,
        start: t.dueDate,
        end: t.dueDate,
        type: 'TASK',
        color: '#f59e0b' // Amber
      })),
      ...projects.map((p: any) => ({
        id: p.id,
        title: `Project: ${p.name} Deadline`,
        start: p.deadline,
        end: p.deadline,
        type: 'PROJECT',
        color: '#ef4444' // Red
      }))
    ];

    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching calendar events', error });
  }
};
