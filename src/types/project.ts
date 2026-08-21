import { Employee } from './employee';
import { Task } from './task';

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
export type ProjectRole = 'DEVELOPER' | 'DESIGNER' | 'TESTER' | 'MANAGER';

export interface ProjectLink {
  title: string;
  url: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  employeeId: string;
  role: ProjectRole;
  joinedAt: string;
  employee?: Employee;
}

export interface Document {
  id: string;
  projectId: string;
  name: string;
  url: string;
  type: string;
  uploadedAt: string;
}

export interface Project {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  managerId: string;
  teamId?: string | null;
  team?: { id: string; name: string };
  clientId?: string | null;
  client?: { id: string; name: string; company?: string | null; email?: string | null } | null;
  departmentId?: string | null;
  department?: { id: string; name: string };
  manager?: Employee;
  members?: ProjectMember[];
  startDate: string;
  deadline: string;
  status: ProjectStatus;
  brdUrl?: string | null;
  links?: ProjectLink[];
  tasks?: Task[];
  documents?: Document[];
  timeEntries?: Array<{ durationMinutes?: number }>;
  totalValue?: number;
  receivedAmount?: number;
  pendingAmount?: number;
  financeFinalized?: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
  };
}
