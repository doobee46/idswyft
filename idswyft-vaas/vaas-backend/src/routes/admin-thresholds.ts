/**
 * Admin Threshold Management API for VaaS
 * 
 * Direct implementation of threshold management for VaaS admin
 * Provides visual threshold configuration interface
 */

import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { VaasApiResponse } from '../types/index.js';
import { vaasSupabase } from '../config/database.js';

const router = Router();

/**
 * GET /api/admin/thresholds
 * Get current threshold settings for organization
 */
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.admin?.organization_id;
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID required' }
      });
    }
    
    // Get organization settings from VaaS database
    const { data: orgSettings, error } = await vaasSupabase
      .from('vaas_organizations')
      .select('threshold_settings')
      .eq('id', organizationId)
      .single();
      
    if (error) {
      console.error('Failed to get organization settings:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Failed to fetch organization settings' }
      });
    }
    
    // Default threshold settings if none exist
    const defaultThresholds = {
      production: {
        photo_consistency: 0.85,
        face_matching: 0.80,
        liveness: 0.75,
        cross_validation: 0.85,
        quality_minimum: 0.70,
        ocr_confidence: 0.80,
        pdf417_confidence: 0.85
      },
      sandbox: {
        photo_consistency: 0.75,
        face_matching: 0.70,
        liveness: 0.65,
        cross_validation: 0.75,
        quality_minimum: 0.60,
        ocr_confidence: 0.70,
        pdf417_confidence: 0.75
      },
      meta: {
        organization_id: organizationId,
        using_defaults: !orgSettings?.threshold_settings,
        last_updated: new Date().toISOString()
      }
    };
    
    const thresholds = orgSettings?.threshold_settings || defaultThresholds;
    
    res.json({
      success: true,
      data: thresholds
    });
    
  } catch (error: any) {
    console.error('Failed to get thresholds:', error.message);
    
    res.status(500).json({
      success: false,
      error: { code: 'THRESHOLD_FETCH_FAILED', message: 'Failed to fetch threshold settings' }
    });
  }
});

/**
 * POST /api/admin/thresholds/preview
 * Preview what thresholds would be with given admin settings
 */
router.post('/preview', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.admin?.organization_id;
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID required' }
      });
    }
    
    const {
      auto_approve_threshold = 85,
      manual_review_threshold = 60,
      require_liveness = true,
      require_back_of_id = false,
      max_verification_attempts = 3
    } = req.body;
    
    // Calculate preview thresholds based on admin settings
    const faceMatchingProd = Math.max(0.70, auto_approve_threshold / 100 * 0.9);
    const faceMatchingSandbox = Math.max(0.60, auto_approve_threshold / 100 * 0.8);
    const livenessProd = require_liveness ? Math.max(0.65, auto_approve_threshold / 100 * 0.85) : 0;
    const livenessSandbox = require_liveness ? Math.max(0.55, auto_approve_threshold / 100 * 0.75) : 0;
    
    const previewData = {
      preview: {
        production: {
          face_matching: faceMatchingProd,
          liveness: livenessProd
        },
        sandbox: {
          face_matching: faceMatchingSandbox,
          liveness: livenessSandbox
        }
      },
      explanation: {
        auto_approve_threshold: `Verifications with ${auto_approve_threshold}%+ confidence will be automatically approved`,
        manual_review_threshold: `Verifications with ${manual_review_threshold}%+ confidence will go to manual review`,
        face_matching_production: `Face matching requires ${(faceMatchingProd * 100).toFixed(0)}%+ similarity (production)`,
        liveness_detection: require_liveness ? 
          `Liveness detection requires ${(livenessProd * 100).toFixed(0)}%+ confidence` :
          'Liveness detection is disabled'
      }
    };
    
    res.json({
      success: true,
      data: previewData
    });
    
  } catch (error: any) {
    console.error('Failed to generate threshold preview:', error.message);
    
    res.status(500).json({
      success: false,
      error: { code: 'PREVIEW_FAILED', message: 'Failed to generate threshold preview' }
    });
  }
});

/**
 * PUT /api/admin/thresholds
 * Update threshold settings for organization
 */
