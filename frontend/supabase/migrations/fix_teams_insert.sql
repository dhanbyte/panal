-- Sirf yeh run karo Supabase SQL Editor mein

DROP POLICY IF EXISTS "teams_insert" ON teams;

CREATE POLICY "teams_insert" ON teams
  FOR INSERT TO authenticated
  WITH CHECK (true);
