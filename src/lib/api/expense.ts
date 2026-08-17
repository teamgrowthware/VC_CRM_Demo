import apiClient from './apiClient';
import { Expense } from '@/types/expense';


export const getAllExpenses = async (): Promise<Expense[]> => {
  const { data } = await apiClient.get(`/expenses`);
  return data;
};

export const createExpense = async (expense: Partial<Expense>): Promise<Expense> => {
  const { data } = await apiClient.post(`/expenses`, expense);
  return data;
};

export const updateExpenseStatus = async (id: string, status: string): Promise<Expense> => {
  const { data } = await apiClient.patch(`/expenses/${id}/status`, { status });
  return data;
};

export const deleteExpense = async (id: string): Promise<void> => {
  await apiClient.delete(`/expenses/${id}`);
};
