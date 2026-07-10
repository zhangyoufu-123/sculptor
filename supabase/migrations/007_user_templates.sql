-- supabase/migrations/007_user_templates.sql
CREATE TABLE IF NOT EXISTS user_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own templates" ON user_templates TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- Add source and custom_fields to skeletons
ALTER TABLE skeletons ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual';
ALTER TABLE skeletons ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
