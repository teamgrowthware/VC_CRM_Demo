import apiClient from './apiClient';

export interface DeductionBreakdownItem {
  type: 'ABSENT' | 'HALFDAY' | 'PENALTY' | 'DEDUCTION' | 'JOINING';
  label: string;
  date: string;
  amount: number;
  id?: string;
}

export interface LeaveDetailItem {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason: string;
  isPaid: boolean;
  status: string;
}

export interface GroupEmployeeRow {
  id: string;
  name: string;
  employeeId: string;
  baseSalary: number;
  absentDays: number;
  halfDays: number;
  attendanceDeductions: number;
  totalPenalties: number;
  overtimePay?: number;
  totalAddons?: number;
  totalCustomDeductions?: number;
  joiningDeduction?: number;
  grossEarnings?: number;
  netSalary: number;
  deductions: DeductionBreakdownItem[];
  leaveDetails?: LeaveDetailItem[];
  paidLeaveDays?: number;
  unpaidLeaveDays?: number;
}

export interface PenaltyRow {
  id: string;
  amount: number;
  reason: string;
  date: string;
  employee?: { name: string; employeeId: string };
}

export interface PayrollAddonItem {
  type: string;
  amount: number;
  reason: string;
  date: string;
}

export interface PayrollData {
  baseSalary: number;
  totalPenalties: number;
  attendanceDeductions: number;
  netSalary: number;
  penalties: PenaltyRow[];
  absentDays?: number;
  halfDays?: number;
  presentDays?: number;
  deductionBreakdown?: DeductionBreakdownItem[];
  leaveDetails?: LeaveDetailItem[];
  paidLeaveDays?: number;
  unpaidLeaveDays?: number;
  
  // Additions
  overtimeHours?: number;
  overtimePay?: number;
  totalAddons?: number;
  addons?: PayrollAddonItem[];
  grossEarnings?: number;

  employees?: GroupEmployeeRow[];
}

export const getMyPayroll = async (month?: number, year?: number): Promise<PayrollData> => {
  let url = `/payroll/my-payroll`;
  const params = new URLSearchParams();
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  const response = await apiClient.get(url);
  return response.data.data;
};

export const getGroupPayroll = async (month?: number, year?: number): Promise<PayrollData> => {
  let url = `/payroll/group-payroll`;
  const params = new URLSearchParams();
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  const response = await apiClient.get(url);
  return response.data.data;
};
