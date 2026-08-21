import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { logAudit } from '../lib/audit';
import { randomInt } from 'crypto';

interface AuthRequest extends Request {
  user?: any;
}

const sanitizeClient = (client: any) => {
  if (!client) return null;
  const { password, ...safe } = client;
  return safe;
};

const generateClientId = async (): Promise<string> => {
  return `CL${randomInt(100000, 1000000)}`;
};

const projectProgress = (tasks: { status: string }[]) => {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
  return total ? Math.round((completed / total) * 100) : 0;
};

const groupMemberInclude = {
  employee: { select: { name: true, employeeId: true } },
  client: { select: { name: true, clientId: true, company: true } },
};

// Auto-create (or reuse) a GROUP chat room for a client + project containing
// the client, the project manager and all project members.
const ensureProjectGroupRoom = async (clientId: string, project: any) => {
  const groupName = `${project.name} · Client Chat`;
  const existing = await prisma.chatRoom.findFirst({
    where: {
      type: 'GROUP',
      isDeleted: false,
      name: groupName,
      members: { some: { clientId } },
    },
  });
  if (existing) return existing;

  const memberRows: any[] = [{ clientId, isAdmin: false }];
  const employeeIds = new Set<string>([project.managerId]);
  (project.members || []).forEach((m: any) => employeeIds.add(m.employeeId));
  employeeIds.forEach((eid) => memberRows.push({ employeeId: eid, isAdmin: eid === project.managerId }));

  return prisma.chatRoom.create({
    data: {
      name: groupName,
      description: `Client communication room for ${project.name}`,
      type: 'GROUP',
      createdBy: project.managerId,
      members: { create: memberRows },
    },
    include: { members: { include: groupMemberInclude } },
  });
};

// ---------------------------------------------------------------------------
// Management (ADMIN / HR)
// ---------------------------------------------------------------------------

const createClientSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const createClient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validatedData = createClientSchema.parse(req.body);
    const { name, phone, company, password } = validatedData;
    const email = validatedData.email?.toLowerCase().trim() || null;

    if (email) {
      const existing = await prisma.client.findUnique({ where: { email } });
      if (existing) {
        res.status(400).json({ success: false, message: 'A client with this email already exists' });
        return;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let client;
    let clientId = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      clientId = await generateClientId();
      try {
        client = await prisma.client.create({
          data: {
            clientId,
            name,
            email,
            phone,
            company,
            password: hashedPassword,
          },
        });
        break;
      } catch (error: any) {
        const target = error?.meta?.target;
        const isClientIdCollision = Array.isArray(target) ? target.includes('clientId') : target === 'clientId';
        if (error?.code !== 'P2002' || !isClientIdCollision || attempt === 4) throw error;
      }
    }

    if (!client) throw new Error('Failed to generate a unique client ID');

    await logAudit({
      userId: req.user?.id,
      action: 'CLIENT_CREATED',
      message: `${req.user?.name || 'Admin'} created client ${name} (${clientId})`,
      entityType: 'CLIENT',
      entityId: client.id,
    });

    res.status(201).json({ success: true, message: 'Client created successfully', data: sanitizeClient(client) });
  } catch (error) {
    console.error('Create client error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: error.issues });
    } else {
      res.status(500).json({ success: false, message: 'Failed to create client' });
    }
  }
};

export const listClients = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        projects: { select: { id: true, name: true, projectId: true, status: true } },
      },
    });
    res.status(200).json({ success: true, data: clients.map(sanitizeClient) });
  } catch (error) {
    console.error('List clients error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch clients' });
  }
};

