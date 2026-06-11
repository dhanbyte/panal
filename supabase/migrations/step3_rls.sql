-- ============================================================
-- QUERY 3: RLS + Storage — tables banne ke baad run karo
-- ============================================================

-- Enable RLS
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

-- STORAGE
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('task-audio', 'task-audio', true, 10485760, ARRAY['audio/webm','audio/mp4','audio/ogg','audio/wav'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "audio_select" ON storage.objects;
DROP POLICY IF EXISTS "audio_insert" ON storage.objects;
DROP POLICY IF EXISTS "audio_delete" ON storage.objects;
CREATE POLICY "audio_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'task-audio');
CREATE POLICY "audio_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'task-audio');
CREATE POLICY "audio_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'task-audio');
