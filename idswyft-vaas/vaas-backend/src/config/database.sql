-- Idswyft VaaS Database Schema
-- Multi-tenant identity verification as a service

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- VaaS Organizations (Businesses using VaaS)
CREATE TABLE vaas_organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255),
    
    -- Subscription & Billing
    subscription_tier VARCHAR(20) NOT NULL DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'professional', 'enterprise', 'custom')),
    billing_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (billing_status IN ('active', 'past_due', 'cancelled', 'suspended')),
    stripe_customer_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    
    -- Settings & Customization
    settings JSONB DEFAULT '{}',
    branding JSONB DEFAULT '{}', -- logos, colors, custom domain
    
    -- Contact & Support
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    support_email VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT vaas_organizations_slug_length CHECK (LENGTH(slug) >= 3)
);

-- Organization Admin Users
CREATE TABLE vaas_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES vaas_organizations(id) ON DELETE CASCADE,
    
    -- User Info
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    
    -- Role & Permissions
    role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'operator', 'viewer')),
    permissions JSONB DEFAULT '{}',
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'invited')),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Auth
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(organization_id, email)
);

-- End Users (Customers being verified)
CREATE TABLE vaas_end_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES vaas_organizations(id) ON DELETE CASCADE,
    
    -- User Info
    email VARCHAR(255),
    phone VARCHAR(50),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    
    -- Metadata
    external_id VARCHAR(255), -- Client's internal user ID
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- Verification Status
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        verification_status IN ('pending', 'in_progress', 'verified', 'failed', 'manual_review', 'expired')
    ),
    verification_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verification Sessions (Links to main Idswyft verifications)
CREATE TABLE vaas_verification_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES vaas_organizations(id) ON DELETE CASCADE,
    end_user_id UUID NOT NULL REFERENCES vaas_end_users(id) ON DELETE CASCADE,
    
    -- Main Idswyft Integration
    idswyft_verification_id UUID NOT NULL, -- Links to main verification_requests table
    idswyft_user_id VARCHAR(255) NOT NULL, -- User ID used in main API
    
    -- Session Info
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'document_uploaded', 'processing', 'completed', 'failed', 'expired')
    ),
    
    -- Results (cached from main API)
    results JSONB DEFAULT '{}',
    confidence_score DECIMAL(3,2),
    
    -- Session tracking
    ip_address INET,
    user_agent TEXT,
    session_token VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    UNIQUE(idswyft_verification_id)
);

-- Usage Tracking & Billing
CREATE TABLE vaas_usage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES vaas_organizations(id) ON DELETE CASCADE,
    
    -- Billing Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Usage Metrics
    verification_count INTEGER NOT NULL DEFAULT 0,
    api_calls INTEGER NOT NULL DEFAULT 0,
    storage_used_mb INTEGER DEFAULT 0,
    
    -- Billing
    base_amount_cents INTEGER NOT NULL DEFAULT 0, -- Monthly subscription fee
    usage_amount_cents INTEGER NOT NULL DEFAULT 0, -- Per-verification fees
    total_amount_cents INTEGER NOT NULL DEFAULT 0,
    
    -- Status
    billing_status VARCHAR(20) DEFAULT 'pending' CHECK (
        billing_status IN ('pending', 'billed', 'paid', 'failed')
    ),
    stripe_invoice_id VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(organization_id, period_start, period_end)
);

-- Webhook Configurations
CREATE TABLE vaas_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES vaas_organizations(id) ON DELETE CASCADE,
    
    -- Webhook Config
    url VARCHAR(500) NOT NULL,
    events TEXT[] NOT NULL, -- ['verification.completed', 'verification.failed', etc.]
    secret_key VARCHAR(100) NOT NULL,
    
    -- Status
    enabled BOOLEAN DEFAULT TRUE,
    last_success_at TIMESTAMP WITH TIME ZONE,
    last_failure_at TIMESTAMP WITH TIME ZONE,
    failure_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook Delivery Logs
