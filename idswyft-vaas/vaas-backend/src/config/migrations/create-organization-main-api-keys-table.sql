-- Create table for storing organization main API keys
CREATE TABLE IF NOT EXISTS vaas_organization_main_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES vaas_organizations(id) ON DELETE CASCADE,
  main_api_key_id UUID NOT NULL, -- The actual key ID from main Idswyft API
  key_name VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(50) NOT NULL, -- First part of key for display (e.g., "idswyft_live_abc123...")
  is_sandbox BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_vaas_org_main_api_keys_organization_id 
  ON vaas_organization_main_api_keys(organization_id);

CREATE INDEX IF NOT EXISTS idx_vaas_org_main_api_keys_main_api_key_id 
  ON vaas_organization_main_api_keys(main_api_key_id);

CREATE INDEX IF NOT EXISTS idx_vaas_org_main_api_keys_active 
  ON vaas_organization_main_api_keys(organization_id, is_active);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_vaas_org_main_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vaas_org_main_api_keys_updated_at
  BEFORE UPDATE ON vaas_organization_main_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_vaas_org_main_api_keys_updated_at();

-- Grant permissions
GRANT ALL ON vaas_organization_main_api_keys TO authenticated;
GRANT ALL ON vaas_organization_main_api_keys TO service_role;