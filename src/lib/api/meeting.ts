import apiClient from './apiClient';
import { Meeting, CalendarEvent } from '@/types/meeting';


export const getAllMeetings = async (): Promise<Meeting[]> => {
  const { data } = await apiClient.get(`/meetings`);
  return data;
};

export const createMeeting = async (meeting: Partial<Meeting>): Promise<Meeting> => {
  const { data } = await apiClient.post(`/meetings`, meeting);
  return data;
};

export const getCalendarEvents = async (): Promise<CalendarEvent[]> => {
  const { data } = await apiClient.get(`/meetings/calendar`);
  return data;
};
