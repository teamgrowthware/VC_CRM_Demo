import api from './apiClient';

export interface Leave {
  id: string;
  employeeId: string;
  employee?: {
    name: string;
    employeeId: string;
    department?: { name: string };
  };
  leaveType: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  isPaid: boolean;
  createdAt: string;
}

export const applyLeave = async (data: Record<string, unknown>) => {
  const response = await api.post('/leaves', data);
  return response.data;
};

export const getMyLeaves = async () => {
  const response = await api.get('/leaves/my');
  return response.data;
};

export const getAllLeaves = async () => {
  const response = await api.get('/leaves');
  return response.data;
};

export const updateLeaveStatus = async (id: string, status: string) => {
  const response = await api.patch(`/leaves/${id}/status`, { status });
  return response.data;
};

export const markLeaveAsPaid = async (id: string, isPaid: boolean) => {
  const response = await api.patch(`/leaves/${id}/mark-paid`, { isPaid });
  return response.data;
};
