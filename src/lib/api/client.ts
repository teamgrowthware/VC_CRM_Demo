import apiClient from './apiClient';

export interface ManagementClient {
  id: string;
  clientId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export const fetchClients = async (): Promise<ManagementClient[]> => {
  const { data } = await apiClient.get('/clients');
  return data.data;
};

export const createClient = async (payload: {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  password: string;
}): Promise<ManagementClient> => {
  const { data } = await apiClient.post('/clients', payload);
  return data.data;
};

export const updateClient = async (id: string, payload: {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}): Promise<ManagementClient> => {
  const { data } = await apiClient.put(`/clients/${id}`, payload);
  return data.data;
};

export const deleteClient = async (id: string): Promise<void> => {
  await apiClient.delete(`/clients/${id}`);
};

export interface ClientProject {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
  startDate: string;
  deadline: string;
  progress: number;
  taskCounts: {
    total: number;
    completed: number;
    inProgress: number;
    testing: number;
    todo: number;
  };
  tasks: {
    id: string;
    title: string;
    status: 'TODO' | 'IN_PROGRESS' | 'TESTING' | 'COMPLETED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    deadline?: string | null;
  }[];
  milestones: {
    id: string;
    title: string;
    status: string;
    dueDate?: string | null;
    amount?: number;
    paidAmount?: number;
    releaseDate?: string | null;
    completedAt?: string | null;
    notes?: string | null;
  }[];
  team: {
    id: string;
    name: string;
    designation?: string | null;
    role: string;
  }[];
}

export interface ClientInvoice {
  id: string;
  clientName: string;
  projectId: string;
  amount: number;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate: string;
  approvedAt?: string | null;
  paidAt?: string | null;
  paymentMode?: string | null;
  transactionId?: string | null;
  notes?: string | null;
  items: { id: string; description: string; hours?: number | null; rate?: number | null; total: number }[];
  project: { id: string; name: string; projectId: string };
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNo: string;
  projectId?: string | null;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED';
  assignedTo?: string | null;
  project?: { id: string; name: string } | null;
  replies: TicketReply[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketReply {
  id: string;
  ticketId: string;
  senderType: string;
  senderId: string;
  senderName: string;
  message: string;
  createdAt: string;
}

// ─── Profile & Projects ──────────────────────────────

export const getClientProfile = async () => {
  const { data } = await apiClient.get('/client/me');
  return data.data;
};

export const getMyProjects = async (): Promise<ClientProject[]> => {
  const { data } = await apiClient.get('/client/projects');
  return data.data;
};

export const getMyProjectDetail = async (projectId: string): Promise<ClientProject> => {
  const { data } = await apiClient.get(`/client/projects/${projectId}`);
  return data.data;
};

// ─── Invoices ────────────────────────────────────────

export const getMyInvoices = async (): Promise<ClientInvoice[]> => {
  const { data } = await apiClient.get('/client/invoices');
  return data.data;
};

export const getInvoiceDetail = async (invoiceId: string): Promise<ClientInvoice> => {
  const { data } = await apiClient.get(`/client/invoices/${invoiceId}`);
  return data.data;
};

export const approveInvoice = async (invoiceId: string) => {
  const { data } = await apiClient.patch(`/client/invoices/${invoiceId}/approve`);
  return data.data;
};

export const payInvoice = async (invoiceId: string, payload: { paymentMode: string; transactionId?: string; notes?: string }) => {
  const { data } = await apiClient.patch(`/client/invoices/${invoiceId}/pay`, payload);
  return data.data;
};

// ─── Support Tickets ─────────────────────────────────

export const getMyTickets = async (): Promise<SupportTicket[]> => {
  const { data } = await apiClient.get('/client/tickets');
  return data.data;
};

export const getTicketDetail = async (ticketId: string): Promise<SupportTicket> => {
  const { data } = await apiClient.get(`/client/tickets/${ticketId}`);
  return data.data;
};

export const createTicket = async (ticket: { subject: string; description: string; category?: string; priority?: string; projectId?: string }) => {
  const { data } = await apiClient.post('/client/tickets', ticket);
  return data.data;
};

export const addTicketReply = async (ticketId: string, message: string) => {
  const { data } = await apiClient.post(`/client/tickets/${ticketId}/reply`, { message });
  return data.data;
};

export const closeTicket = async (ticketId: string) => {
  const { data } = await apiClient.patch(`/client/tickets/${ticketId}/close`);
  return data.data;
};
