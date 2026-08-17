import apiClient from './apiClient';

export interface ActivityLog {
  id: string;
  type: string;
  message: string;
  entityType?: string;
  entityId?: string;
  userId: string;
  createdAt: string;
  user: {
    name: string;
  };
}

export const getRecentActivity = async () => {
  const response = await apiClient.get<ActivityLog[]>('/activity/recent');
  return response.data;
};

export const getUserActivity = async (userId: string) => {
  const response = await apiClient.get<ActivityLog[]>(`/activity/user/${userId}`);
  return response.data;
};

export interface IdleRequest {
  id: string;
  userId: string;
  user: {
    name: string;
    employeeId: string;
  };
  idleStartedAt: string;
  reason: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
}

export const sendHeartbeat = async (deviceId?: string | null) => {
  if (deviceId) {
    const response = await apiClient.post('/agent/heartbeat', { deviceId, status: 'ACTIVE' });
    return response.data;
  }
  const response = await apiClient.post('/activity/heartbeat', {});
  return response.data;
};

export const reportIdleDetected = async (deviceId?: string | null) => {
  const response = await apiClient.post('/activity/idle-detected', { deviceId });
  return response.data;
};

export const autoResumeIdle = async () => {
  const response = await apiClient.post('/activity/auto-resume', {});
  return response.data;
};

export const submitResumeRequest = async (reason: string) => {
  const response = await apiClient.post('/activity/resume-request', { reason });
  return response.data;
};

export const getMyActivityStatus = async () => {
  const response = await apiClient.get('/activity/my-status');
  return response.data;
};

export const getIdleRequests = async (): Promise<IdleRequest[]> => {
  const response = await apiClient.get('/activity/resume-requests');
  return response.data;
};

export const approveIdleRequest = async (id: string, adminComment?: string) => {
  const response = await apiClient.put(`/activity/resume-requests/${id}/approve`, { adminComment });
  return response.data;
};

export const rejectIdleRequest = async (id: string, adminComment?: string) => {
  const response = await apiClient.put(`/activity/resume-requests/${id}/reject`, { adminComment });
  return response.data;
};

export const reportSystemEvent = async (deviceId: string, eventType: string, timestamp: number) => {
  const response = await apiClient.post('/activity/system-event', { deviceId, eventType, timestamp });
  return response.data;
};
