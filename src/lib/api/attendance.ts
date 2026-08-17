import apiClient from './apiClient';
import { Attendance, AttendanceStatus } from '../../types/attendance';


export const punchIn = async (deviceMetadata?: any): Promise<Attendance> => {
  const response = await apiClient.post(`/attendance/punch-in`, { deviceMetadata });
  return response.data.data;
};

export const punchOut = async (earlyExitReason?: string, deviceMetadata?: any): Promise<Attendance> => {
  const response = await apiClient.post(`/attendance/punch-out`, { earlyExitReason, deviceMetadata });
  return response.data.data;
};

export const startBreak = async (deviceMetadata?: any): Promise<Attendance> => {
  const response = await apiClient.post(`/attendance/break-start`, { deviceMetadata });
  return response.data.data;
};

export const endBreak = async (deviceMetadata?: any): Promise<Attendance> => {
  const response = await apiClient.post(`/attendance/break-end`, { deviceMetadata });
  return response.data.data;
};

export const startLunch = async (deviceMetadata?: any): Promise<Attendance> => {
  const response = await apiClient.post(`/attendance/lunch-start`, { deviceMetadata });
  return response.data.data;
};

export const endLunch = async (deviceMetadata?: any): Promise<Attendance> => {
  const response = await apiClient.post(`/attendance/lunch-end`, { deviceMetadata });
  return response.data.data;
};

export const getTodayAttendance = async (): Promise<Attendance | null> => {
  const response = await apiClient.get(`/attendance/today`);
  return response.data.data;
};

export const getAttendanceHistory = async (month?: number, year?: number): Promise<Attendance[]> => {
  let url = `/attendance/history`;
  if (month && year) {
    url += `?month=${month}&year=${year}`;
  }
  const response = await apiClient.get(url);
  return response.data.data;
};

// Admin and HR
export const getAllAttendance = async (month?: number, year?: number, date?: string, status?: string): Promise<Attendance[]> => {
  let url = `/attendance/all`;
  const params = new URLSearchParams();
  if (month && year) {
    params.append('month', month.toString());
    params.append('year', year.toString());
  }
  if (date) {
    params.append('date', date);
  }
  if (status && status !== 'ALL') {
    params.append('status', status);
  }
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  const response = await apiClient.get(url);
  return response.data.data;
};

export const deletePenalty = async (id: string): Promise<void> => {
  await apiClient.delete(`/attendance/penalties/${id}`);
};

export const getCalendarData = async (month: number, year: number): Promise<any[]> => {
  const response = await apiClient.get(`/attendance/calendar?month=${month}&year=${year}`);
  return response.data.data;
};

export const updateAttendanceStatus = async (id: string, status: AttendanceStatus, note?: string): Promise<Attendance> => {
  const response = await apiClient.patch(`/attendance/${id}/status`, { status, note });
  return response.data.data;
};

export const getEarlyExitAnalytics = async (month?: number, year?: number): Promise<any[]> => {
  const m = month || new Date().getMonth() + 1;
  const y = year || new Date().getFullYear();
  const response = await apiClient.get(`/attendance/analytics/early-exit?month=${m}&year=${y}`);
  return response.data.data;
};
