import apiClient from './apiClient';

export interface ChatMember {
  id: string;
  roomId: string;
  employeeId: string | null;
  employee: {
    name: string;
    employeeId: string; // The physical employee ID (e.g. VC001)
  } | null;
  clientId: string | null;
  client: {
    name: string;
    clientId: string; // e.g. CL001
    company?: string | null;
  } | null;
  isAdmin: boolean;
  isPinned: boolean;
  isFavorite: boolean;
  isMuted: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  lastReadAt?: string | null;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string | null;
  senderClientId: string | null;
  receiverId?: string | null;
  receiverClientId?: string | null;
  content: string;
  fileUrl?: string | null;
  fileType?: string | null;
  createdAt: string;
  sender?: {
    name: string;
    employeeId: string;
  } | null;
  senderClient?: {
    name: string;
    clientId: string;
  } | null;
  mentions?: { employeeId: string }[];
}

export interface ChatRoom {
  id: string;
  name?: string | null;
  description?: string | null;
  avatarUrl?: string | null;
  type: 'PERSONAL' | 'GROUP' | 'DEPARTMENT' | 'HR_SUPPORT';
  isArchived: boolean;
  isDeleted: boolean;
  createdBy?: string | null;
  members: ChatMember[];
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export const memberDisplayName = (m: ChatMember) => m.employee?.name || m.client?.name || 'Unknown';
export const isClientMember = (m: ChatMember) => !!m.clientId;

export const getMyChatRooms = async (): Promise<ChatRoom[]> => {
  const { data } = await apiClient.get(`/chat/rooms`);
  return data;
};

export const createChatRoom = async (name: string | null, type: string, memberIds: string[], description?: string): Promise<{chatRoom: ChatRoom}> => {
  const { data } = await apiClient.post(`/chat/rooms`, 
    { name, type, memberIds, description }
  );
  return data;
};

export const getMessagesByRoom = async (roomId: string, limit = 50, cursor?: string): Promise<Message[]> => {
  const { data } = await apiClient.get(`/chat/rooms/${roomId}/messages`, {
    
    params: { limit, cursor }
  });
  return data;
};

export const sendMessage = async (roomId: string, content: string, receiverId?: string, fileUrl?: string, fileType?: string): Promise<{newMessage: Message}> => {
  const { data } = await apiClient.post(`/chat/messages`, 
    { roomId, content, receiverId, fileUrl, fileType }
  );
  return data;
};

export const uploadChatFile = async (file: File): Promise<{url: string, type: string, name: string, size: number}> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const { data } = await apiClient.post(`/chat/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    }
  });
  return data;
};

// Advanced Endpoints
export const updateChatGroup = async (roomId: string, updates: Partial<ChatRoom>): Promise<ChatRoom> => {
  const { data } = await apiClient.put(`/chat/rooms/${roomId}`, updates);
  return data;
};

export const updateChatPreferences = async (roomId: string, preferences: Partial<ChatMember>): Promise<ChatMember> => {
  const { data } = await apiClient.put(`/chat/rooms/${roomId}/preferences`, preferences);
  return data;
};

export const softDeleteChatGroup = async (roomId: string): Promise<ChatRoom> => {
  const { data } = await apiClient.delete(`/chat/rooms/${roomId}`);
  return data;
};

export const restoreChatGroup = async (roomId: string): Promise<ChatRoom> => {
  const { data } = await apiClient.post(`/chat/rooms/${roomId}/restore`);
  return data;
};

export const addGroupMember = async (roomId: string, employeeId: string): Promise<ChatMember> => {
  const { data } = await apiClient.post(`/chat/rooms/${roomId}/members`, { employeeId });
  return data;
};

export const removeGroupMember = async (roomId: string, employeeId: string): Promise<{ success: boolean }> => {
  const { data } = await apiClient.delete(`/chat/rooms/${roomId}/members/${employeeId}`);
  return data;
};
