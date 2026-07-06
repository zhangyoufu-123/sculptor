-- supabase/migrations/004_document_contents.sql
-- Versioned document content storage for diff/restore.

CREATE TABLE IF NOT EXISTS document_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  tiptap_json JSONB NOT NULL,
  plain_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_contents_document
  ON document_contents(document_id, version DESC);

ALTER TABLE document_contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own document contents"
  ON document_contents
  TO authenticated
  USING (
    document_id IN (
      SELECT id FROM documents WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    document_id IN (
      SELECT id FROM documents WHERE user_id = (SELECT auth.uid())
    )
  );

-- Add current_version_id to documents if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'current_version_id'
  ) THEN
    ALTER TABLE documents ADD COLUMN current_version_id UUID;
  END IF;
END $$;