export const getClient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        projects: {
          include: {
            manager: { select: { id: true, name: true, designation: true } },
            members: { include: { employee: { select: { id: true, name: true, designation: true } } } },
            tasks: { select: { id: true, status: true, title: true } },
            milestones: { select: { id: true, title: true, status: true } },
          },
        },
      },
    });

    if (!client) {
      res.status(404).json({ success: false, message: 'Client not found' });
      return;
    }

    const safe = sanitizeClient(client);
    safe.projects = safe.projects.map((p: any) => ({
      ...p,
      progress: projectProgress(p.tasks),
      taskCounts: {
        total: p.tasks.length,
        completed: p.tasks.filter((t: any) => t.status === 'COMPLETED').length,
        inProgress: p.tasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
        testing: p.tasks.filter((t: any) => t.status === 'TESTING').length,
        todo: p.tasks.filter((t: any) => t.status === 'TODO').length,
      },
    }));

    res.status(200).json({ success: true, data: safe });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch client' });
  }
};

const updateClientSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  password: z.string().min(6).optional(),
});

export const updateClient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validatedData = updateClientSchema.parse(req.body);
    const { password, ...rest } = validatedData;

    const data: any = { ...rest };
    if (data.email === '') data.email = null;
    if (rest.email) data.email = rest.email.toLowerCase().trim();
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const id = String(req.params.id);
    const client = await prisma.client.update({
      where: { id },
      data,
    });

    res.status(200).json({ success: true, message: 'Client updated successfully', data: sanitizeClient(client) });
  } catch (error) {
    console.error('Update client error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: error.issues });
    } else {
      res.status(500).json({ success: false, message: 'Failed to update client' });
    }
  }
};

export const deleteClient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.client.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete client' });
  }
};

export const assignProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const projectId = String(req.params.projectId);

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) {
      res.status(404).json({ success: false, message: 'Client not found' });
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { clientId: id },
    });

    const groupRoom = await ensureProjectGroupRoom(id, project);

    await logAudit({
      userId: req.user?.id,
      action: 'CLIENT_PROJECT_ASSIGNED',
      message: `${req.user?.name || 'Admin'} assigned project ${project.name} to client ${client.name}`,
      entityType: 'CLIENT',
      entityId: client.id,
    });

    res.status(200).json({ success: true, message: 'Project assigned successfully', groupRoom });
  } catch (error) {
    console.error('Assign project error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign project' });
  }
};

export const unassignProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const projectId = String(req.params.projectId);

    await prisma.project.update({
      where: { id: projectId },
      data: { clientId: null },
    });

    res.status(200).json({ success: true, message: 'Project unassigned successfully' });
  } catch (error) {
    console.error('Unassign project error:', error);
    res.status(500).json({ success: false, message: 'Failed to unassign project' });
  }
};

// ---------------------------------------------------------------------------
// Client portal (CLIENT)
// ---------------------------------------------------------------------------

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const client = await prisma.client.findUnique({ where: { id: req.user?.id } });
    if (!client) {
      res.status(404).json({ success: false, message: 'Client not found' });
      return;
    }
    res.status(200).json({ success: true, data: sanitizeClient(client) });
  } catch (error) {
    console.error('Get client me error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch client' });
  }
};

const buildProjectView = (p: any) => {
  const team = [
    {
      id: p.manager.id,
      name: p.manager.name,
      designation: p.manager.designation,
      role: 'PROJECT_MANAGER',
    },
    ...p.members.map((m: any) => ({
      id: m.employee.id,
      name: m.employee.name,
      designation: m.employee.designation,
      role: m.role,
    })),
  ];

  return {
    id: p.id,
    projectId: p.projectId,
    name: p.name,
    description: p.description,
    status: p.status,
    startDate: p.startDate,
    deadline: p.deadline,
    progress: projectProgress(p.tasks),
    taskCounts: {
      total: p.tasks.length,
      completed: p.tasks.filter((t: any) => t.status === 'COMPLETED').length,
      inProgress: p.tasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
      testing: p.tasks.filter((t: any) => t.status === 'TESTING').length,
      todo: p.tasks.filter((t: any) => t.status === 'TODO').length,
    },
    tasks: p.tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      deadline: t.deadline,
    })),
    milestones: p.milestones,
    team,
  };
};

