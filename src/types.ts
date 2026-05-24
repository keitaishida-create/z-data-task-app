export interface Task {
  rowIndex: number;
  majorCategory: string;
  minorCategory: string;
  task: string;
  assignees: string[];
  dueDate: string;
  status: string;
}

export interface Category {
  rowIndex: number;
  majorCategory: string;
  minorCategory: string;
  defaultAssignees: string[];
}

export type ViewMode = 'tasks' | 'archive' | 'categories';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LoginResult {
  token: string;
  pic: string;
  name: string;
}
