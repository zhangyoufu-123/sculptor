-- Sculptor — Supabase Schema
-- Run this in the Supabase SQL Editor to initialize the database.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- AUTH TABLES (managed by @auth/supabase-adapter)
-- Run these FIRST to create the users table before tables that reference it.
-- ================================================================

-- The adapter manages: users, accounts, sessions, verification_tokens
-- The users table is the core identity table.
-- If you run the adapter migration, it auto-creates:
--   users, accounts, sessions, verification_tokens
-- This file includes them for explicit reference.

-- ================================================================
-- APPLICATION TABLES
-- ================================================================

-- Documents: user-authored documents in the editor
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) DEFAULT 'Untitled',
  content JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents (user_id);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents (updated_at DESC);

-- Style profiles: per-user writing style configuration
CREATE TABLE IF NOT EXISTS style_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  profile JSONB NOT NULL,
  keywords TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_style_profiles_user_id ON style_profiles (user_id);

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

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

-- Documents: users can read/edit their own
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own documents"
  ON documents
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Style profiles: users can read/edit their own
ALTER TABLE style_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own style profile"
  ON style_profiles
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Analyses: allow public inserts and reads (existing behavior)
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public inserts"
  ON analyses
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public reads"
  ON analyses
  FOR SELECT
  TO anon
  USING (true);
