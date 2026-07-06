-- supabase/migrations/003_style_samples.sql
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS style_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) DEFAULT '默认风格',
  samples JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  compliance_rate FLOAT DEFAULT 0.5,
  evolution JSONB DEFAULT '[]',
  user_adjustments JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_style
  ON style_samples(user_id) WHERE is_active = TRUE;

ALTER TABLE style_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own style samples"
  ON style_samples
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
