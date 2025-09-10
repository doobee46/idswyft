/**
 * Admin Threshold Management API
 * 
 * Connects VaaS admin dashboard to dynamic threshold system
 * Provides endpoints for visual threshold management
 */

import { Router } from 'express';
import { DynamicThresholdManager } from '@/config/dynamicThresholds.js';
import { authenticateJWT, requireAdminRole } from '@/middleware/auth.js';
import { logger } from '@/utils/logger.js';

const router = Router();
const thresholdManager = DynamicThresholdManager.getInstance();

/**
 * GET /api/admin/thresholds
 * Get current threshold settings for organization
 */
router.get('/', authenticateJWT, requireAdminRole(['admin']), async (req, res) => {
  try {
    const organizationId = (req as any).user?.id; // Using user ID as organization ID for now
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID required' }
      });
    }
    
    // Get thresholds for both production and sandbox
    const [productionThresholds, sandboxThresholds] = await Promise.all([
      thresholdManager.getThresholdsForOrganization(organizationId, false),
      thresholdManager.getThresholdsForOrganization(organizationId, true)
    ]);
    
    res.json({
      success: true,
      data: {
        production: {
          photo_consistency: productionThresholds.PHOTO_CONSISTENCY,
          face_matching: productionThresholds.FACE_MATCHING.production,
          liveness: productionThresholds.LIVENESS.production,
          cross_validation: productionThresholds.CROSS_VALIDATION,
          quality_minimum: productionThresholds.QUALITY.minimum_acceptable,
          ocr_confidence: productionThresholds.OCR_CONFIDENCE.minimum_acceptable,
          pdf417_confidence: productionThresholds.PDF417.minimum_confidence
        },
        sandbox: {
          photo_consistency: sandboxThresholds.PHOTO_CONSISTENCY,
          face_matching: sandboxThresholds.FACE_MATCHING.sandbox,
          liveness: sandboxThresholds.LIVENESS.sandbox,
          cross_validation: sandboxThresholds.CROSS_VALIDATION,
          quality_minimum: sandboxThresholds.QUALITY.minimum_acceptable,
          ocr_confidence: sandboxThresholds.OCR_CONFIDENCE.minimum_acceptable,
          pdf417_confidence: sandboxThresholds.PDF417.minimum_confidence
        },
        meta: {
          organization_id: organizationId,
          using_defaults: false,
          last_updated: new Date().toISOString()
        }
      }
    });
    
  } catch (error) {
    logger.error('Failed to get admin thresholds', {
      error: error instanceof Error ? error.message : 'Unknown error',
      organizationId: (req as any).user?.id
    });
    
    res.status(500).json({
      success: false,
      error: { code: 'THRESHOLD_FETCH_FAILED', message: 'Failed to retrieve thresholds' }
    });
  }
});

/**
 * PUT /api/admin/thresholds
 * Update threshold settings from admin dashboard
 */
router.put('/', authenticateJWT, requireAdminRole(['admin']), async (req, res) => {
  try {
    const organizationId = (req as any).user?.id; // Using user ID as organization ID for now
    const adminId = (req as any).user?.id;
    
    if (!organizationId || !adminId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_REQUIRED_INFO', message: 'Organization ID and admin ID required' }
      });
    }
    
    // Extract threshold updates from request body
    const {
      auto_approve_threshold,
      manual_review_threshold,
      require_liveness,
      require_back_of_id,
      max_verification_attempts,
      advanced_overrides
    } = req.body;
    
    // Validate required fields
    if (auto_approve_threshold === undefined || manual_review_threshold === undefined) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_THRESHOLDS', message: 'Auto-approve and manual review thresholds are required' }
      });
    }
    
    // Convert admin settings to threshold overrides
    let thresholdUpdates = thresholdManager.convertAdminSettingsToThresholds({
      auto_approve_threshold,
      manual_review_threshold,
      require_liveness: require_liveness ?? true,
      require_back_of_id: require_back_of_id ?? false,
      max_verification_attempts: max_verification_attempts ?? 3
    });
    
    // Apply any advanced overrides if provided
    if (advanced_overrides && typeof advanced_overrides === 'object') {
      thresholdUpdates = {
        ...thresholdUpdates,
        ...advanced_overrides
      };
    }
    
    // Update thresholds
    const updatedSettings = await thresholdManager.updateOrganizationThresholds(
      organizationId,
      thresholdUpdates,
      adminId
    );
    
    // Get updated thresholds for response
    const [productionThresholds, sandboxThresholds] = await Promise.all([
      thresholdManager.getThresholdsForOrganization(organizationId, false),
      thresholdManager.getThresholdsForOrganization(organizationId, true)
    ]);
    
    logger.info('Admin updated verification thresholds', {
      organizationId,
      adminId,
      autoApproveThreshold: auto_approve_threshold,
      manualReviewThreshold: manual_review_threshold,
      requireLiveness: require_liveness,
      hasAdvancedOverrides: !!advanced_overrides
    });
    
    res.json({
      success: true,
      data: {
        updated_settings: updatedSettings,
        production: {
          photo_consistency: productionThresholds.PHOTO_CONSISTENCY,
          face_matching: productionThresholds.FACE_MATCHING.production,
          liveness: productionThresholds.LIVENESS.production,
          cross_validation: productionThresholds.CROSS_VALIDATION
        },
        sandbox: {
          photo_consistency: sandboxThresholds.PHOTO_CONSISTENCY,
          face_matching: sandboxThresholds.FACE_MATCHING.sandbox,
          liveness: sandboxThresholds.LIVENESS.sandbox,
          cross_validation: sandboxThresholds.CROSS_VALIDATION
        },
        meta: {
          updated_at: updatedSettings.lastUpdated.toISOString(),
          updated_by: adminId
        }
      }
    });
    
  } catch (error) {
    logger.error('Failed to update admin thresholds', {
      error: error instanceof Error ? error.message : 'Unknown error',
      organizationId: (req as any).user?.id
    });
    
    res.status(500).json({
      success: false,
      error: { 
        code: 'THRESHOLD_UPDATE_FAILED', 
        message: error instanceof Error ? error.message : 'Failed to update thresholds'
      }
    });
  }
});

