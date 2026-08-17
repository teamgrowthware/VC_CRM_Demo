import apiClient from './apiClient';

export const getEmployeeProfile = async (id: string) => {
  const { data } = await apiClient.get(`/employees/${id}/profile`);
  return data;
};

export const getEmployeeAttendanceStats = async (id: string) => {
  const { data } = await apiClient.get(`/employees/${id}/attendance`);
  return data;
};

export const getEmployeeTaskStats = async (id: string) => {
  const { data } = await apiClient.get(`/employees/${id}/tasks`);
  return data;
};

export const getEmployeeProjectStats = async (id: string) => {
  const { data } = await apiClient.get(`/employees/${id}/projects`);
  return data;
};

export const getEmployeeReportStats = async (id: string) => {
  const { data } = await apiClient.get(`/employees/${id}/reports`);
  return data;
};
