import apiClient from './apiClient';
import { Project, ProjectMember, Document } from '@/types/project';


export const getAllProjects = async (): Promise<Project[]> => {
  const { data } = await apiClient.get(`/projects`);
  return data;
};

export const getProjectById = async (id: string): Promise<Project> => {
  const { data } = await apiClient.get(`/projects/${id}`);
  return data.project;
};

export const createProject = async (project: Partial<Project>): Promise<Project> => {
  const { data } = await apiClient.post(`/projects`, project);
  return data.project;
};

export const updateProject = async (id: string, updates: Partial<Project>): Promise<Project> => {
  const { data } = await apiClient.put(`/projects/${id}`, updates);
  return data.project;
};

export const deleteProject = async (id: string): Promise<void> => {
  await apiClient.delete(`/projects/${id}`);
};

export const assignEmployeeToProject = async (projectId: string, employeeId: string, role: string): Promise<ProjectMember> => {
  const { data } = await apiClient.post(`/projects/${projectId}/member`, { employeeId, role });
  return data.member;
};

export const removeEmployeeFromProject = async (projectId: string, employeeId: string): Promise<void> => {
  await apiClient.delete(`/projects/${projectId}/member/${employeeId}`);
};

export const uploadProjectDocument = async (projectId: string, file: File): Promise<Document> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const { data } = await apiClient.post(`/projects/${projectId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data.document;
};

// Financial & Milestone APIs
export const getProjectMilestones = async (projectId: string) => {
  const { data } = await apiClient.get(`/projects/${projectId}/milestones`);
  return data.milestones;
};

export const createMilestone = async (projectId: string, milestone: any) => {
  const { data } = await apiClient.post(`/projects/${projectId}/milestones`, milestone);
  return data.milestone;
};

export const updateMilestone = async (milestoneId: string, updates: any) => {
  const { data } = await apiClient.put(`/projects/milestones/${milestoneId}`, updates);
  return data.milestone;
};

export const recordPayment = async (projectId: string, payment: any) => {
  const { data } = await apiClient.post(`/projects/${projectId}/payments`, payment);
  return data.payment;
};

export const getFinanceAnalytics = async () => {
  const { data } = await apiClient.get(`/projects/finance/analytics`);
  return data;
};

export const finalizeProjectFinance = async (projectId: string) => {
  const { data } = await apiClient.post(`/projects/${projectId}/finance/finalize`);
  return data;
};
