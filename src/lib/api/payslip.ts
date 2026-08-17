import apiClient from './apiClient';

export interface PayslipItem {
  type: string;
  amount: number;
  reason?: string | null;
}

export interface PayslipPenalty {
  amount: number;
  reason?: string | null;
}

export interface PayslipData {
  employee?: {
    name?: string;
    employeeId?: string;
    designation?: string;
    department?: string | { name: string } | null;
    joiningDate?: string | null;
  };
  baseSalary?: number;
  perDaySalary?: number;
  attendance?: {
    presentDays?: number;
    absentDays?: number;
    halfDays?: number;
    lateMarks?: number;
    productiveHours?: number;
    overtimeHours?: number;
  };
  earnings?: {
    baseSalary?: number;
    totalAddons?: number;
    addons?: PayslipItem[];
    grossEarnings?: number;
  };
  deductions?: {
    attendanceDeduction?: number;
    halfDayDeduction?: number;
    joiningDeduction?: number;
    totalCustomDeductions?: number;
    customDeductions?: PayslipItem[];
    totalPenalties?: number;
    penalties?: PayslipPenalty[];
    totalDeductions?: number;
  };
  netSalary?: number;
}

export interface Payslip {
  id: string;
  employeeId: string;
  month: string;
  period: string;
  monthInt: number;
  yearInt: number;
  netSalary: number;
  data?: PayslipData | null;
  fileUrl?: string | null;
  createdAt: string;
  employee?: {
    name: string;
    employeeId: string;
    designation?: string;
    department?: { name: string } | null;
    joiningDate?: string | null;
  };
}

export const getMyPayslips = async (): Promise<Payslip[]> => {
  const response = await apiClient.get('/payslips/mine');
  return response.data.data;
};

export const getAllPayslips = async (month?: number, year?: number): Promise<Payslip[]> => {
  const params = new URLSearchParams();
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());
  const query = params.toString();
  const response = await apiClient.get(`/payslips/all${query ? `?${query}` : ''}`);
  return response.data.data;
};

export const generateAllPayslips = async (month: number, year: number) => {
  const response = await apiClient.post('/payslips/generate', { month, year });
  return response.data;
};

export const deletePayslip = async (id: string) => {
  const response = await apiClient.delete(`/payslips/${id}`);
  return response.data;
};
