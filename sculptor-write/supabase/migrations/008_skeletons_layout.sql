-- supabase/migrations/008_skeletons_layout.sql
-- Add layout_data to skeletons for manual position tracking

ALTER TABLE skeletons ADD COLUMN IF NOT EXISTS layout_data JSONB DEFAULT '{"manual":false,"positions":{}}';
ALTER TABLE skeletons ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual';
ALTER TABLE skeletons ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
