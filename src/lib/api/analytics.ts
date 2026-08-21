import apiClient from './apiClient';

export interface DepartmentStat {
  name: string;
  count: number;
}

export interface EmployeeStats {
  total: number;
  active: number;
  byDepartment: DepartmentStat[];
}

export interface AttendanceTrend {
  date: string;
  status: string;
  _count: { id: number };
}

export interface AttendanceStats {
  present: number;
  absent: number;
  halfDay: number;
  late: number;
  onLeave: number;
  weekend?: number;
  weekendWork?: number;
  holiday?: number;
  holidayWork?: number;
  trend: AttendanceTrend[];
}

export interface TopPerformer {
  employeeId: string;
  name: string;
  department: string;
  score: number;
  completedCount: number;
}

export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  topPerformers: TopPerformer[];
}

export interface NearingProject {
  id: string;
  name: string;
  deadline: string;
  status: string;
  manager: { name: string };
}

export interface ProjectStats {
  total: number;
  active: number;
  completed: number;
  nearingDeadline: NearingProject[];
}

export interface PendingEOD {
  employee: {
    name: string;
    department: { name: string } | null;
  };
  date: string;
}

export interface ProductivityStats {
  sodsSubmitted: number;
  eodsSubmitted: number;
  pendingEods: PendingEOD[];
}

export const getAnalyticsEmployeeStats = async (): Promise<EmployeeStats> => {
  const response = await apiClient.get(`/analytics/employees`, {
    
  });
  return response.data;
};

export const getAnalyticsAttendanceStats = async (): Promise<AttendanceStats> => {
  const response = await apiClient.get(`/analytics/attendance`, {
    
  });
  return response.data;
};

export const getAnalyticsTaskStats = async (): Promise<TaskStats> => {
  const response = await apiClient.get(`/analytics/tasks`, {
    
  });
  return response.data;
};

export const getAnalyticsProjectStats = async (): Promise<ProjectStats> => {
  const response = await apiClient.get(`/analytics/projects`, {
    
  });
  return response.data;
};

export const getAnalyticsProductivityStats = async (): Promise<ProductivityStats> => {
  const response = await apiClient.get(`/analytics/productivity`, {
    
  });
  return response.data;
};

export interface TeamProductivity {
  id: string;
  name: string;
  totalTasks: number;
  completed: number;
  completionRate: number;
  overdue: number;
  score: number;
}

export interface ProjectHealth {
  onTime: number;
  late: number;
  pending: number;
}

export const getTeamProductivity = async (): Promise<TeamProductivity[]> => {
  const response = await apiClient.get(`/analytics/team-productivity`, {
    
  });
  return response.data;
};

export const getProjectHealth = async (): Promise<ProjectHealth> => {
  const response = await apiClient.get(`/analytics/project-health`);
  return response.data;
};

export interface EfficiencyStat {
  name: string;
  attendanceHours: number;
  trackedHours: number;
  missingHours: number;
  efficiency: number;
}

export const getEfficiencyStats = async (): Promise<EfficiencyStat[]> => {
  const response = await apiClient.get(`/analytics/efficiency`);
  return response.data;
};
