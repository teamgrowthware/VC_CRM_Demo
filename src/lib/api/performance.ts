import apiClient from './apiClient';
import { PerformanceReview } from '@/types/performance';


export const getAllReviews = async (): Promise<PerformanceReview[]> => {
  const { data } = await apiClient.get(`/performance`);
  return data;
};

export const getEmployeeReviews = async (employeeId: string): Promise<PerformanceReview[]> => {
  const { data } = await apiClient.get(`/performance/employee/${employeeId}`);
  return data;
};

export const createReview = async (review: Partial<PerformanceReview>): Promise<PerformanceReview> => {
  const { data } = await apiClient.post(`/performance`, review);
  return data;
};
