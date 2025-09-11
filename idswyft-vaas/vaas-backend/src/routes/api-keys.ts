import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { VaasApiResponse } from '../types/index.js';
import { vaasSupabase } from '../config/database.js';
import crypto from 'crypto';

const router = Router();

// Health check endpoint for VaaS API keys
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    service: 'VaaS API Keys',
    status: 'healthy',
    endpoints: [
      'GET /api-keys',
      'POST /api-keys', 
      'GET /api-keys/:keyId',
      'PUT /api-keys/:keyId',
      'DELETE /api-keys/:keyId',
      'POST /api-keys/:keyId/rotate',
      'GET /api-keys/:keyId/usage'
    ]
  });
});

// Database connection test endpoint
router.post('/test-db', async (req, res) => {
  try {
    console.log('🔄 Testing VaaS database connection...');
    
    // Test basic connection with VaaS tables
    const { data: testResult, error: connectionError } = await vaasSupabase
      .from('vaas_admins')
      .select('id')
      .limit(1);

    console.log('🔍 Connection test result:', { testResult, connectionError });

    res.json({
      success: true,
      data: {
        connectionTest: connectionError ? 'failed' : 'success',
        error: connectionError,
        hasData: !!testResult?.length
      }
    });
  } catch (error: any) {
    console.error('❌ Database test failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DB_TEST_ERROR',
        message: error.message || 'Database test failed'
      }
    });
  }
});

// Migration endpoint to create vaas_api_keys table
router.post('/migrate', async (req, res) => {
  try {
    console.log('🔄 Running VaaS API keys table migration...');
    
    // Simple approach: just try to create the table and handle errors
    console.log('🔧 Creating vaas_api_keys table...');

    console.log('🔧 Creating vaas_api_keys table...');
    
    // Create the table using SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS vaas_api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        key_name VARCHAR(100) NOT NULL,
        description TEXT,
        key_prefix VARCHAR(50) NOT NULL,
        key_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        expires_at TIMESTAMP WITH TIME ZONE,
        last_used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_vaas_api_keys_org_active 
        ON vaas_api_keys(organization_id, is_active);
      CREATE INDEX IF NOT EXISTS idx_vaas_api_keys_hash 
        ON vaas_api_keys(key_hash);
        
      -- Disable RLS for now to allow access
      ALTER TABLE vaas_api_keys DISABLE ROW LEVEL SECURITY;
    `;

    const { error: createError } = await vaasSupabase.rpc('exec_sql', {
      sql: createTableSQL
    });

    if (createError) {
      console.log('❌ Failed to create table:', createError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'MIGRATION_ERROR',
          message: 'Failed to create vaas_api_keys table'
        }
      });
    }

    console.log('✅ vaas_api_keys table created successfully!');
    
    res.json({
      success: true,
      message: 'vaas_api_keys table created successfully'
    });
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'MIGRATION_ERROR',
        message: error.message || 'Migration failed'
      }
    });
  }
});

// Generate VaaS API key (different format from main API keys)
const generateVaasAPIKey = (): { key: string; hash: string; prefix: string } => {
  const key = `vaas_${crypto.randomBytes(32).toString('hex')}`;
  const hash = crypto
    .createHmac('sha256', process.env.API_KEY_SECRET || 'fallback-secret')
    .update(key)
    .digest('hex');
  const prefix = key.substring(0, 12);
  
  return { key, hash, prefix };
};

// List VaaS API keys for organization
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.admin!.organization_id;

    const { data: apiKeys, error } = await vaasSupabase
      .from('vaas_api_keys')
      .select('id, key_name, key_prefix, is_active, created_at, last_used_at, expires_at')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch API keys: ${error.message}`);
    }

    const response: VaasApiResponse = {
      success: true,
      data: apiKeys || []
    };

    res.json(response);
  } catch (error: any) {
    console.error('[VaasAPIKeys] Failed to list API keys:', error);
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error.message || 'Failed to fetch API keys'
      }
    };
    res.status(500).json(response);
  }
});

