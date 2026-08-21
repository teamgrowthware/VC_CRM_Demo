import api from './apiClient';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const getActiveAnnouncements = async (): Promise<Announcement[]> => {
  const { data } = await api.get('/announcements/active');
  return data.announcements || [];
};

export const getAllAnnouncements = async (): Promise<Announcement[]> => {
  const { data } = await api.get('/announcements');
  return data.data || [];
};

export const getAnnouncementById = async (id: string): Promise<Announcement> => {
  const { data } = await api.get(`/announcements/${id}`);
  return data.data;
};

export const createAnnouncement = async (payload: {
  title: string;
  message: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  isActive?: boolean;
  expiresAt?: string | null;
}): Promise<Announcement> => {
  const { data } = await api.post('/announcements', payload);
  return data.data;
};

export const updateAnnouncement = async (
  id: string,
  payload: Partial<{
    title: string;
    message: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    isActive: boolean;
    expiresAt: string | null;
  }>
): Promise<Announcement> => {
  const { data } = await api.put(`/announcements/${id}`, payload);
  return data.data;
};

export const deleteAnnouncement = async (id: string): Promise<void> => {
  await api.delete(`/announcements/${id}`);
};

export const toggleAnnouncementActive = async (id: string): Promise<Announcement> => {
  const { data } = await api.patch(`/announcements/${id}/toggle`);
  return data.data;
};
