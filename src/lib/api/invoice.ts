import apiClient from './apiClient';

export interface InvoiceItem {
  id?: string;
  description: string;
  hours?: number | null;
  rate?: number | null;
  total: number;
}

export interface Invoice {
  id: string;
  clientName: string;
  clientId?: string | null;
  projectId: string;
  amount: number;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate: string;
  paidAt?: string | null;
  paymentMode?: string | null;
  transactionId?: string | null;
  notes?: string | null;
  items: InvoiceItem[];
  project: { name: string };
  client?: { name: string; company: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export const getAllInvoices = async (): Promise<Invoice[]> => {
  const response = await apiClient.get('/invoices');
  return response.data;
};

export const getInvoiceById = async (id: string): Promise<Invoice> => {
  const response = await apiClient.get(`/invoices/${id}`);
  return response.data;
};

export const createInvoice = async (data: Record<string, unknown>): Promise<Invoice> => {
  const response = await apiClient.post('/invoices', data);
  return response.data;
};

export const updateInvoiceStatus = async (id: string, data: { status: string; paymentMode?: string; transactionId?: string }): Promise<Invoice> => {
  const response = await apiClient.put(`/invoices/${id}/status`, data);
  return response.data;
};

export const deleteInvoice = async (id: string): Promise<void> => {
  await apiClient.delete(`/invoices/${id}`);
};
