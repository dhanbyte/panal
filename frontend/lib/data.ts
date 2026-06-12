import { supabase } from '@/lib/supabase';
import type {
  Department,
  LeaderboardRow,
  NotificationItem,
  Task,
  TaskStatus,
  Team,
  TeamMember,
} from '@/lib/types';
import { calculateScore } from '@/lib/utils';

const DEFAULT_DEPARTMENTS: Department['name'][] = [
  'Marketing',
  'Orders',
  'Development',
  'Wholesale',
  'SEO',
  'Sales',
];

export async function ensureUserProfile(params: {
  id: string;
  email: string | undefined;
  fullName?: string;
}) {
  const { id, email, fullName } = params;
  if (!email) return;

  await supabase.from('users').upsert(
    {
      id,
      email,
      full_name: fullName ?? null,
    },
    { onConflict: 'id' }
  );
}

export async function loadOwnedTeams(ownerId: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Team[];
}

export async function createTeam(ownerId: string, name: string) {
  const { data, error } = await supabase
    .from('teams')
    .insert({ owner_id: ownerId, name })
    .select('*')
    .single();

  if (error) throw error;

  const team = data as Team;

  const { error: ownerMemberError } = await supabase.from('team_members').insert({
    team_id: team.id,
    user_id: ownerId,
    role: 'owner',
  });

  if (ownerMemberError) throw ownerMemberError;

  const rows = DEFAULT_DEPARTMENTS.map((department) => ({
    team_id: team.id,
    name: department,
  }));

  await supabase.from('departments').insert(rows);

  return team;
}

export async function loadTeamMembers(teamId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('id,team_id,user_id,role,join_date,users(id,email,full_name)')
    .eq('team_id', teamId)
    .order('join_date', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    team_id: row.team_id,
    user_id: row.user_id,
    role: row.role,
    join_date: row.join_date,
    user: row.users
      ? {
          id: row.users.id,
          email: row.users.email,
          full_name: row.users.full_name,
        }
      : undefined,
  }));
}

export async function inviteTeamMemberByEmail(params: {
  teamId: string;
  email: string;
  role?: TeamMember['role'];
  invitedBy: string;
}) {
  const { teamId, email, role = 'member', invitedBy } = params;

  const { data: userRecord, error: userError } = await supabase
    .from('users')
    .select('id,email,full_name')
    .eq('email', email)
    .single();

  if (userError || !userRecord) {
    throw new Error('User not found. Please ask user to register first.');
  }

  const { error: memberError } = await supabase.from('team_members').upsert(
    {
      team_id: teamId,
      user_id: userRecord.id,
      role,
    },
    { onConflict: 'team_id,user_id' }
  );

  if (memberError) throw memberError;

  const { error: notificationError } = await supabase.from('notifications').insert({
    user_id: userRecord.id,
    type: 'task_updated',
    message: `You were added to a team by ${invitedBy}.`,
  });

  if (notificationError) throw notificationError;
}

export async function loadTeamDepartments(teamId: string): Promise<Department[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('team_id', teamId)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Department[];
}

export async function createTask(input: {
  title: string;
  description: string;
  departmentId: string;
  assignedTo: string;
  assignedBy: string;
  dueDate?: string;
}) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: input.title,
      description: input.description,
      department_id: input.departmentId,
      assigned_to: input.assignedTo,
      assigned_by: input.assignedBy,
      due_date: input.dueDate ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;

  await supabase.from('notifications').insert({
    user_id: input.assignedTo,
    task_id: data.id,
    type: 'task_assigned',
    message: `New task assigned: ${input.title}`,
  });

  return data as Task;
}

