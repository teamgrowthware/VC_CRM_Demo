import apiClient from './apiClient';
import { Employee, CreateEmployeeData, UpdateEmployeeData } from '../../types/employee';


// Example: Retrieve the token from localStorage (assuming token-based auth is implemented)
export const fetchEmployees = async (): Promise<Employee[]> => {
  const response = await apiClient.get(`/employees`, {
    
  });
  return response.data.data;
};

export const createEmployee = async (data: CreateEmployeeData): Promise<Employee> => {
  const response = await apiClient.post(`/employees`, data, {
    
  });
  return response.data.data;
};

export const updateEmployee = async (id: string, data: UpdateEmployeeData): Promise<Employee> => {
  const response = await apiClient.put(`/employees/${id}`, data, {
    
  });
  return response.data.data;
};

export const toggleEmployeeStatus = async (id: string): Promise<Employee> => {
  const response = await apiClient.patch(`/employees/${id}/status`, {}, {
    
  });
  return response.data.data;
};

export const deleteEmployee = async (id: string): Promise<void> => {
  await apiClient.delete(`/employees/${id}`, {
    
  });
};
