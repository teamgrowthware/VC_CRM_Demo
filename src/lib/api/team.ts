import apiClient from './apiClient';

export interface TeamMember {
  id: string;
  employeeId: string;
  joinedAt: string;
  employee: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    designation: string;
  };
}

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  _count?: { projects: number; members: number };
  members?: TeamMember[];
}

export const fetchTeams = async (): Promise<Team[]> => {
  const { data } = await apiClient.get('/teams');
  return data.data;
};

export const createTeam = async (payload: { name: string; description?: string }): Promise<Team> => {
  const { data } = await apiClient.post('/teams', payload);
  return data.data;
};

export const updateTeam = async (id: string, payload: { name?: string; description?: string }): Promise<Team> => {
  const { data } = await apiClient.put(`/teams/${id}`, payload);
  return data.data;
};

export const deleteTeam = async (id: string): Promise<void> => {
  await apiClient.delete(`/teams/${id}`);
};

export const addTeamMembers = async (teamId: string, employeeIds: string[]): Promise<{ count: number }> => {
  const { data } = await apiClient.post(`/teams/${teamId}/members`, { employeeIds });
  return data.data;
};

export const removeTeamMember = async (teamId: string, employeeId: string): Promise<void> => {
  await apiClient.delete(`/teams/${teamId}/members/${employeeId}`);
};
