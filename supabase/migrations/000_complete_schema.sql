-- ============================================================
-- STEP 1: DROP everything (order matters due to foreign keys)
-- ============================================================
DROP TABLE IF EXISTS user_scores CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS task_attachments CASCADE;
DROP TABLE IF EXISTS task_comments CASCADE;
DROP TABLE IF EXISTS task_assignees CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- STEP 2: CREATE TABLES
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  work_role TEXT,
  department TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'manager', 'member')),
  join_date TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (name IN ('Marketing', 'Orders', 'Development', 'Wholesale', 'SEO', 'Sales')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, name)
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'partially_completed')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  time_spent INTEGER DEFAULT 0
);

CREATE TABLE task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'audio')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('task_assigned', 'task_completed', 'comment_added', 'task_updated')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  tasks_completed INTEGER DEFAULT 0,
  tasks_assigned INTEGER DEFAULT 0,
  avg_completion_time INTEGER DEFAULT 0,
  total_time_spent INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, team_id)
);

-- ============================================================
-- STEP 3: INDEXES
-- ============================================================
CREATE INDEX idx_teams_owner ON teams(owner_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_user ON task_assignees(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);

-- ============================================================
-- STEP 4: ENABLE RLS
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_scores ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 5: RLS POLICIES
-- ============================================================

-- USERS
CREATE POLICY "users_select" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_insert" ON users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update" ON users FOR UPDATE TO authenticated USING (auth.uid() = id);

-- TEAMS
CREATE POLICY "teams_select" ON teams FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR EXISTS (
    SELECT 1 FROM team_members WHERE team_id = teams.id AND user_id = auth.uid()
  ));
CREATE POLICY "teams_insert" ON teams FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "teams_update" ON teams FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

-- TEAM_MEMBERS
CREATE POLICY "team_members_select" ON team_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM teams WHERE id = team_members.team_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM team_members tm2 WHERE tm2.team_id = team_members.team_id AND tm2.user_id = auth.uid())
  );
CREATE POLICY "team_members_insert" ON team_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- DEPARTMENTS
CREATE POLICY "departments_select" ON departments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM team_members WHERE team_id = departments.team_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM teams WHERE id = departments.team_id AND owner_id = auth.uid())
  );
CREATE POLICY "departments_insert" ON departments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- TASKS
CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated
  USING (
    assigned_by = auth.uid()
    OR EXISTS (SELECT 1 FROM task_assignees WHERE task_id = tasks.id AND user_id = auth.uid())
  );
CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated
  WITH CHECK (assigned_by = auth.uid());
CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO authenticated
  USING (
    assigned_by = auth.uid()
    OR EXISTS (SELECT 1 FROM task_assignees WHERE task_id = tasks.id AND user_id = auth.uid())
  );

-- TASK_ASSIGNEES
CREATE POLICY "task_assignees_select" ON task_assignees FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM tasks WHERE id = task_assignees.task_id AND assigned_by = auth.uid())
  );
CREATE POLICY "task_assignees_insert" ON task_assignees FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM tasks WHERE id = task_assignees.task_id AND assigned_by = auth.uid())
  );

-- TASK_COMMENTS
CREATE POLICY "task_comments_select" ON task_comments FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM task_assignees WHERE task_id = task_comments.task_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM tasks WHERE id = task_comments.task_id AND assigned_by = auth.uid())
  );
CREATE POLICY "task_comments_insert" ON task_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- TASK_ATTACHMENTS
CREATE POLICY "task_attachments_select" ON task_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_attachments_insert" ON task_attachments FOR INSERT TO authenticated WITH CHECK (true);

-- NOTIFICATIONS
CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- USER_SCORES
CREATE POLICY "user_scores_select" ON user_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_scores_insert" ON user_scores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "user_scores_update" ON user_scores FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- STEP 6: STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('task-audio', 'task-audio', true, 10485760, ARRAY['audio/webm','audio/mp4','audio/ogg','audio/wav'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "audio_select" ON storage.objects;
DROP POLICY IF EXISTS "audio_insert" ON storage.objects;
DROP POLICY IF EXISTS "audio_delete" ON storage.objects;

CREATE POLICY "audio_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'task-audio');
CREATE POLICY "audio_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'task-audio');
CREATE POLICY "audio_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'task-audio');