export const getMyProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projects = await prisma.project.findMany({
      where: { clientId: req.user?.id },
      include: {
        manager: { select: { id: true, name: true, designation: true } },
        members: {
          include: { employee: { select: { id: true, name: true, designation: true } } },
        },
        tasks: { select: { id: true, title: true, status: true, priority: true, deadline: true } },
        milestones: { select: { id: true, title: true, status: true, dueDate: true, amount: true, paidAmount: true, releaseDate: true, completedAt: true, notes: true } },
      },
    });

    res.status(200).json({ success: true, data: projects.map(buildProjectView) });
  } catch (error) {
    console.error('Get my projects error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch projects' });
  }
};

export const getMyProjectDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = String(req.params.projectId);
    const project = await prisma.project.findFirst({
      where: { id: projectId, clientId: req.user?.id },
      include: {
        manager: { select: { id: true, name: true, designation: true } },
        members: {
          include: { employee: { select: { id: true, name: true, designation: true } } },
        },
        tasks: { select: { id: true, title: true, status: true, priority: true, deadline: true } },
        milestones: { select: { id: true, title: true, status: true, dueDate: true, amount: true, paidAmount: true, releaseDate: true, completedAt: true, notes: true } },
      },
    });

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    res.status(200).json({ success: true, data: buildProjectView(project) });
  } catch (error) {
    console.error('Get my project detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch project' });
  }
};

// ─── CLIENT INVOICES ──────────────────────────────────────────

export const getMyInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { clientId: req.user?.id },
          { project: { clientId: req.user?.id } }
        ]
      },
      include: {
        items: true,
        project: { select: { id: true, name: true, projectId: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, data: invoices });
  } catch (error) {
    console.error('Get my invoices error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch invoices' });
  }
};

export const getInvoiceDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: String(req.params.invoiceId),
        OR: [
          { clientId: req.user?.id },
          { project: { clientId: req.user?.id } }
        ]
      },
      include: {
        items: true,
        project: { select: { id: true, name: true, projectId: true } }
      }
    });
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }
    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    console.error('Get invoice detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch invoice' });
  }
};

export const approveInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: String(req.params.invoiceId),
        OR: [
          { clientId: req.user?.id },
          { project: { clientId: req.user?.id } }
        ]
      }
    });
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }
    if (invoice.status !== 'SENT') {
      res.status(400).json({ success: false, message: 'Only SENT invoices can be approved' });
      return;
    }
    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'APPROVED', approvedAt: new Date() }
    });
    res.status(200).json({ success: true, message: 'Invoice approved', data: updated });
  } catch (error) {
    console.error('Approve invoice error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve invoice' });
  }
};

export const payInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { paymentMode, transactionId, notes } = req.body;
    const updated = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: {
          id: String(req.params.invoiceId),
          OR: [
            { clientId: req.user?.id },
            { project: { clientId: req.user?.id } }
          ]
        },
        include: { project: { select: { managerId: true } } }
      });
      if (!invoice) {
        throw new Error('INVOICE_NOT_FOUND');
      }
      if (!['SENT', 'APPROVED', 'OVERDUE'].includes(invoice.status)) {
        throw new Error('INVOICE_CANNOT_BE_PAID');
      }
      if (transactionId) {
        const duplicate = await tx.projectPayment.findFirst({ where: { transactionId } });
        if (duplicate) throw new Error('DUPLICATE_TRANSACTION');
      }

      const paidInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paymentMode: paymentMode || 'BANK_TRANSFER',
          transactionId: transactionId || null,
          notes: notes || null
        }
      });

      // Client IDs are not Employee IDs. Use the project's employee manager for
      // the required ledger foreign key while retaining the client as payer.
      await tx.projectPayment.create({
        data: {
          projectId: invoice.projectId,
          amount: invoice.amount,
          mode: paymentMode || 'BANK_TRANSFER',
          transactionId: transactionId || null,
          paymentReference: `Invoice ${invoice.id}`,
          notes: notes || 'Payment for invoice by client',
          createdById: invoice.project.managerId
        }
      });

      const totals = await tx.projectPayment.aggregate({
        where: { projectId: invoice.projectId },
        _sum: { amount: true }
      });
      const receivedAmount = totals._sum.amount || 0;
      const project = await tx.project.findUnique({
        where: { id: invoice.projectId },
        select: { totalValue: true }
      });
      await tx.project.update({
        where: { id: invoice.projectId },
        data: {
          receivedAmount,
          pendingAmount: Math.max(0, (project?.totalValue || 0) - receivedAmount)
        }
      });

      return paidInvoice;
    });

    res.status(200).json({ success: true, message: 'Payment recorded', data: updated });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INVOICE_NOT_FOUND') {
        res.status(404).json({ success: false, message: 'Invoice not found' });
        return;
      }
      if (error.message === 'INVOICE_CANNOT_BE_PAID') {
        res.status(400).json({ success: false, message: 'This invoice cannot be paid' });
        return;
      }
      if (error.message === 'DUPLICATE_TRANSACTION') {
        res.status(400).json({ success: false, message: 'Duplicate transaction ID detected' });
        return;
      }
    }
    console.error('Pay invoice error:', error);
    res.status(500).json({ success: false, message: 'Failed to record payment' });
  }
};

