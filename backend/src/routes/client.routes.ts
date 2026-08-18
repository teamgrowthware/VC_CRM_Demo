import { Router } from 'express';
import * as ClientController from '../controllers/client.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';

const management = Router();
management.use(authenticateToken, authorizeRoles('ADMIN', 'HR'));

management.post('/', ClientController.createClient);
management.get('/', ClientController.listClients);
management.get('/:id', ClientController.getClient);
management.put('/:id', ClientController.updateClient);
management.delete('/:id', ClientController.deleteClient);
management.post('/:id/projects/:projectId', ClientController.assignProject);
management.delete('/:id/projects/:projectId', ClientController.unassignProject);

const portal = Router();
portal.use(authenticateToken, authorizeRoles('CLIENT'));

// Profile & Projects
portal.get('/me', ClientController.getMe);
portal.get('/projects', ClientController.getMyProjects);
portal.get('/projects/:projectId', ClientController.getMyProjectDetail);

// Invoices
portal.get('/invoices', ClientController.getMyInvoices);
portal.get('/invoices/:invoiceId', ClientController.getInvoiceDetail);
portal.patch('/invoices/:invoiceId/approve', ClientController.approveInvoice);
portal.patch('/invoices/:invoiceId/pay', ClientController.payInvoice);

// Support Tickets
portal.get('/tickets', ClientController.getMyTickets);
portal.get('/tickets/:ticketId', ClientController.getTicketDetail);
portal.post('/tickets', ClientController.createTicket);
portal.post('/tickets/:ticketId/reply', ClientController.addTicketReply);
portal.patch('/tickets/:ticketId/close', ClientController.closeTicket);

export default { management, portal };
