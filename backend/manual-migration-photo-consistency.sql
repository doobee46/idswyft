-- Manual Migration: Photo Consistency Security Enhancement
-- Run this SQL in your Supabase dashboard to fix the missing columns error
-- This adds the security features that prevent identity fraud

-- 1. Add security validation columns
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS photo_consistency_score DECIMAL(3,2);
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS liveness_score DECIMAL(3,2);
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS live_capture_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS cross_validation_score DECIMAL(3,2);
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2);
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS back_of_id_uploaded BOOLEAN DEFAULT FALSE;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS enhanced_verification_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS manual_review_reason TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS external_verification_id VARCHAR(255);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_verification_requests_photo_consistency ON verification_requests(photo_consistency_score);
CREATE INDEX IF NOT EXISTS idx_verification_requests_liveness ON verification_requests(liveness_score);
CREATE INDEX IF NOT EXISTS idx_verification_requests_confidence ON verification_requests(confidence_score);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status_failure ON verification_requests(status, failure_reason);

-- 3. Update status constraint to include all valid statuses
ALTER TABLE verification_requests DROP CONSTRAINT IF EXISTS verification_requests_status_check;
ALTER TABLE verification_requests ADD CONSTRAINT verification_requests_status_check 
    CHECK (status IN ('pending', 'verified', 'failed', 'manual_review'));

-- 4. Add comments for documentation
COMMENT ON COLUMN verification_requests.photo_consistency_score IS 'Score from comparing photos between front and back documents (0.0-1.0) - critical security check to prevent identity fraud';
COMMENT ON COLUMN verification_requests.liveness_score IS 'Score from liveness detection during live capture (0.0-1.0)';
COMMENT ON COLUMN verification_requests.live_capture_completed IS 'Indicates if live capture with liveness detection is completed';
COMMENT ON COLUMN verification_requests.failure_reason IS 'Detailed reason for verification failure for user feedback and admin review';
COMMENT ON COLUMN verification_requests.cross_validation_score IS 'Score from cross-validating data between front and back documents';
COMMENT ON COLUMN verification_requests.confidence_score IS 'Overall confidence score combining all validation checks';
COMMENT ON COLUMN verification_requests.back_of_id_uploaded IS 'Indicates if back-of-ID document has been uploaded for enhanced verification';
COMMENT ON COLUMN verification_requests.enhanced_verification_completed IS 'Indicates if enhanced verification including photo consistency checks is completed';

-- 5. Verify the migration
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'verification_requests' 
    AND column_name IN (
        'photo_consistency_score',
        'liveness_score',
        'live_capture_completed',
        'failure_reason',
        'cross_validation_score',
        'confidence_score',
        'back_of_id_uploaded',
        'enhanced_verification_completed'
    )
ORDER BY column_name;

-- Expected result: Should show 8 rows with the new columns