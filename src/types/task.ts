export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'TESTING' | 'COMPLETED';

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  author?: {
    id: string;
    name: string;
    role: string;
  };
  content: string;
  createdAt: string;
}

export interface SubTask {
  id: string;
  taskId: string;
  title: string;
  isDone: boolean;
  createdAt: string;
}

export interface TaskDocument {
  id: string;
  name: string;
  url: string;
  type: string;
  uploadedAt: string;
}

export interface Task {
  id: string;
  taskId: string;
  projectId?: string | null;
  project?: {
    id: string;
    name: string;
    projectId?: string;
  };
  title: string;
  description: string | null;
  assignedId: string | null;
  assignedTo?: {
    id: string;
    name: string;
    email?: string;
  } | null;
  createdById: string | null;
  createdBy?: {
    id: string;
    name: string;
  } | null;
  priority: TaskPriority;
  status: TaskStatus;
  issueType?: 'EPIC' | 'STORY' | 'TASK' | 'BUG';
  storyPoints?: number | null;
  sprintId?: string | null;
  startDate: string | null;
  deadline: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  comments?: Comment[];
  subTasks?: SubTask[];
  documents?: TaskDocument[];
}
