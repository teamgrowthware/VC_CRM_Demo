import apiClient from './apiClient';


export interface DailyReport {
  id: string;
  employeeId: string;
  date: string;
  sodText: string;
  eodText: string | null;
  tasksCompleted: string | null;
  blockers: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    name: string;
    employeeId: string;
    department?: { name: string };
  };
}

export const createSodReport = async (sodText: string): Promise<DailyReport> => {
  const response = await apiClient.post(
    `/reports/sod`,
    { sodText }
  );
  return response.data.report;
};

export const submitEodReport = async (id: string, eodText: string, tasksCompleted?: string, blockers?: string): Promise<DailyReport> => {
  const response = await apiClient.patch(
    `/reports/eod/${id}`,
    { eodText, tasksCompleted, blockers }
  );
  return response.data.report;
};

export const getMyReports = async (): Promise<DailyReport[]> => {
  const response = await apiClient.get(`/reports/my`);
  return response.data;
};

export const getReportsByDate = async (date: string): Promise<DailyReport[]> => {
  const response = await apiClient.get(`/reports/date/${date}`);
  return response.data;
};

export const getTeamReports = async (): Promise<DailyReport[]> => {
  const response = await apiClient.get(`/reports/team`);
  return response.data;
};