export async function loadTasksForUser(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, departments(id,name,team_id,created_at)')
    .or(`assigned_to.eq.${userId},assigned_by.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    department: row.departments
      ? {
          id: row.departments.id,
          name: row.departments.name,
          team_id: row.departments.team_id,
          created_at: row.departments.created_at,
        }
      : undefined,
  })) as Task[];
}

export async function startTask(taskId: string) {
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', taskId);

  if (error) throw error;
}

export async function updateTaskProgress(input: {
  taskId: string;
  progress: number;
  timeSpent: number;
  status?: TaskStatus;
  comment?: string;
  userId: string;
}) {
  const payload: any = {
    progress_percentage: input.progress,
    time_spent: input.timeSpent,
  };

  if (input.status) payload.status = input.status;
  if (input.progress >= 100) {
    payload.status = 'completed';
    payload.completed_at = new Date().toISOString();
  }

  const { error } = await supabase.from('tasks').update(payload).eq('id', input.taskId);
  if (error) throw error;

  if (input.comment && input.comment.trim()) {
    await supabase.from('task_comments').insert({
      task_id: input.taskId,
      user_id: input.userId,
      comment: input.comment.trim(),
    });
  }

  await supabase.from('notifications').insert({
    user_id: input.userId,
    task_id: input.taskId,
    type: input.progress >= 100 ? 'task_completed' : 'task_updated',
    message:
      input.progress >= 100
        ? 'A task has been marked completed.'
        : `Task progress updated to ${input.progress}%.`,
  });
}

export async function uploadTaskAudio(input: {
  taskId: string;
  file: Blob;
  userId: string;
}) {
  const fileName = `${input.userId}/${input.taskId}-${Date.now()}.webm`;

  const { data, error } = await supabase.storage
    .from('task-audio')
    .upload(fileName, input.file, { contentType: 'audio/webm', upsert: false });

  if (error) throw error;

  const { data: publicData } = supabase.storage.from('task-audio').getPublicUrl(data.path);

  const { error: insertError } = await supabase.from('task_attachments').insert({
    task_id: input.taskId,
    file_type: 'audio',
    file_url: publicData.publicUrl,
    file_name: fileName,
    file_size: input.file.size,
  });

  if (insertError) throw insertError;

  return publicData.publicUrl;
}

export async function loadNotifications(userId: string): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;
  return (data ?? []) as NotificationItem[];
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) throw error;
}

export async function loadLeaderboard(teamId?: string): Promise<LeaderboardRow[]> {
  // Fetch all users
  const { data: usersData, error: userError } = await supabase
    .from('users')
    .select('id, full_name, email');
  if (userError) throw userError;

  // Fetch all task_assignees joined with tasks
  const { data: assigneesData, error: assignError } = await supabase
    .from('task_assignees')
    .select('user_id, task_id, tasks(status, time_spent)');
  if (assignError) throw assignError;

  const userMap = new Map<string, {
    tasks_completed: number;
    tasks_assigned: number;
    tasks_remaining: number;
    total_time_spent: number;
  }>();

  // Initialize all users with 0 stats
  (usersData ?? []).forEach((u) => {
    userMap.set(u.id, {
      tasks_completed: 0,
      tasks_assigned: 0,
      tasks_remaining: 0,
      total_time_spent: 0,
    });
  });

  // Aggregate stats from task_assignees
  (assigneesData ?? []).forEach((row: any) => {
    const task = row.tasks;
    if (!task) return;

    let current = userMap.get(row.user_id);
    if (!current) {
      // In case user is in assignees but not in users table (orphan record)
      current = {
        tasks_completed: 0,
        tasks_assigned: 0,
        tasks_remaining: 0,
        total_time_spent: 0,
      };
      userMap.set(row.user_id, current);
    }

    current.tasks_assigned += 1;
    if (task.status === 'completed') {
      current.tasks_completed += 1;
      current.total_time_spent += Number(task.time_spent || 0);
    } else {
      current.tasks_remaining += 1;
    }
  });

  const rows: LeaderboardRow[] = (usersData ?? []).map((u) => {
    const stats = userMap.get(u.id)!;
    const avg = stats.tasks_completed > 0 ? Math.floor(stats.total_time_spent / stats.tasks_completed) : 0;

    return {
      user_id: u.id,
      name: u.full_name || u.email || 'Unknown',
      tasks_completed: stats.tasks_completed,
      tasks_assigned: stats.tasks_assigned,
      tasks_remaining: stats.tasks_remaining,
      avg_completion_time: avg,
      total_time_spent: stats.total_time_spent,
      score: calculateScore(stats.tasks_completed, avg, stats.total_time_spent),
    };
  });

  return rows.sort((a, b) => b.score - a.score);
}
