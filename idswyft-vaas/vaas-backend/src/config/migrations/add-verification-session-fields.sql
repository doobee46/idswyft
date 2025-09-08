-- Add missing fields to vaas_verification_sessions table for customer portal functionality

-- Add liveness_data column for storing liveness check data
ALTER TABLE vaas_verification_sessions 
ADD COLUMN IF NOT EXISTS liveness_data JSONB DEFAULT '{}';

-- Add submitted_at column to track when verification was submitted
ALTER TABLE vaas_verification_sessions 
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;

-- Update the comment for the table
COMMENT ON TABLE vaas_verification_sessions IS 'Verification sessions for customer portal with document upload and liveness checks';
COMMENT ON COLUMN vaas_verification_sessions.liveness_data IS 'Stores liveness detection data from customer portal';
COMMENT ON COLUMN vaas_verification_sessions.submitted_at IS 'When the verification was submitted by the end user';