router.put('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.admin?.organization_id;
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID required' }
      });
    }
    
    const {
      auto_approve_threshold,
      manual_review_threshold,
      require_liveness,
      require_back_of_id,
      max_verification_attempts
    } = req.body;
    
    // Validate thresholds
    if (auto_approve_threshold < 70 || auto_approve_threshold > 95) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Auto-approve threshold must be between 70% and 95%' }
      });
    }
    
    if (manual_review_threshold < 30 || manual_review_threshold > 80) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Manual review threshold must be between 30% and 80%' }
      });
    }
    
    // Calculate technical thresholds
    const faceMatchingProd = Math.max(0.70, auto_approve_threshold / 100 * 0.9);
    const faceMatchingSandbox = Math.max(0.60, auto_approve_threshold / 100 * 0.8);
    const livenessProd = require_liveness ? Math.max(0.65, auto_approve_threshold / 100 * 0.85) : 0;
    const livenessSandbox = require_liveness ? Math.max(0.55, auto_approve_threshold / 100 * 0.75) : 0;
    
    const thresholdSettings = {
      production: {
        photo_consistency: 0.85,
        face_matching: faceMatchingProd,
        liveness: livenessProd,
        cross_validation: 0.85,
        quality_minimum: 0.70,
        ocr_confidence: 0.80,
        pdf417_confidence: 0.85
      },
      sandbox: {
        photo_consistency: 0.75,
        face_matching: faceMatchingSandbox,
        liveness: livenessSandbox,
        cross_validation: 0.75,
        quality_minimum: 0.60,
        ocr_confidence: 0.70,
        pdf417_confidence: 0.75
      },
      meta: {
        organization_id: organizationId,
        using_defaults: false,
        last_updated: new Date().toISOString(),
        admin_settings: {
          auto_approve_threshold,
          manual_review_threshold,
          require_liveness,
          require_back_of_id,
          max_verification_attempts
        }
      }
    };
    
    // Save to VaaS database
    const { error } = await vaasSupabase
      .from('vaas_organizations')
      .update({ 
        threshold_settings: thresholdSettings,
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId);
      
    if (error) {
      console.error('Failed to save threshold settings:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Failed to save threshold settings' }
      });
    }
    
    res.json({
      success: true,
      data: thresholdSettings
    });
    
  } catch (error: any) {
    console.error('Failed to update thresholds:', error.message);
    
    res.status(500).json({
      success: false,
      error: { code: 'THRESHOLD_UPDATE_FAILED', message: 'Failed to update threshold settings' }
    });
  }
});

/**
 * POST /api/admin/thresholds/reset
 * Reset thresholds to defaults for organization
 */
router.post('/reset', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.admin?.organization_id;
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID required' }
      });
    }
    
    // Default threshold settings
    const defaultThresholds = {
      production: {
        photo_consistency: 0.85,
        face_matching: 0.80,
        liveness: 0.75,
        cross_validation: 0.85,
        quality_minimum: 0.70,
        ocr_confidence: 0.80,
        pdf417_confidence: 0.85
      },
      sandbox: {
        photo_consistency: 0.75,
        face_matching: 0.70,
        liveness: 0.65,
        cross_validation: 0.75,
        quality_minimum: 0.60,
        ocr_confidence: 0.70,
        pdf417_confidence: 0.75
      },
      meta: {
        organization_id: organizationId,
        using_defaults: true,
        last_updated: new Date().toISOString(),
        admin_settings: {
          auto_approve_threshold: 85,
          manual_review_threshold: 60,
          require_liveness: true,
          require_back_of_id: false,
          max_verification_attempts: 3
        }
      }
    };
    
    // Reset thresholds in VaaS database
    const { error } = await vaasSupabase
      .from('vaas_organizations')
      .update({ 
        threshold_settings: defaultThresholds,
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId);
      
    if (error) {
      console.error('Failed to reset threshold settings:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Failed to reset threshold settings' }
      });
    }
    
    res.json({
      success: true,
      data: defaultThresholds
    });
    
  } catch (error: any) {
    console.error('Failed to reset thresholds:', error.message);
    
    res.status(500).json({
      success: false,
      error: { code: 'THRESHOLD_RESET_FAILED', message: 'Failed to reset threshold settings' }
    });
  }
});

/**
 * GET /api/admin/thresholds/health
 * Health check for threshold management
 */
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    message: 'Admin threshold management routes are loaded',
    timestamp: new Date().toISOString(),
    routes_available: [
      'GET /admin/thresholds',
      'POST /admin/thresholds/preview',
      'PUT /admin/thresholds',
      'POST /admin/thresholds/reset'
    ]
  });
});

export default router;