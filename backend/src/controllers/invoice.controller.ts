import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const { clientName, clientId, projectId, amount, dueDate, notes, items } = req.body;
    
    const invoice = await prisma.invoice.create({
      data: {
        clientName,
        clientId: clientId || null,
        projectId,
        amount,
        dueDate: new Date(dueDate),
        notes,
        status: 'DRAFT',
        items: {
          create: items.map((item: any) => ({
            description: item.description,
            hours: item.hours || null,
            rate: item.rate || null,
            total: item.total
          }))
        }
      },
      include: {
        items: true,
        project: { select: { name: true } },
        client: { select: { name: true, company: true } }
      }
    });
    
    res.status(201).json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create invoice' });
  }
};

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        items: true,
        project: { select: { name: true } },
        client: { select: { name: true, company: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(invoices);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        project: { select: { name: true } },
        client: { select: { name: true, company: true } }
      }
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.status(200).json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
};

export const updateInvoiceStatus = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status, paymentMode, transactionId } = req.body;
    
    const invoice = await prisma.invoice.update({
      where: { id },
      data: { 
        status,
        ...(status === 'PAID' ? { 
          paidAt: new Date(),
          paymentMode: paymentMode || null,
          transactionId: transactionId || null
        } : {})
      },
      include: {
        items: true,
        project: { select: { name: true } }
      }
    });
    
    res.status(200).json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
};

export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const invoice = await prisma.invoice.findUnique({ where: { id }, select: { status: true } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only draft invoices can be deleted' });
    }
    await prisma.invoice.delete({ where: { id } });
    res.status(200).json({ message: 'Invoice deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
};
