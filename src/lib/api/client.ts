import apiClient from './apiClient';

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
  }[];
  team: {
    id: string;
    name: string;
    designation?: string | null;
    role: string;
  }[];
}

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
