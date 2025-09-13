-- Fix vaas_api_keys table schema issues
-- Addresses multiple backend compatibility problems:
-- 1. Missing is_active column (backend expects is_active but schema has enabled)
-- 2. Missing description column (backend tries to save description but column doesn't exist)
-- 3. Missing key_name column (backend expects key_name but schema has name)

-- Add is_active column to match backend expectations
ALTER TABLE vaas_api_keys ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add description column that backend expects
ALTER TABLE vaas_api_keys ADD COLUMN IF NOT EXISTS description TEXT;

-- Add key_name column that backend expects
ALTER TABLE vaas_api_keys ADD COLUMN IF NOT EXISTS key_name VARCHAR(100);

-- Update existing records to sync columns
UPDATE vaas_api_keys SET is_active = enabled WHERE is_active IS NULL;
UPDATE vaas_api_keys SET key_name = name WHERE key_name IS NULL;

-- Create indexes for the new columns for performance
CREATE INDEX IF NOT EXISTS idx_vaas_api_keys_is_active ON vaas_api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_vaas_api_keys_description ON vaas_api_keys(description) WHERE description IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vaas_api_keys_key_name ON vaas_api_keys(key_name);

-- Note: This migration adds missing columns to ensure backend compatibility
-- - is_active duplicates enabled functionality for backward compatibility
-- - description allows storing API key descriptions as expected by the backend
-- - key_name duplicates name functionality to match frontend API expectations