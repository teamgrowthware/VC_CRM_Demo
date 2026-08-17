import apiClient from './apiClient';
import { Task, Comment, SubTask, TaskDocument } from '@/types/task';


export const getAllTasks = async (): Promise<Task[]> => {
  const { data } = await apiClient.get(`/tasks`);
  return data;
};

export const getTasksByEmployee = async (employeeId: string): Promise<Task[]> => {
  const { data } = await apiClient.get(`/tasks/employee/${employeeId}`);
  return data;
};

export const getTasksByProject = async (projectId: string): Promise<Task[]> => {
  const { data } = await apiClient.get(`/tasks/project/${projectId}`);
  return data;
};

export const createTask = async (task: Partial<Task>): Promise<Task> => {
  const { data } = await apiClient.post(`/tasks`, task);
  return data.task;
};

export const updateTask = async (id: string, updates: Partial<Task>): Promise<Task> => {
  const { data } = await apiClient.put(`/tasks/${id}`, updates);
  return data.task;
};

export const changeTaskStatus = async (id: string, status: string): Promise<Task> => {
  const { data } = await apiClient.patch(`/tasks/${id}/status`, { status });
  return data.task;
};

export const assignTask = async (id: string, assignedId: string | null): Promise<Task> => {
  const { data } = await apiClient.patch(`/tasks/${id}/assign`, { assignedId });
  return data.task;
};

export const deleteTask = async (id: string): Promise<void> => {
  await apiClient.delete(`/tasks/${id}`);
};

export const getTaskComments = async (taskId: string): Promise<Comment[]> => {
  const { data } = await apiClient.get(`/tasks/${taskId}/comments`);
  return data;
};

export const addTaskComment = async (taskId: string, content: string): Promise<Comment> => {
  const { data } = await apiClient.post(`/tasks/${taskId}/comments`, { content });
  return data.comment;
};

// Sub-tasks
export const createSubTask = async (taskId: string, title: string): Promise<SubTask> => {
  const { data } = await apiClient.post(`/tasks/${taskId}/subtasks`, { title });
  return data.subTask;
};

export const toggleSubTask = async (subTaskId: string, isDone: boolean): Promise<SubTask> => {
  const { data } = await apiClient.patch(`/tasks/subtasks/${subTaskId}`, { isDone });
  return data.subTask;
};

export const deleteSubTask = async (subTaskId: string): Promise<void> => {
  await apiClient.delete(`/tasks/subtasks/${subTaskId}`);
};

// Attachments
export const uploadTaskAttachment = async (taskId: string, file: File): Promise<TaskDocument> => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post(`/tasks/${taskId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data.document;
};

export const deleteTaskAttachment = async (attachmentId: string): Promise<void> => {
  await apiClient.delete(`/tasks/attachments/${attachmentId}`);
};
