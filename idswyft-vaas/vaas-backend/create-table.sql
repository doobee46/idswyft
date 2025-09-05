-- Create vaas_enterprise_signups table
-- Run this directly in Supabase SQL Editor or via psql

-- First check if table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables 
                   WHERE table_schema = 'public' 
                   AND table_name = 'vaas_enterprise_signups') THEN

        -- Create the table
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

        -- Add updated_at trigger (assuming the function exists)
        CREATE TRIGGER update_vaas_enterprise_signups_updated_at 
            BEFORE UPDATE ON vaas_enterprise_signups 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

        RAISE NOTICE 'Table vaas_enterprise_signups created successfully';
    ELSE
        RAISE NOTICE 'Table vaas_enterprise_signups already exists';
    END IF;
END $$;