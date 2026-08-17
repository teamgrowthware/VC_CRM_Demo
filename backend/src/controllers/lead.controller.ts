import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getAllLeads = async (req: Request, res: Response) => {
  try {
    const leads = await prisma.lead.findMany({
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leads', error });
  }
};

export const getLeadById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: id as string },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching lead', error });
  }
};

export const createLead = async (req: Request, res: Response) => {
  const { name, email, phone, source, status, assignedId, notes } = req.body;
  try {
    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        phone,
        source,
        status,
        assignedId: assignedId || null,
        notes,
      },
    });
    res.status(201).json(lead);
  } catch (error) {
    res.status(500).json({ message: 'Error creating lead', error });
  }
};

export const updateLead = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, phone, source, status, assignedId, notes } = req.body;
  try {
    const lead = await prisma.lead.update({
      where: { id: id as string },
      data: {
        name,
        email,
        phone,
        source,
        status,
        assignedId: assignedId || null,
        notes,
      },
    });
    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: 'Error updating lead', error });
  }
};

export const deleteLead = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.lead.delete({
      where: { id: id as string },
    });
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting lead', error });
  }
};
