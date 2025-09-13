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

-- Remove NOT NULL constraint from name column to prevent constraint violations
-- Backend now uses key_name but name column still exists for compatibility
ALTER TABLE vaas_api_keys ALTER COLUMN name DROP NOT NULL;

-- Update existing records to sync columns
UPDATE vaas_api_keys SET is_active = enabled WHERE is_active IS NULL;
UPDATE vaas_api_keys SET key_name = name WHERE key_name IS NULL;

-- Create trigger to keep name and key_name columns synchronized
CREATE OR REPLACE FUNCTION sync_vaas_api_keys_name_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- When key_name is set, also set name for backward compatibility
    IF NEW.key_name IS NOT NULL AND (OLD.name IS NULL OR OLD.name != NEW.key_name) THEN
        NEW.name = NEW.key_name;
    END IF;

    -- When name is set, also set key_name for forward compatibility
    IF NEW.name IS NOT NULL AND (OLD.key_name IS NULL OR OLD.key_name != NEW.name) THEN
        NEW.key_name = NEW.name;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to keep columns synchronized
DROP TRIGGER IF EXISTS sync_vaas_api_keys_name_trigger ON vaas_api_keys;
CREATE TRIGGER sync_vaas_api_keys_name_trigger
    BEFORE INSERT OR UPDATE ON vaas_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION sync_vaas_api_keys_name_columns();

-- Create indexes for the new columns for performance
CREATE INDEX IF NOT EXISTS idx_vaas_api_keys_is_active ON vaas_api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_vaas_api_keys_description ON vaas_api_keys(description) WHERE description IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vaas_api_keys_key_name ON vaas_api_keys(key_name);

-- Note: This migration adds missing columns to ensure backend compatibility
-- - is_active duplicates enabled functionality for backward compatibility
-- - description allows storing API key descriptions as expected by the backend
-- - key_name duplicates name functionality with automatic synchronization
-- - Removed NOT NULL constraint from name to prevent constraint violations