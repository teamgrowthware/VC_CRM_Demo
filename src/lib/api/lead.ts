import apiClient from './apiClient';
import { Lead } from '@/types/lead';


export const getAllLeads = async (): Promise<Lead[]> => {
  const { data } = await apiClient.get(`/leads`);
  return data;
};

export const getLeadById = async (id: string): Promise<Lead> => {
  const { data } = await apiClient.get(`/leads/${id}`);
  return data;
};

export const createLead = async (lead: Partial<Lead>): Promise<Lead> => {
  const { data } = await apiClient.post(`/leads`, lead);
  return data;
};

export const updateLead = async (id: string, updates: Partial<Lead>): Promise<Lead> => {
  const { data } = await apiClient.put(`/leads/${id}`, updates);
  return data;
};

export const deleteLead = async (id: string): Promise<void> => {
  await apiClient.delete(`/leads/${id}`);
};
