import apiClient from './apiClient';

export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  createdAt: string;
  task?: {
    title: string;
    taskId: string;
  };
  user?: {
    name: string;
    employeeId: string;
  };
}

export const startTimer = async (taskId: string) => {
  const { data } = await apiClient.post(`/time/start`, { taskId });
  return data;
};

export const stopTimer = async () => {
  const { data } = await apiClient.post(`/time/stop`, {});
  return data;
};

export const getActiveTimer = async () => {
  const { data } = await apiClient.get(`/time/active`);
  return data;
};

export const getTaskTimeEntries = async (taskId: string) => {
  const { data } = await apiClient.get(`/time/task/${taskId}`);
  return data;
};

export const getUserTimeEntries = async (userId: string) => {
  const { data } = await apiClient.get(`/time/user/${userId}`);
  return data;
};
