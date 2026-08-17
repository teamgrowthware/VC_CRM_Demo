import api from './apiClient';

export interface SystemSettings {
  id: string;
  officeStartTime: string;
  lateThreshold: string;
  lateComingEnabled: boolean;
  halfDayEnabled: boolean;
  lunchDuration: number;
  breakDuration: number;
  sodReminderTime: string;
  eodReminderTime: string;

  idleTimeoutMinutes: number;
  idleWarningSeconds: number;
  autoPauseTimerEnabled: boolean;
  requireApprovalToResume: boolean;
  desktopAppEnabledRoles: string[];
  heartbeatIntervalSeconds: number;
  autoStartEnabled: boolean;

  ruleBookText: string | null;
}

export interface NotificationSetting {
  id: string;
  userId: string;
  enabledTypes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SelfProfile {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  role: string;
  departmentId: string | null;
}

export interface ApiMessage {
  success: boolean;
  message: string;
}

export const getNotificationSettings = async (): Promise<NotificationSetting> => {
  const { data } = await api.get('/settings/notifications');
  return data;
};

export const updateNotificationSettings = async (enabledTypes: string[]): Promise<NotificationSetting> => {
  const { data } = await api.put('/settings/notifications', { enabledTypes });
  return data;
};

export const getSystemSettings = async (): Promise<SystemSettings> => {
  const { data } = await api.get('/settings');
  return data;
};

export const updateSystemSettings = async (settings: Partial<SystemSettings>): Promise<SystemSettings> => {
  const { data } = await api.patch('/settings', settings);
  return data;
};

export const updateSelfProfile = async (
  payload: { name?: string; phone?: string | null }
): Promise<{ success: boolean; message: string; data: SelfProfile }> => {
  const { data } = await api.put('/auth/me', payload);
  return data;
};

export const changeMyPassword = async (currentPassword: string, newPassword: string): Promise<ApiMessage> => {
  const { data } = await api.post('/auth/change-password', { currentPassword, newPassword });
  return data;
};
