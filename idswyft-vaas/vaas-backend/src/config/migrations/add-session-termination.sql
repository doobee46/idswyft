-- Add session termination support to vaas_verification_sessions table

-- Add terminated status to the enum
ALTER TABLE vaas_verification_sessions 
DROP CONSTRAINT vaas_verification_sessions_status_check;

ALTER TABLE vaas_verification_sessions 
ADD CONSTRAINT vaas_verification_sessions_status_check 
CHECK (status IN ('pending', 'document_uploaded', 'processing', 'completed', 'failed', 'expired', 'terminated'));

-- Add terminated_at column to track when session was terminated
ALTER TABLE vaas_verification_sessions 
ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMP WITH TIME ZONE;

-- Update the comment for the table
COMMENT ON COLUMN vaas_verification_sessions.terminated_at IS 'When the verification session was terminated (making the link inactive)';

-- Add index for terminated sessions
CREATE INDEX IF NOT EXISTS idx_vaas_verification_sessions_terminated ON vaas_verification_sessions(terminated_at) WHERE terminated_at IS NOT NULL;