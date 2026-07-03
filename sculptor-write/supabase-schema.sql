-- Sculptor — Supabase Schema
-- Run this in the Supabase SQL Editor to initialize the database.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Analyses table: stores every analysis request and result
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT,
  source_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying by creation time (dashboard / history)
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses (created_at DESC);

-- Index for looking up by URL
CREATE INDEX IF NOT EXISTS idx_analyses_source_url ON analyses (source_url);

-- Enable Row Level Security
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (from the API route)
CREATE POLICY "Allow public inserts"
  ON analyses
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow public reads (for dashboard display)
CREATE POLICY "Allow public reads"
  ON analyses
  FOR SELECT
  TO anon
  USING (true);
