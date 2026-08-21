import axios from 'axios';
import { API_URL } from './apiClient';

const authConfig = () => ({ withCredentials: true });

export const getPortfolioProjects = async () => {
    const response = await axios.get(`${API_URL}/portfolio`, authConfig());
    return response.data;
};

export const getPortfolioProjectById = async (id: string) => {
    const response = await axios.get(`${API_URL}/portfolio/${id}`, authConfig());
    return response.data;
};

export const createPortfolioProject = async (data: Record<string, unknown>) => {
    const response = await axios.post(`${API_URL}/portfolio`, data, authConfig());
    return response.data;
};

export const updatePortfolioProject = async (id: string, data: Record<string, unknown>) => {
    const response = await axios.put(`${API_URL}/portfolio/${id}`, data, authConfig());
    return response.data;
};

export const deletePortfolioProject = async (id: string) => {
    const response = await axios.delete(`${API_URL}/portfolio/${id}`, authConfig());
    return response.data;
};