/**
 * POST /api/admin/thresholds/preview
 * Preview what thresholds would be with given admin settings
 */
router.post('/preview', authenticateJWT, requireAdminRole(['admin']), async (req, res) => {
  try {
    const {
      auto_approve_threshold,
      manual_review_threshold,
      require_liveness,
      require_back_of_id,
      max_verification_attempts
    } = req.body;
    
    // Convert settings to threshold overrides for preview
    const previewOverrides = thresholdManager.convertAdminSettingsToThresholds({
      auto_approve_threshold: auto_approve_threshold ?? 85,
      manual_review_threshold: manual_review_threshold ?? 60,
      require_liveness: require_liveness ?? true,
      require_back_of_id: require_back_of_id ?? false,
      max_verification_attempts: max_verification_attempts ?? 3
    });
    
    res.json({
      success: true,
      data: {
        preview: {
          production: {
            face_matching: previewOverrides.faceMatchingProduction,
            liveness: previewOverrides.livenessProduction
          },
          sandbox: {
            face_matching: previewOverrides.faceMatchingSandbox,
            liveness: previewOverrides.livenessSandbox
          }
        },
        explanation: {
          auto_approve_threshold: `Verifications with ${auto_approve_threshold}%+ confidence will be automatically approved`,
          manual_review_threshold: `Verifications with ${manual_review_threshold}%+ confidence will go to manual review`,
          face_matching_production: `Face matching requires ${(previewOverrides.faceMatchingProduction! * 100).toFixed(0)}%+ similarity (production)`,
          liveness_detection: require_liveness ? 
            `Liveness detection requires ${(previewOverrides.livenessProduction! * 100).toFixed(0)}%+ confidence` :
            'Liveness detection is disabled'
        }
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'PREVIEW_FAILED', message: 'Failed to generate preview' }
    });
  }
});

/**
 * POST /api/admin/thresholds/reset
 * Reset thresholds to system defaults
 */
router.post('/reset', authenticateJWT, requireAdminRole(['admin']), async (req, res) => {
  try {
    const organizationId = (req as any).user?.id; // Using user ID as organization ID for now
    const adminId = (req as any).user?.id;
    
    if (!organizationId || !adminId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_REQUIRED_INFO', message: 'Organization ID and admin ID required' }
      });
    }
    
    // Reset to default settings
    const defaultSettings = {
      autoApproveThreshold: 85,
      manualReviewThreshold: 60,
      requireLiveness: true,
      requireBackOfId: false,
      maxVerificationAttempts: 3
    };
    
    const resetOverrides = thresholdManager.convertAdminSettingsToThresholds({
      auto_approve_threshold: defaultSettings.autoApproveThreshold,
      manual_review_threshold: defaultSettings.manualReviewThreshold,
      require_liveness: defaultSettings.requireLiveness,
      require_back_of_id: defaultSettings.requireBackOfId,
      max_verification_attempts: defaultSettings.maxVerificationAttempts
    });
    
    // Clear organization-specific overrides
    await thresholdManager.updateOrganizationThresholds(
      organizationId,
      {
        ...resetOverrides,
        // Clear advanced overrides
        photoConsistency: undefined,
        qualityMinimum: undefined,
        ocrConfidence: undefined,
        pdf417Confidence: undefined
      },
      adminId
    );
    
    // Clear cache
    thresholdManager.clearCache(organizationId);
    
    logger.info('Admin reset verification thresholds to defaults', {
      organizationId,
      adminId
    });
    
    res.json({
      success: true,
      data: {
        message: 'Thresholds reset to system defaults',
        default_settings: defaultSettings
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'RESET_FAILED', message: 'Failed to reset thresholds' }
    });
  }
});

export default router;