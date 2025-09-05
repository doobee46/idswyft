-- Extend users table for VaaS business requirements
-- Adding columns needed for comprehensive user profiles

-- Add phone column
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add name columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Add external ID for VaaS organization tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);

-- Add status column with default
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Add metadata for additional business data
ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_external_id ON users(external_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Add updated_at if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update the updated_at column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();