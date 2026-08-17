import apiClient from './apiClient';

export const getFinanceOverview = async (month?: number, year?: number) => {
  const params = new URLSearchParams();
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());
  const response = await apiClient.get(`/admin/finance/overview?${params.toString()}`);
  return response.data.data;
};

export const getPayrollRecords = async (month?: number, year?: number) => {
  const params = new URLSearchParams();
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());
  const response = await apiClient.get(`/admin/finance/payroll?${params.toString()}`);
  return response.data.data;
};

export const generatePayroll = async (month: number, year: number) => {
  const response = await apiClient.post(`/admin/finance/payroll/generate`, { month, year });
  return response.data.data;
};

export const paySalary = async (id: string, data: { paymentMode: string, paymentDate?: string }) => {
  const response = await apiClient.patch(`/admin/finance/payroll/${id}/pay`, data);
  return response.data.data;
};

export const addDeduction = async (data: any) => {
  const response = await apiClient.post(`/admin/finance/deductions`, data);
  return response.data.data;
};

export const getDeductions = async (month?: number, year?: number) => {
  const params = new URLSearchParams();
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());
  const response = await apiClient.get(`/admin/finance/deductions?${params.toString()}`);
  return response.data.data;
};

export const deleteDeduction = async (id: string) => {
  const response = await apiClient.delete(`/admin/finance/deductions/${id}`);
  return response.data;
};

export const addAddon = async (data: any) => {
  const response = await apiClient.post(`/admin/finance/addons`, data);
  return response.data.data;
};

export const getAddons = async (month?: number, year?: number) => {
  const params = new URLSearchParams();
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());
  const response = await apiClient.get(`/admin/finance/addons?${params.toString()}`);
  return response.data.data;
};

export const deleteAddon = async (id: string) => {
  const response = await apiClient.delete(`/admin/finance/addons/${id}`);
  return response.data;
};

export const getExpenses = async (params?: any) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/admin/finance/expenses?${query}`);
  return response.data.data;
};

export const addExpense = async (data: any) => {
  const response = await apiClient.post(`/admin/finance/expenses`, data);
  return response.data.data;
};

export const deleteExpense = async (id: string) => {
  const response = await apiClient.delete(`/admin/finance/expenses/${id}`);
  return response.data;
};

export const getPettyCash = async () => {
  const response = await apiClient.get(`/admin/finance/petty-cash`);
  return response.data.data;
};

export const addPettyCash = async (data: any) => {
  const response = await apiClient.post(`/admin/finance/petty-cash`, data);
  return response.data.data;
};

export const deletePettyCash = async (id: string) => {
  const response = await apiClient.delete(`/admin/finance/petty-cash/${id}`);
  return response.data;
};

export const verifyFinancePin = async (pin: string) => {
  const response = await apiClient.post(`/admin/finance/verify-pin`, { pin });
  return response.data;
};

export const updateFinancePin = async (currentPin: string, pin: string) => {
  const response = await apiClient.patch(`/admin/finance/pin`, { currentPin, pin });
  return response.data;
};
