export interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
  projectId: string | null;
  project?: {
    id: string;
    name: string;
  };
  meetingUrl: string | null;
  participants: {
    id: string;
    name: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: 'MEETING' | 'TASK' | 'PROJECT';
  color: string;
}
