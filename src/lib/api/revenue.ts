import api from './apiClient';

export interface Revenue {
  id: string;
  amount: number;
  source: string;
  description?: string;
  date: string;
}

export interface FinancialStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

export const getAllRevenue = async () => {
  const response = await api.get<Revenue[]>('/revenue');
  return response.data;
};

export const createRevenue = async (data: Omit<Revenue, 'id'>) => {
  const response = await api.post<Revenue>('/revenue', data);
  return response.data;
};

export const deleteRevenue = async (id: string) => {
  const response = await api.delete(`/revenue/${id}`);
  return response.data;
};

export const getFinancialStats = async () => {
  const response = await api.get<FinancialStats>('/revenue/stats');
  return response.data;
};