// Get specific VaaS API key
router.get('/:keyId', 
  [
    param('keyId')
      .isUUID()
      .withMessage('Invalid API key ID format')
  ],
  requireAuth, 
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array()
        }
      };
      return res.status(400).json(response);
    }

    const organizationId = req.admin!.organization_id;
    const { keyId } = req.params;

    const { data: apiKey, error } = await vaasSupabase
      .from('vaas_api_keys')
      .select('*')
      .eq('id', keyId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (error || !apiKey) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'API key not found'
        }
      };
      return res.status(404).json(response);
    }

    const response: VaasApiResponse = {
      success: true,
      data: apiKey
    };

    res.json(response);
  } catch (error: any) {
    console.error('[VaasAPIKeys] Failed to get API key:', error);
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error.message || 'Failed to get API key'
      }
    };
    res.status(500).json(response);
  }
});

// Create VaaS API key
router.post('/',
  [
    body('key_name')
      .trim()
      .escape()
      .isLength({ min: 1, max: 100 })
      .withMessage('API key name is required and must be less than 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('expires_in_days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Expiration must be between 1 and 365 days')
  ],
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('[VaasAPIKeys] Creating new API key...');
    console.log('[VaasAPIKeys] Request body:', req.body);
    console.log('[VaasAPIKeys] Admin:', req.admin);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[VaasAPIKeys] Validation errors:', errors.array());
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array()
        }
      };
      return res.status(400).json(response);
    }

    const organizationId = req.admin!.organization_id;
    const { key_name, description, expires_in_days } = req.body;

    console.log('[VaasAPIKeys] Organization ID:', organizationId);
    console.log('[VaasAPIKeys] Key name:', key_name);

    // Check existing key count (limit to 10 VaaS API keys per organization)
    console.log('[VaasAPIKeys] Checking existing API key count...');
    const { data: existingKeys, error: countError } = await vaasSupabase
      .from('vaas_api_keys')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    console.log('[VaasAPIKeys] Count result:', { existingKeysLength: existingKeys?.length, countError });

    if (countError) {
      console.error('[VaasAPIKeys] Count error details:', countError);
      throw new Error(`Failed to check API key count: ${countError.message}`);
    }

    const existingCount = existingKeys?.length || 0;

    const maxKeys = 10;
    if ((existingCount ?? 0) >= maxKeys) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'LIMIT_EXCEEDED',
          message: `Maximum of ${maxKeys} VaaS API keys allowed per organization`
        }
      };
      return res.status(400).json(response);
    }

    // Generate API key
    const { key, hash, prefix } = generateVaasAPIKey();
    const keyId = crypto.randomUUID();

    // Calculate expiration
    let expiresAt = null;
    if (expires_in_days) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expires_in_days);
    }

    // Save to database
    const { data: savedKey, error: saveError } = await vaasSupabase
      .from('vaas_api_keys')
      .insert([{
        id: keyId,
        organization_id: organizationId,
        key_name: key_name.trim(),
        description: description?.trim() || null,
        key_prefix: prefix,
        key_hash: hash,
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      }])
      .select('id, key_name, key_prefix, description, expires_at, created_at')
      .single();

    if (saveError) {
      throw new Error(`Failed to save API key: ${saveError.message}`);
    }

    const response: VaasApiResponse = {
      success: true,
      data: {
        secret_key: key, // Return full key only once
        key_info: savedKey,
        message: 'VaaS API key created successfully. Store it securely - it will not be shown again.',
        usage_info: {
          purpose: 'This key provides access to VaaS backend API endpoints',
          authentication: 'Include in requests as X-API-Key header',
          scope: 'Organization-scoped access to VaaS services'
        }
      }
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('[VaasAPIKeys] Failed to create API key:', error);
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: error.message || 'Failed to create API key'
      }
    };
    res.status(500).json(response);
  }
});

