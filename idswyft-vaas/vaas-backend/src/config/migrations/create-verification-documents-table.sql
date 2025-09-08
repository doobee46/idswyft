-- Create verification documents table for storing uploaded files
CREATE TABLE IF NOT EXISTS vaas_verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_session_id UUID NOT NULL REFERENCES vaas_verification_sessions(id) ON DELETE CASCADE,
  document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('front', 'back', 'selfie')),
  filename VARCHAR(255) NOT NULL,
  mimetype VARCHAR(100) NOT NULL,
  size INTEGER NOT NULL,
  file_path TEXT NOT NULL, -- S3 URL or local path
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_vaas_verification_documents_session_id 
  ON vaas_verification_documents(verification_session_id);

CREATE INDEX IF NOT EXISTS idx_vaas_verification_documents_type 
  ON vaas_verification_documents(document_type);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_vaas_verification_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vaas_verification_documents_updated_at
  BEFORE UPDATE ON vaas_verification_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_vaas_verification_documents_updated_at();

-- Grant permissions to authenticated users
GRANT ALL ON vaas_verification_documents TO authenticated;
GRANT ALL ON vaas_verification_documents TO anon;