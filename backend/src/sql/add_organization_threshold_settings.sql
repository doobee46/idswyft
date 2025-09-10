-- Add organization threshold settings table for the backend service
-- This allows visual threshold management through the VaaS admin dashboard

CREATE TABLE IF NOT EXISTS organization_threshold_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL, -- References organization from VaaS system
    
    -- High-level admin settings (from VaaS admin UI)
    auto_approve_threshold INTEGER DEFAULT 85 CHECK (auto_approve_threshold >= 70 AND auto_approve_threshold <= 95),
    manual_review_threshold INTEGER DEFAULT 60 CHECK (manual_review_threshold >= 30 AND manual_review_threshold <= 80),
    require_liveness BOOLEAN DEFAULT true,
    require_back_of_id BOOLEAN DEFAULT false,
    max_verification_attempts INTEGER DEFAULT 3 CHECK (max_verification_attempts >= 1 AND max_verification_attempts <= 10),
    
    -- Technical threshold overrides (optional - if NULL, calculated from high-level settings)
    photo_consistency_threshold DECIMAL(4,3) CHECK (photo_consistency_threshold IS NULL OR (photo_consistency_threshold >= 0.5 AND photo_consistency_threshold <= 0.95)),
    face_matching_production_threshold DECIMAL(4,3) CHECK (face_matching_production_threshold IS NULL OR (face_matching_production_threshold >= 0.6 AND face_matching_production_threshold <= 0.95)),
    face_matching_sandbox_threshold DECIMAL(4,3) CHECK (face_matching_sandbox_threshold IS NULL OR (face_matching_sandbox_threshold >= 0.5 AND face_matching_sandbox_threshold <= 0.95)),
    liveness_production_threshold DECIMAL(4,3) CHECK (liveness_production_threshold IS NULL OR (liveness_production_threshold >= 0.5 AND liveness_production_threshold <= 0.9)),
    liveness_sandbox_threshold DECIMAL(4,3) CHECK (liveness_sandbox_threshold IS NULL OR (liveness_sandbox_threshold >= 0.4 AND liveness_sandbox_threshold <= 0.9)),
    cross_validation_threshold DECIMAL(4,3) CHECK (cross_validation_threshold IS NULL OR (cross_validation_threshold >= 0.5 AND cross_validation_threshold <= 0.95)),
    quality_minimum_threshold DECIMAL(4,3) CHECK (quality_minimum_threshold IS NULL OR (quality_minimum_threshold >= 0.3 AND quality_minimum_threshold <= 0.9)),
    ocr_confidence_threshold DECIMAL(4,3) CHECK (ocr_confidence_threshold IS NULL OR (ocr_confidence_threshold >= 0.4 AND ocr_confidence_threshold <= 0.95)),
    pdf417_confidence_threshold DECIMAL(4,3) CHECK (pdf417_confidence_threshold IS NULL OR (pdf417_confidence_threshold >= 0.5 AND pdf417_confidence_threshold <= 0.95)),
    
    -- Audit fields
    updated_by UUID, -- Admin ID from VaaS system
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure one record per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_threshold_settings_unique_org 
ON organization_threshold_settings(organization_id);

-- Index for fast lookups by organization
CREATE INDEX IF NOT EXISTS idx_org_threshold_settings_org_id 
ON organization_threshold_settings(organization_id);

-- Constraint to ensure manual_review_threshold < auto_approve_threshold
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_threshold_order' 
        AND conrelid = 'organization_threshold_settings'::regclass
    ) THEN
        ALTER TABLE organization_threshold_settings 
        ADD CONSTRAINT check_threshold_order 
        CHECK (manual_review_threshold < auto_approve_threshold);
    END IF;
END $$;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_organization_threshold_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_organization_threshold_settings_updated_at ON organization_threshold_settings;
CREATE TRIGGER update_organization_threshold_settings_updated_at
    BEFORE UPDATE ON organization_threshold_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_organization_threshold_settings_updated_at();

-- Add helpful comments
COMMENT ON TABLE organization_threshold_settings IS 'Custom verification threshold settings per organization, overriding system defaults';
COMMENT ON COLUMN organization_threshold_settings.auto_approve_threshold IS 'Percentage confidence above which verifications are automatically approved (70-95)';
COMMENT ON COLUMN organization_threshold_settings.manual_review_threshold IS 'Percentage confidence above which verifications require manual review (30-80)';
COMMENT ON COLUMN organization_threshold_settings.require_liveness IS 'Whether liveness detection is required for this organization';
COMMENT ON COLUMN organization_threshold_settings.require_back_of_id IS 'Whether back-of-ID scanning is required for enhanced verification';
COMMENT ON COLUMN organization_threshold_settings.photo_consistency_threshold IS 'Technical threshold for photo consistency validation between front and back documents';
COMMENT ON COLUMN organization_threshold_settings.face_matching_production_threshold IS 'Technical threshold for face matching in production environment';
COMMENT ON COLUMN organization_threshold_settings.face_matching_sandbox_threshold IS 'Technical threshold for face matching in sandbox environment';
COMMENT ON COLUMN organization_threshold_settings.liveness_production_threshold IS 'Technical threshold for liveness detection in production environment';
COMMENT ON COLUMN organization_threshold_settings.liveness_sandbox_threshold IS 'Technical threshold for liveness detection in sandbox environment';