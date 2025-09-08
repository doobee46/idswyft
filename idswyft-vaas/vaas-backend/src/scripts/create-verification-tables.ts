import '../config/index.js'; // Load environment variables
import { vaasSupabase } from '../config/database.js';

async function createVerificationDocumentsTable() {
  try {
    console.log('🔄 Creating vaas_verification_documents table...');
    
    // First check if table already exists
    const { data: existingTable } = await vaasSupabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'vaas_verification_documents')
      .single();
    
    if (existingTable) {
      console.log('✅ Table vaas_verification_documents already exists');
    } else {
      // Create the table using raw SQL
      const createTableSQL = `
-- Create verification documents table for storing uploaded files
CREATE TABLE vaas_verification_documents (
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
      `;
      
      const { error: createError } = await vaasSupabase.rpc('exec_sql', { 
        sql: createTableSQL 
      });
      
      if (createError) {
        console.error('❌ Failed to create table:', createError);
        throw createError;
      }
      
      console.log('✅ Table vaas_verification_documents created successfully');
    }
    
    // Create indexes
    const createIndexesSQL = `
-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_vaas_verification_documents_session_id 
  ON vaas_verification_documents(verification_session_id);

CREATE INDEX IF NOT EXISTS idx_vaas_verification_documents_type 
  ON vaas_verification_documents(document_type);
    `;
    
    const { error: indexError } = await vaasSupabase.rpc('exec_sql', { 
      sql: createIndexesSQL 
    });
    
    if (indexError) {
      console.warn('⚠️  Warning: Failed to create indexes:', indexError);
      // Don't fail for index creation issues
    } else {
      console.log('✅ Indexes created successfully');
    }
    
    // Create trigger function and trigger
    const createTriggerSQL = `
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
    `;
    
    const { error: triggerError } = await vaasSupabase.rpc('exec_sql', { 
      sql: createTriggerSQL 
    });
    
    if (triggerError) {
      console.warn('⚠️  Warning: Failed to create trigger:', triggerError);
      // Don't fail for trigger creation issues
    } else {
      console.log('✅ Trigger created successfully');
    }
    
    // Grant permissions
    const grantPermissionsSQL = `
-- Grant permissions to authenticated users
GRANT ALL ON vaas_verification_documents TO authenticated;
GRANT ALL ON vaas_verification_documents TO anon;
    `;
    
    const { error: permissionError } = await vaasSupabase.rpc('exec_sql', { 
      sql: grantPermissionsSQL 
    });
    
    if (permissionError) {
      console.warn('⚠️  Warning: Failed to grant permissions:', permissionError);
    } else {
      console.log('✅ Permissions granted successfully');
    }
    
  } catch (error) {
    console.error('❌ Error creating verification documents table:', error);
    throw error;
  }
}

async function addVerificationSessionFields() {
  try {
    console.log('🔄 Adding fields to vaas_verification_sessions table...');
    
    // Add liveness_data and submitted_at columns
    const addColumnsSQL = `
-- Add missing fields to vaas_verification_sessions table for customer portal functionality
ALTER TABLE vaas_verification_sessions 
ADD COLUMN IF NOT EXISTS liveness_data JSONB DEFAULT '{}';

ALTER TABLE vaas_verification_sessions 
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;
    `;
    
    const { error: columnError } = await vaasSupabase.rpc('exec_sql', { 
      sql: addColumnsSQL 
    });
    
    if (columnError) {
      console.error('❌ Failed to add columns:', columnError);
      throw columnError;
    }
    
    console.log('✅ Columns added successfully');
    
    // Add comments
    const addCommentsSQL = `
-- Update the comment for the table
COMMENT ON TABLE vaas_verification_sessions IS 'Verification sessions for customer portal with document upload and liveness checks';
COMMENT ON COLUMN vaas_verification_sessions.liveness_data IS 'Stores liveness detection data from customer portal';
COMMENT ON COLUMN vaas_verification_sessions.submitted_at IS 'When the verification was submitted by the end user';
    `;
    
    const { error: commentError } = await vaasSupabase.rpc('exec_sql', { 
      sql: addCommentsSQL 
    });
    
    if (commentError) {
      console.warn('⚠️  Warning: Failed to add comments:', commentError);
    } else {
      console.log('✅ Comments added successfully');
    }
    
  } catch (error) {
    console.error('❌ Error adding verification session fields:', error);
    throw error;
  }
}

async function runMigrations() {
  try {
    console.log('🚀 Starting VaaS verification migrations...');
    
    await createVerificationDocumentsTable();
    await addVerificationSessionFields();
    
    console.log('🎉 All migrations completed successfully!');
    console.log('✨ VaaS backend is now ready for customer portal document uploads');
    
  } catch (error) {
    console.error('💥 Migration process failed:', error);
    throw error;
  }
}

// Run the migrations
runMigrations()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });