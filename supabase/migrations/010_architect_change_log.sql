-- Architect change log: dual-end sync (canvas ↔ chat)
-- Every canvas or chat modification is recorded so AI can perceive manual edits.
CREATE TABLE IF NOT EXISTS architect_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source VARCHAR(10) CHECK (source IN ('chat','canvas')),
  action VARCHAR(30) CHECK (action IN ('add_node','delete_node','edit_title','move_node','change_type','add_edge','delete_edge')),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_log_document ON architect_change_log(document_id, created_at);
CREATE INDEX IF NOT EXISTS idx_change_log_source ON architect_change_log(document_id, source, created_at);

ALTER TABLE architect_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own change logs"
  ON architect_change_log FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own change logs"
  ON architect_change_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
