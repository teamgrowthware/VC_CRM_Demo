import apiClient from './apiClient';

export interface DeductionBreakdownItem {
  type: 'ABSENT' | 'HALFDAY' | 'PENALTY';
  label: string;
  date: string;
  amount: number;
  id?: string;
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
  netSalary: number;
  deductions: DeductionBreakdownItem[];
}

export interface PenaltyRow {
  id: string;
  amount: number;
  reason: string;
  date: string;
  employee?: { name: string; employeeId: string };
}

export interface PayrollData {
  baseSalary: number;
  totalPenalties: number;
  attendanceDeductions: number;
  netSalary: number;
  penalties: PenaltyRow[];
  absentDays?: number;
  halfDays?: number;
  deductionBreakdown?: DeductionBreakdownItem[];
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
