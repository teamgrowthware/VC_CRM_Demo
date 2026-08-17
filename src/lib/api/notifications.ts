import apiClient from './apiClient';

export interface Notification {
  id: string;
  type: 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'TASK_COMPLETED' | 'COMMENT_ADDED' | 'PROJECT_UPDATED' | 'FILE_UPLOADED' | 'DEADLINE_APPROACHING' | 'TASK_OVERDUE' | 'LEAVE_APPROVED';
  message: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  total: number;
  unreadCountCount?: number; // legacy from controller returning it in separate field? Wait, let's keep it consistent.
  unreadCount?: number;
  page: number;
  totalPages: number;
}

export const getNotifications = async (limit = 50, page = 1): Promise<NotificationResponse> => {
  const { data } = await apiClient.get(`/notifications?limit=${limit}&page=${page}`, {
    
  });
  return data;
};

export const getUnreadCount = async (): Promise<number> => {
  const { data } = await apiClient.get(`/notifications/unread-count`, {
    
  });
  return data.unreadCount;
};

export const markAsRead = async (id: string): Promise<void> => {
  const { data } = await apiClient.patch(`/notifications/${id}/read`, {}, {
    
  });
  return data;
};

export const markAllAsRead = async (): Promise<void> => {
  await apiClient.patch(`/notifications/read-all`, {}, {
    
  });
};