// ─── CLIENT SUPPORT TICKETS ───────────────────────────────────

const generateTicketNo = async (): Promise<string> => {
  const count = await prisma.supportTicket.count();
  return `TK${String(count + 1).padStart(4, '0')}`;
};

export const getMyTickets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { clientId: req.user?.id },
      include: {
        project: { select: { id: true, name: true } },
        replies: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    console.error('Get my tickets error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
};

export const getTicketDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: String(req.params.ticketId), clientId: req.user?.id },
      include: {
        project: { select: { id: true, name: true } },
        replies: { orderBy: { createdAt: 'asc' } }
      }
    });
    if (!ticket) {
      res.status(404).json({ success: false, message: 'Ticket not found' });
      return;
    }
    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    console.error('Get ticket detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ticket' });
  }
};

export const createTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subject, description, category, priority, projectId } = req.body;
    if (!subject || !description) {
      res.status(400).json({ success: false, message: 'Subject and description are required' });
      return;
    }
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: String(projectId), clientId: req.user?.id },
        select: { id: true }
      });
      if (!project) {
        res.status(404).json({ success: false, message: 'Project not found' });
        return;
      }
    }
    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNo: await generateTicketNo(),
        clientId: req.user?.id,
        projectId: projectId || null,
        subject,
        description,
        category: category || 'QUERY',
        priority: priority || 'MEDIUM',
        status: 'OPEN'
      },
      include: {
        project: { select: { id: true, name: true } },
        replies: true
      }
    });
    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ success: false, message: 'Failed to create ticket' });
  }
};

export const addTicketReply = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { message } = req.body;
    if (!message) {
      res.status(400).json({ success: false, message: 'Message is required' });
      return;
    }
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: String(req.params.ticketId), clientId: req.user?.id }
    });
    if (!ticket) {
      res.status(404).json({ success: false, message: 'Ticket not found' });
      return;
    }
    if (ticket.status === 'CLOSED') {
      res.status(400).json({ success: false, message: 'Cannot reply to a closed ticket' });
      return;
    }
    const reply = await prisma.ticketReply.create({
      data: {
        ticketId: ticket.id,
        senderType: 'CLIENT',
        senderId: req.user?.id,
        senderName: req.user?.name || 'Client',
        message
      }
    });
    // Reopen if was resolved
    if (ticket.status === 'RESOLVED') {
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: 'OPEN' }
      });
    }
    res.status(201).json({ success: true, data: reply });
  } catch (error) {
    console.error('Add ticket reply error:', error);
    res.status(500).json({ success: false, message: 'Failed to add reply' });
  }
};

export const closeTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: String(req.params.ticketId), clientId: req.user?.id }
    });
    if (!ticket) {
      res.status(404).json({ success: false, message: 'Ticket not found' });
      return;
    }
    const updated = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: 'CLOSED' }
    });
    res.status(200).json({ success: true, message: 'Ticket closed', data: updated });
  } catch (error) {
    console.error('Close ticket error:', error);
    res.status(500).json({ success: false, message: 'Failed to close ticket' });
  }
};
