import apiClient from './apiClient';

export interface TimeEntry {
  id: string;
  taskId?: string;
  projectId?: string;
  employeeId: string;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  description?: string;
  workCategory?: string;
  productivityRating?: number;
  idleMinutes?: number;
  isLocked: boolean;
  type: 'TIMER' | 'MANUAL';
  status: 'RUNNING' | 'PAUSED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  isBillable: boolean;
  date: string;
  employee?: { name: string; employeeId: string; designation: string };
  project?: { name: string; projectId: string };
  task?: { title: string; taskId: string };
  manualProjectName?: string;
  rejectionReason?: string;
}

export interface TimerSession {
  id: string;
  employeeId: string;
  taskId?: string;
  projectId?: string;
  startTime: string;
  lastPausedAt?: string | null;
  totalPausedSeconds: number;
  isActive: boolean;
  status: 'RUNNING' | 'PAUSED' | 'IDLE_PAUSED' | 'STOPPED';
  totalIdleMinutes: number;
  lastActivityAt: string;
  autoPausedAt?: string | null;
  resumeRequiresApproval: boolean;
  description?: string;
}

export interface ProjectTimeSummary {
  totalHours: string;
  memberBreakdown: { name: string; hours: string }[];
  taskBreakdown: { title: string; hours: string }[];
}

export interface ProjectAnalytics {
  totalHours: string;
  billableHours: string;
  productivity: string | number;
  milestoneProgress: number;
  taskCount: number;
}

export const startTimer = async (data: { taskId?: string; projectId?: string; description?: string; workCategory?: string }) => {
  const response = await apiClient.post<any>('/timesheets/timer/start', data);
  return response.data;
};

export const pauseTimer = async () => {
  const response = await apiClient.post<any>('/timesheets/timer/pause');
  return response.data;
};

export const resumeTimer = async () => {
  const response = await apiClient.post<any>('/timesheets/timer/resume');
  return response.data;
};

export const stopTimer = async (data: { description: string; workCategory?: string; productivityRating?: number; isBillable?: boolean }) => {
  const response = await apiClient.post<any>('/timesheets/timer/stop', data);
  return response.data;
};

export const getActiveTimer = async () => {
  const response = await apiClient.get<any>('/timesheets/active-timer');
  return response.data;
};

export const getMyTimesheets = async (params?: any) => {
  const response = await apiClient.get<any>('/timesheets/my', { params });
  return response.data;
};

export const addManualEntry = async (data: any) => {
  const response = await apiClient.post<any>('/timesheets/manual', data);
  return response.data;
};

export const getProjectTimesheets = async (projectId: string, params?: any) => {
  const response = await apiClient.get<any>(`/projects/${projectId}/timesheets`, { params });
  return response.data;
};

export const getProjectTimeSummary = async (projectId: string) => {
  const response = await apiClient.get<any>(`/projects/${projectId}/timesheet-summary`);
  return response.data;
};

export const getAdminTimesheets = async (params?: any) => {
  const response = await apiClient.get<any>('/timesheets/admin/entries', { params });
  return response.data;
};

export const approveTimeEntry = async (id: string) => {
  const response = await apiClient.put<any>(`/timesheets/${id}/approve`);
  return response.data;
};

export const rejectTimeEntry = async (id: string, reason: string) => {
  const response = await apiClient.put<any>(`/timesheets/${id}/reject`, { reason });
  return response.data;
};

// Aliases for compatibility with existing components
export const getAdminTimesheetOverview = async (month?: number, year?: number) => {
  const response = await apiClient.get<any>('/timesheets/admin/overview', { params: { month, year } });
  return response.data;
};

export const getAdminTimesheetEntries = getAdminTimesheets;
export const approveTimesheet = approveTimeEntry;
export const rejectTimesheet = rejectTimeEntry;

export const getProjectAnalytics = async (projectId: string) => {
  const response = await apiClient.get<ProjectAnalytics>(`/timesheets/analytics/project/${projectId}`);
  return response.data;
};

export const getAttendanceComparison = async (employeeId: string, date: string) => {
  const response = await apiClient.get<any>('/timesheets/analytics/attendance-comparison', { params: { employeeId, date } });
  return response.data;
};

export const getTeamAnalytics = async (startDate?: string, endDate?: string) => {
  const response = await apiClient.get<any[]>('/timesheets/analytics/team', { params: { startDate, endDate } });
  return response.data;
};

export const updateTimeEntry = async (id: string, updates: any) => {
  const response = await apiClient.patch<any>(`/timesheets/${id}`, updates);
  return response.data;
};

export const deleteTimeEntry = async (id: string) => {
  const response = await apiClient.delete<any>(`/timesheets/${id}`);
  return response.data;
};
