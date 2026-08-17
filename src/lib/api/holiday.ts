import api from './apiClient';

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'PUBLIC' | 'COMPANY';
}

export const addHoliday = async (data: { name: string; date: string; type: string }) => {
  const response = await api.post('/holidays', data);
  return response.data;
};

export const getHolidays = async (): Promise<Holiday[]> => {
  const response = await api.get('/holidays');
  return response.data.data;
};

export const deleteHoliday = async (id: string) => {
  const response = await api.delete(`/holidays/${id}`);
  return response.data;
};