CREATE TABLE vaas_webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES vaas_webhooks(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES vaas_organizations(id) ON DELETE CASCADE,
    
    -- Event Info
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    
    -- Delivery Info
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'delivered', 'failed', 'retrying')),
    http_status_code INTEGER,
    response_body TEXT,
    error_message TEXT,
    
    -- Retry Info
    attempts INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    max_retries INTEGER DEFAULT 3,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- API Keys for organization integrations
CREATE TABLE vaas_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES vaas_organizations(id) ON DELETE CASCADE,
    
    -- Key Info
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(20) NOT NULL, -- For display (e.g., "vaas_sk_test_abc...")
    
    -- Permissions & Limits
    scopes TEXT[] DEFAULT '{read,write}',
    rate_limit_per_hour INTEGER DEFAULT 1000,
    
    -- Status
    enabled BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    UNIQUE(organization_id, name)
);

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
CREATE INDEX idx_vaas_organizations_slug ON vaas_organizations(slug);
CREATE INDEX idx_vaas_organizations_billing ON vaas_organizations(billing_status, subscription_tier);

CREATE INDEX idx_vaas_admins_org_id ON vaas_admins(organization_id);
CREATE INDEX idx_vaas_admins_email ON vaas_admins(email);

CREATE INDEX idx_vaas_end_users_org_id ON vaas_end_users(organization_id);
CREATE INDEX idx_vaas_end_users_status ON vaas_end_users(verification_status);
CREATE INDEX idx_vaas_end_users_external_id ON vaas_end_users(organization_id, external_id);

CREATE INDEX idx_vaas_verification_sessions_org_id ON vaas_verification_sessions(organization_id);
CREATE INDEX idx_vaas_verification_sessions_user_id ON vaas_verification_sessions(end_user_id);
CREATE INDEX idx_vaas_verification_sessions_idswyft_id ON vaas_verification_sessions(idswyft_verification_id);
CREATE INDEX idx_vaas_verification_sessions_status ON vaas_verification_sessions(status);

CREATE INDEX idx_vaas_usage_records_org_period ON vaas_usage_records(organization_id, period_start, period_end);
CREATE INDEX idx_vaas_usage_records_billing ON vaas_usage_records(billing_status);

CREATE INDEX idx_vaas_webhooks_org_id ON vaas_webhooks(organization_id);
CREATE INDEX idx_vaas_webhook_deliveries_webhook_id ON vaas_webhook_deliveries(webhook_id);
CREATE INDEX idx_vaas_webhook_deliveries_status ON vaas_webhook_deliveries(status);

CREATE INDEX idx_vaas_api_keys_org_id ON vaas_api_keys(organization_id);
CREATE INDEX idx_vaas_api_keys_hash ON vaas_api_keys(key_hash);

CREATE INDEX idx_vaas_enterprise_signups_org_id ON vaas_enterprise_signups(organization_id);
CREATE INDEX idx_vaas_enterprise_signups_status ON vaas_enterprise_signups(status);
CREATE INDEX idx_vaas_enterprise_signups_email ON vaas_enterprise_signups(admin_email);
CREATE INDEX idx_vaas_enterprise_signups_company ON vaas_enterprise_signups(company_name);
CREATE INDEX idx_vaas_enterprise_signups_created ON vaas_enterprise_signups(created_at);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vaas_organizations_updated_at BEFORE UPDATE ON vaas_organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vaas_admins_updated_at BEFORE UPDATE ON vaas_admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vaas_end_users_updated_at BEFORE UPDATE ON vaas_end_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vaas_verification_sessions_updated_at BEFORE UPDATE ON vaas_verification_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vaas_usage_records_updated_at BEFORE UPDATE ON vaas_usage_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vaas_webhooks_updated_at BEFORE UPDATE ON vaas_webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vaas_api_keys_updated_at BEFORE UPDATE ON vaas_api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vaas_enterprise_signups_updated_at BEFORE UPDATE ON vaas_enterprise_signups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();