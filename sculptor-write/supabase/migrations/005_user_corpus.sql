-- supabase/migrations/005_user_corpus.sql
-- User document corpus for RAG (vector indexing deferred to v2.2).

CREATE TABLE IF NOT EXISTS user_corpus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: ivfflat index requires pgvector extension
-- CREATE INDEX IF NOT EXISTS idx_user_corpus_embedding
--   ON user_corpus USING ivfflat (embedding vector_cosine_ops);

ALTER TABLE user_corpus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own corpus"
  ON user_corpus
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
