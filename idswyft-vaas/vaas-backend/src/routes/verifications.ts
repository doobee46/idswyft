import { Router } from 'express';
import { verificationService } from '../services/verificationService.js';
import { requireAuth, requireApiKey, requirePermission, AuthenticatedRequest } from '../middleware/auth.js';
import { validateStartVerification, validatePagination } from '../middleware/validation.js';
import { VaasApiResponse, VaasStartVerificationRequest } from '../types/index.js';
import { vaasSupabase } from '../config/database.js';

const router = Router();

// Start verification session (API key or admin auth)
router.post('/start', async (req: AuthenticatedRequest, res) => {
  try {
    let organizationId: string;
    
    // Check if using API key or admin auth
    if (req.headers['x-api-key']) {
      // Validate API key
      await new Promise<void>((resolve, reject) => {
        requireApiKey(req, res, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      
      organizationId = (req as any).apiKey.organization_id;
    } else {
      // Validate admin auth
      await new Promise<void>((resolve, reject) => {
        requireAuth(req, res, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      
      organizationId = req.admin!.organization_id;
      
      // Check permissions
      if (!req.admin!.permissions.view_verifications) {
        const response: VaasApiResponse = {
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Permission to manage verifications required'
          }
        };
        
        return res.status(403).json(response);
      }
    }
    
    // Validate request body
    await new Promise<void>((resolve, reject) => {
      validateStartVerification(req, res, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    
    const verificationRequest: VaasStartVerificationRequest = req.body;
    const result = await verificationService.startVerification(organizationId, verificationRequest);
    
    const response: VaasApiResponse = {
      success: true,
      data: result
    };
    
    res.status(201).json(response);
  } catch (error: any) {
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'START_VERIFICATION_FAILED',
        message: error.message
      }
    };
    
    res.status(400).json(response);
  }
});

// List verifications (admin auth required)
router.get('/', requireAuth, requirePermission('view_verifications'), validatePagination, async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.admin!.organization_id;
    const params = {
      status: req.query.status as string,
      user_id: req.query.user_id as string,
      page: parseInt(req.query.page as string) || 1,
      per_page: parseInt(req.query.per_page as string) || 20,
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string
    };
    
    const { verifications, total } = await verificationService.listVerifications(organizationId, params);
    
    const response: VaasApiResponse = {
      success: true,
      data: verifications,
      meta: {
        total,
        page: params.page,
        per_page: params.per_page,
        has_more: total > params.page * params.per_page
      }
    };
    
    res.json(response);
  } catch (error: any) {
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'LIST_VERIFICATIONS_FAILED',
        message: error.message
      }
    };
    
    res.status(500).json(response);
  }
});

// Get verification details (admin auth or API key)
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    let organizationId: string;
    
    // Check if using API key or admin auth
    if (req.headers['x-api-key']) {
      await new Promise<void>((resolve, reject) => {
        requireApiKey(req, res, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      
      organizationId = (req as any).apiKey.organization_id;
    } else {
      await new Promise<void>((resolve, reject) => {
        requireAuth(req, res, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      
      organizationId = req.admin!.organization_id;
      
      if (!req.admin!.permissions.view_verifications) {
        const response: VaasApiResponse = {
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Permission to view verifications required'
          }
        };
        
        return res.status(403).json(response);
      }
    }
    
    const verification = await verificationService.getVerification(organizationId, id);
    
    if (!verification) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Verification not found'
        }
      };
      
      return res.status(404).json(response);
    }
    
    const response: VaasApiResponse = {
      success: true,
      data: verification
    };
    
    res.json(response);
  } catch (error: any) {
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'GET_VERIFICATION_FAILED',
        message: error.message
      }
    };
    
    res.status(500).json(response);
  }
});

// Manual review: approve verification
router.post('/:id/approve', requireAuth, requirePermission('approve_verifications'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const organizationId = req.admin!.organization_id;
    const reviewerId = req.admin!.id;
    
    const verification = await verificationService.approveVerification(organizationId, id, reviewerId, notes);
    
    const response: VaasApiResponse = {
      success: true,
      data: verification
    };
    
    res.json(response);
  } catch (error: any) {
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'APPROVE_VERIFICATION_FAILED',
        message: error.message
      }
    };
    
    res.status(400).json(response);
  }
});

// Manual review: reject verification
router.post('/:id/reject', requireAuth, requirePermission('approve_verifications'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body;
    const organizationId = req.admin!.organization_id;
    const reviewerId = req.admin!.id;
    
    if (!reason) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Rejection reason is required'
        }
      };
      
      return res.status(400).json(response);
    }
    
    const verification = await verificationService.rejectVerification(organizationId, id, reviewerId, reason, notes);
    
    const response: VaasApiResponse = {
      success: true,
      data: verification
    };
    
    res.json(response);
  } catch (error: any) {
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'REJECT_VERIFICATION_FAILED',
        message: error.message
      }
    };
    
    res.status(400).json(response);
  }
});

// Sync verification status from main Idswyft API (admin only)
router.post('/:id/sync', requireAuth, requirePermission('view_verifications'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    // Get the verification to find the Idswyft verification ID
    const verification = await verificationService.getVerification(req.admin!.organization_id, id);
    
    if (!verification) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Verification not found'
        }
      };
      
      return res.status(404).json(response);
    }
    
    const updatedVerification = await verificationService.syncVerificationFromIdswyft(verification.idswyft_verification_id);
    
    const response: VaasApiResponse = {
      success: true,
      data: updatedVerification
    };
    
    res.json(response);
  } catch (error: any) {
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'SYNC_VERIFICATION_FAILED',
        message: error.message
      }
    };
    
    res.status(500).json(response);
  }
});

// Get verification statistics (admin only)
router.get('/stats/overview', requireAuth, requirePermission('view_analytics'), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.admin!.organization_id;
    const days = parseInt(req.query.days as string) || 30;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get verification counts by status
    const { data: statusCounts, error: statusError } = await vaasSupabase
      .from('vaas_verification_sessions')
      .select('status')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString());
      
    if (statusError) {
      throw new Error('Failed to get verification statistics');
    }
    
    // Get end user counts by status
    const { data: userCounts, error: userError } = await vaasSupabase
      .from('vaas_end_users')
      .select('verification_status')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString());
      
    if (userError) {
      throw new Error('Failed to get user statistics');
    }
    
    // Calculate statistics
    const verificationStats = statusCounts.reduce((acc: any, session: any) => {
      acc[session.status] = (acc[session.status] || 0) + 1;
      return acc;
    }, {});
    
    const userStats = userCounts.reduce((acc: any, user: any) => {
      acc[user.verification_status] = (acc[user.verification_status] || 0) + 1;
      return acc;
    }, {});
    
    const total = statusCounts.length;
    const completed = verificationStats.completed || 0;
    const failed = verificationStats.failed || 0;
    const pending = verificationStats.pending || 0;
    const processing = verificationStats.processing || 0;
    
    const response: VaasApiResponse = {
      success: true,
      data: {
        period_days: days,
        verification_sessions: {
          total,
          completed,
          failed,
          pending,
          processing,
          success_rate: total > 0 ? Math.round((completed / total) * 100) : 0
        },
        end_users: {
          total: userCounts.length,
          verified: userStats.verified || 0,
          failed: userStats.failed || 0,
          pending: userStats.pending || 0,
          in_progress: userStats.in_progress || 0,
          manual_review: userStats.manual_review || 0
        }
      }
    };
    
    res.json(response);
  } catch (error: any) {
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'GET_STATS_FAILED',
        message: error.message
      }
    };
    
    res.status(500).json(response);
  }
});

export default router;