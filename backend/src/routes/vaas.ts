import express from 'express';
import { authenticateServiceToken } from '@/middleware/auth.js';
import { catchAsync } from '@/middleware/errorHandler.js';
import { supabase } from '@/config/database.js';
import { logger } from '@/utils/logger.js';

const router = express.Router();

// VaaS service endpoint - submit verification request
router.post('/verify', authenticateServiceToken, catchAsync(async (req, res) => {
  const { user_id, document_url, selfie_url, organization_id } = req.body;
  
  logger.info('VaaS verification request received', {
    user_id,
    organization_id,
    has_document: !!document_url,
    has_selfie: !!selfie_url
  });
  
  // Create verification request in main Idswyft system
  const { data: verification, error } = await supabase
    .from('verifications')
    .insert({
      user_id,
      document_url,
      selfie_url,
      status: 'pending',
      external_organization_id: organization_id, // Track which VaaS org requested this
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) {
    logger.error('Failed to create verification request', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create verification request'
    });
  }
  
  logger.info('VaaS verification created', {
    verification_id: verification.id,
    user_id,
    organization_id
  });
  
  res.json({
    success: true,
    verification_id: verification.id,
    status: verification.status,
    message: 'Verification request submitted successfully'
  });
}));

// VaaS service endpoint - get verification status
router.get('/verify/:verification_id/status', authenticateServiceToken, catchAsync(async (req, res) => {
  const { verification_id } = req.params;
  
  const { data: verification, error } = await supabase
    .from('verifications')
    .select('id, status, confidence_score, failure_reason, updated_at')
    .eq('id', verification_id)
    .single();
  
  if (error || !verification) {
    return res.status(404).json({
      success: false,
      error: 'Verification not found'
    });
  }
  
  res.json({
    success: true,
    verification: {
      id: verification.id,
      status: verification.status,
      confidence_score: verification.confidence_score,
      failure_reason: verification.failure_reason,
      updated_at: verification.updated_at
    }
  });
}));

// VaaS service endpoint - health check for service-to-service communication
router.get('/health', authenticateServiceToken, (req, res) => {
  res.json({
    success: true,
    message: 'VaaS service integration is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;