export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'LOST';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  source: string | null;
  status: LeadStatus;
  assignedId: string | null;
  assignedTo?: {
    id: string;
    name: string;
  } | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
