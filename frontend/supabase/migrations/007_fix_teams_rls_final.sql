-- ================================================
-- TEAMS - drop all old, recreate clean
-- ================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Team members can view team" ON teams;
  DROP POLICY IF EXISTS "teams_select" ON teams;
  DROP POLICY IF EXISTS "teams_insert" ON teams;
  DROP POLICY IF EXISTS "teams_update" ON teams;
  DROP POLICY IF EXISTS "teams_delete" ON teams;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teams_select" ON teams
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM team_members WHERE team_id = teams.id AND user_id = auth.uid())
  );

CREATE POLICY "teams_insert" ON teams
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "teams_update" ON teams
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

-- ================================================
-- TEAM_MEMBERS - drop all old, recreate clean
-- ================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "team_members_select" ON team_members;
  DROP POLICY IF EXISTS "team_members_insert" ON team_members;
  DROP POLICY IF EXISTS "team_members_update" ON team_members;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_members_select" ON team_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM teams WHERE id = team_members.team_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM team_members tm2 WHERE tm2.team_id = team_members.team_id AND tm2.user_id = auth.uid())
  );

CREATE POLICY "team_members_insert" ON team_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ================================================
-- DEPARTMENTS - drop all old, recreate clean
-- ================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "departments_select" ON departments;
  DROP POLICY IF EXISTS "departments_insert" ON departments;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "departments_select" ON departments
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM team_members WHERE team_id = departments.team_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM teams WHERE id = departments.team_id AND owner_id = auth.uid())
  );

CREATE POLICY "departments_insert" ON departments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
