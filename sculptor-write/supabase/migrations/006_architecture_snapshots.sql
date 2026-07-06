-- supabase/migrations/006_architecture_snapshots.sql

CREATE TABLE IF NOT EXISTS architecture_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skeleton_id UUID REFERENCES skeletons(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE architecture_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own snapshots"
  ON architecture_snapshots
  TO authenticated
  USING (
    skeleton_id IN (
      SELECT s.id FROM skeletons s
      JOIN documents d ON s.document_id = d.id
      WHERE d.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    skeleton_id IN (
      SELECT s.id FROM skeletons s
      JOIN documents d ON s.document_id = d.id
      WHERE d.user_id = (SELECT auth.uid())
    )
  );
