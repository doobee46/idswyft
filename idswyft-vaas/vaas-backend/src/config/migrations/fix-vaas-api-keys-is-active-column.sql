-- Add is_active column to vaas_api_keys table
-- Fix for API key creation error: backend expects is_active but schema has enabled

-- Add is_active column to match backend expectations
ALTER TABLE vaas_api_keys ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Update existing records to sync is_active with enabled column
UPDATE vaas_api_keys SET is_active = enabled WHERE is_active IS NULL;

-- Create index for the new column for performance
CREATE INDEX IF NOT EXISTS idx_vaas_api_keys_is_active ON vaas_api_keys(is_active);

-- Note: This migration adds is_active as a duplicate of enabled
-- This ensures compatibility with the backend code while preserving the existing enabled column
-- A future migration could remove the enabled column if desired