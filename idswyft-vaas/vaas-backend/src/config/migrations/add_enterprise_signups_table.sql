-- Migration: Add vaas_enterprise_signups table
-- Date: 2025-09-05
-- Purpose: Track enterprise signup requests for follow-up and analytics

-- Enterprise Signup Tracking
CREATE TABLE vaas_enterprise_signups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES vaas_organizations(id) ON DELETE SET NULL,
    
    -- Signup Data (stored as JSONB for flexibility)
    signup_data JSONB NOT NULL,
    
    -- Processing Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed')
    ),
    
    -- Notifications
    admin_notified BOOLEAN DEFAULT FALSE,
    welcome_email_sent BOOLEAN DEFAULT FALSE,
    
    -- Follow-up tracking
    sales_contacted BOOLEAN DEFAULT FALSE,
    onboarding_scheduled BOOLEAN DEFAULT FALSE,
    demo_completed BOOLEAN DEFAULT FALSE,
    
    -- Notes
    admin_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Extract commonly queried fields for indexing
    company_name VARCHAR(255) GENERATED ALWAYS AS (signup_data->>'company') STORED,
    admin_email VARCHAR(255) GENERATED ALWAYS AS (signup_data->>'email') STORED,
    estimated_volume VARCHAR(50) GENERATED ALWAYS AS (signup_data->>'estimatedVolume') STORED
);

-- Create indexes for performance
CREATE INDEX idx_vaas_enterprise_signups_org_id ON vaas_enterprise_signups(organization_id);
CREATE INDEX idx_vaas_enterprise_signups_status ON vaas_enterprise_signups(status);
CREATE INDEX idx_vaas_enterprise_signups_email ON vaas_enterprise_signups(admin_email);
CREATE INDEX idx_vaas_enterprise_signups_company ON vaas_enterprise_signups(company_name);
CREATE INDEX idx_vaas_enterprise_signups_created ON vaas_enterprise_signups(created_at);

-- Add updated_at trigger
CREATE TRIGGER update_vaas_enterprise_signups_updated_at 
    BEFORE UPDATE ON vaas_enterprise_signups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE vaas_enterprise_signups IS 'Tracks enterprise signup requests for analytics and follow-up';
COMMENT ON COLUMN vaas_enterprise_signups.signup_data IS 'Original form data from enterprise site signup (firstName, lastName, email, company, etc.)';
COMMENT ON COLUMN vaas_enterprise_signups.company_name IS 'Extracted company name for indexing and queries';
COMMENT ON COLUMN vaas_enterprise_signups.admin_email IS 'Extracted admin email for indexing and queries';
COMMENT ON COLUMN vaas_enterprise_signups.estimated_volume IS 'Extracted volume estimate for sales follow-up';