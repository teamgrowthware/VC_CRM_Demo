export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALFDAY' | 'LATE' | 'WEEKEND' | 'WEEKEND_WORK';

export interface Attendance {
  id: string;
  employeeId: string;
  employee?: {
    name: string;
    employeeId: string;
    department?: {
      name: string;
    }
  };
  date: string;
  punchIn: string | null;
  break1Start: string | null;
  break1End: string | null;
  lunchStart: string | null;
  lunchEnd: string | null;
  break2Start: string | null;
  break2End: string | null;
  punchOut: string | null;
  totalHours: number | null;
  status: AttendanceStatus;
  earlyExitReason?: string;
  adminNote?: string;
  deviceLogs?: any[];
  createdAt: string;
}

export interface AttendanceReport {
  employeeId: string;
  employeeName: string;
  totalWorkingDays: number;
  totalHours: number;
  absences: number;
}
