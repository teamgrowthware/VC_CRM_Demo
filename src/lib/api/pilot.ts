import api from './apiClient';

export const submitPilotFeedback = async (data: {
  isIdleAccurate: boolean;
  hadFalsePause: boolean;
  hasPerformanceIssue: boolean;
  rating: number;
  comment?: string;
  appVersion?: string;
}) => {
  const response = await api.post('/pilot/feedback', data);
  return response.data;
};

export const reportAppHealth = async (data: {
  deviceId: string;
  cpuUsage: number;
  ramUsage: number;
  syncStatus: string;
  heartbeatStatus: string;
}) => {
  const response = await api.post('/pilot/health', data);
  return response.data;
};

export const reportAppCrash = async (data: {
  deviceId: string;
  errorMessage: string;
  errorStack?: string;
  appVersion?: string;
  os?: string;
}) => {
  const response = await api.post('/pilot/crash', data);
  return response.data;
};

export const getPilotAnalytics = async () => {
  const response = await api.get('/pilot/stats');
  return response.data;
};
