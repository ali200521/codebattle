-- Allow users to insert and update squads
DROP POLICY IF EXISTS "Users can create squads" ON squads;
CREATE POLICY "Users can create squads" ON squads
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update squads" ON squads;
CREATE POLICY "Users can update squads" ON squads
  FOR UPDATE USING (true);
