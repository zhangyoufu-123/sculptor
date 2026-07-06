-- supabase/migrations/002_context_memory.sql
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS context_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  memory_type VARCHAR(50),
  memory_data JSONB NOT NULL,
  importance FLOAT DEFAULT 0.5,
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_context_memory_user
  ON context_memory(user_id, document_id);

CREATE INDEX IF NOT EXISTS idx_context_memory_importance
  ON context_memory(user_id, importance DESC);

ALTER TABLE context_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own memory"
  ON context_memory
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
