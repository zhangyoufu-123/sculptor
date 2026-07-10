-- supabase/migrations/001_feedback_logs.sql
-- Run in Supabase SQL Editor to create the feedback_logs table.

CREATE TABLE IF NOT EXISTS feedback_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  suggestion_text TEXT,
  action VARCHAR(20) CHECK (action IN ('accept','reject','modify')),
  context_preview TEXT,
  style_profile_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user
  ON feedback_logs(user_id, created_at DESC);

ALTER TABLE feedback_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own feedback"
  ON feedback_logs
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
