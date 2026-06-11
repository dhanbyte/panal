export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'partially_completed';

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'manager' | 'member';
  join_date: string;
  user?: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

export interface Department {
  id: string;
  team_id: string;
  name: 'Marketing' | 'Orders' | 'Development' | 'Wholesale' | 'SEO' | 'Sales';
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  department_id: string;
  assigned_to: string;
  assigned_by: string;
  status: TaskStatus;
  progress_percentage: number;
  due_date: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  time_spent: number;
  department?: Department;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  task_id: string | null;
  type: 'task_assigned' | 'task_completed' | 'comment_added' | 'task_updated';
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface LeaderboardRow {
  user_id: string;
  name: string;
  tasks_completed: number;
  tasks_assigned: number;
  avg_completion_time: number;
  total_time_spent: number;
  score: number;
}
