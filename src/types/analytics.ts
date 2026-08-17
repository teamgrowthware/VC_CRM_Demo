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
