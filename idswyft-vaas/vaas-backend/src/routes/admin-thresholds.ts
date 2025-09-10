/**
 * Admin Threshold Management API for VaaS
 * 
 * Proxies threshold management requests to the main Idswyft backend
 * Provides VaaS admin interface for visual threshold management
 */

import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { VaasApiResponse } from '../types/index.js';
import axios from 'axios';
import config from '../config/index.js';

const router = Router();

/**
 * GET /api/admin/thresholds
 * Get current threshold settings for organization
 */
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organization_id;
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID required' }
      });
    }
    
    // Proxy request to main backend
    const response = await axios.get(`${config.idswyftApi.baseUrl}/admin/thresholds`, {
      headers: {
        'Authorization': `Bearer ${config.idswyftApi.serviceToken}`,
        'X-Organization-ID': organizationId
      },
      timeout: config.idswyftApi.timeout
    });
    
    res.json({
      success: true,
      data: response.data.data
    });
    
  } catch (error: any) {
    console.error('Failed to get thresholds:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: { code: 'ENDPOINT_NOT_FOUND', message: 'Threshold management not available in main backend' }
      });
    }
    
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
    const organizationId = req.user?.organization_id;
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
    
    // Proxy request to main backend
    const response = await axios.post(`${config.idswyftApi.baseUrl}/admin/thresholds/preview`, {
      auto_approve_threshold,
      manual_review_threshold,
      require_liveness,
      require_back_of_id,
      max_verification_attempts
    }, {
      headers: {
        'Authorization': `Bearer ${config.idswyftApi.serviceToken}`,
        'X-Organization-ID': organizationId,
        'Content-Type': 'application/json'
      },
      timeout: config.idswyftApi.timeout
    });
    
    res.json({
      success: true,
      data: response.data.data
    });
    
  } catch (error: any) {
    console.error('Failed to generate threshold preview:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: { code: 'ENDPOINT_NOT_FOUND', message: 'Threshold preview not available in main backend' }
      });
    }
    
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
    const organizationId = req.user?.organization_id;
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
    
    // Proxy request to main backend
    const response = await axios.put(`${config.idswyftApi.baseUrl}/admin/thresholds`, {
      auto_approve_threshold,
      manual_review_threshold,
      require_liveness,
      require_back_of_id,
      max_verification_attempts
    }, {
      headers: {
        'Authorization': `Bearer ${config.idswyftApi.serviceToken}`,
        'X-Organization-ID': organizationId,
        'Content-Type': 'application/json'
      },
      timeout: config.idswyftApi.timeout
    });
    
    res.json({
      success: true,
      data: response.data.data
    });
    
  } catch (error: any) {
    console.error('Failed to update thresholds:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: { code: 'ENDPOINT_NOT_FOUND', message: 'Threshold management not available in main backend' }
      });
    }
    
    if (error.response?.status === 400) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.response.data?.error?.message || 'Invalid threshold values' }
      });
    }
    
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
    const organizationId = req.user?.organization_id;
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID required' }
      });
    }
    
    // Proxy request to main backend
    const response = await axios.post(`${config.idswyftApi.baseUrl}/admin/thresholds/reset`, {}, {
      headers: {
        'Authorization': `Bearer ${config.idswyftApi.serviceToken}`,
        'X-Organization-ID': organizationId,
        'Content-Type': 'application/json'
      },
      timeout: config.idswyftApi.timeout
    });
    
    res.json({
      success: true,
      data: response.data.data
    });
    
  } catch (error: any) {
    console.error('Failed to reset thresholds:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: { code: 'ENDPOINT_NOT_FOUND', message: 'Threshold reset not available in main backend' }
      });
    }
    
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