// Update VaaS API key
router.put('/:keyId',
  [
    param('keyId')
      .isUUID()
      .withMessage('Invalid API key ID format'),
    body('key_name')
      .optional()
      .trim()
      .escape()
      .isLength({ min: 1, max: 100 })
      .withMessage('API key name must be between 1 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters')
  ],
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array()
        }
      };
      return res.status(400).json(response);
    }

    const organizationId = req.admin!.organization_id;
    const { keyId } = req.params;
    const updates = req.body;

    const { data: updatedKey, error } = await vaasSupabase
      .from('vaas_api_keys')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', keyId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .select('*')
      .single();

    if (error || !updatedKey) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'API key not found or update failed'
        }
      };
      return res.status(404).json(response);
    }

    const response: VaasApiResponse = {
      success: true,
      data: updatedKey
    };

    res.json(response);
  } catch (error: any) {
    console.error('[VaasAPIKeys] Failed to update API key:', error);
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: error.message || 'Failed to update API key'
      }
    };
    res.status(500).json(response);
  }
});

// Delete (deactivate) VaaS API key
router.delete('/:keyId',
  [
    param('keyId')
      .isUUID()
      .withMessage('Invalid API key ID format')
  ],
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array()
        }
      };
      return res.status(400).json(response);
    }

    const organizationId = req.admin!.organization_id;
    const { keyId } = req.params;

    const { error } = await vaasSupabase
      .from('vaas_api_keys')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', keyId)
      .eq('organization_id', organizationId);

    if (error) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: 'Failed to delete API key'
        }
      };
      return res.status(400).json(response);
    }

    const response: VaasApiResponse = {
      success: true,
      data: {
        message: 'VaaS API key deleted successfully'
      }
    };

    res.json(response);
  } catch (error: any) {
    console.error('[VaasAPIKeys] Failed to delete API key:', error);
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: error.message || 'Failed to delete API key'
      }
    };
    res.status(500).json(response);
  }
});

// Rotate VaaS API key
router.post('/:keyId/rotate',
  [
    param('keyId')
      .isUUID()
      .withMessage('Invalid API key ID format')
  ],
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array()
        }
      };
      return res.status(400).json(response);
    }

    const organizationId = req.admin!.organization_id;
    const { keyId } = req.params;

    // Generate new key
    const { key, hash, prefix } = generateVaasAPIKey();

    const { data: rotatedKey, error } = await vaasSupabase
      .from('vaas_api_keys')
      .update({
        key_prefix: prefix,
        key_hash: hash,
        updated_at: new Date().toISOString()
      })
      .eq('id', keyId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .select('id, key_name, key_prefix')
      .single();

    if (error || !rotatedKey) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'API key not found'
        }
      };
      return res.status(404).json(response);
    }

    const response: VaasApiResponse = {
      success: true,
      data: {
        secret_key: key, // Return new full key
        message: 'VaaS API key rotated successfully. Update your applications with the new key.'
      }
    };

    res.json(response);
  } catch (error: any) {
    console.error('[VaasAPIKeys] Failed to rotate API key:', error);
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'ROTATE_ERROR',
        message: error.message || 'Failed to rotate API key'
      }
    };
    res.status(500).json(response);
  }
});

// Get API key usage statistics
router.get('/:keyId/usage',
  [
    param('keyId')
      .isUUID()
      .withMessage('Invalid API key ID format')
  ],
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array()
        }
      };
      return res.status(400).json(response);
    }

    const organizationId = req.admin!.organization_id;
    const { keyId } = req.params;

    // For now, return placeholder usage data
    // This would integrate with actual usage tracking in a full implementation
    const response: VaasApiResponse = {
      success: true,
      data: {
        key_id: keyId,
        usage: {
          total_requests: 0,
          requests_this_month: 0,
          last_used_at: null
        },
        note: 'Usage tracking not yet implemented'
      }
    };

    res.json(response);
  } catch (error: any) {
    console.error('[VaasAPIKeys] Failed to get usage:', error);
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'USAGE_ERROR',
        message: error.message || 'Failed to get API key usage'
      }
    };
    res.status(500).json(response);
  }
});

export default router;