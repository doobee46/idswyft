import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { VaasApiResponse } from '../types/index.js';
import { vaasSupabase, mainApiSupabase } from '../config/database.js';
import crypto from 'crypto';
import axios from 'axios';

const router = Router();

const MAIN_API_BASE_URL = process.env.MAIN_API_BASE_URL || 'https://api.idswyft.app';

// Health check endpoint to verify routes are loaded
router.get('/main-api-keys/health', async (req, res) => {
  res.json({
    success: true,
    message: 'Organization main API keys routes are loaded',
    timestamp: new Date().toISOString(),
    routes_available: [
      'GET /main-api-keys',
      'POST /main-api-keys', 
      'DELETE /main-api-keys/:keyId'
    ]
  });
});

// Test endpoint to debug API key creation (bypasses auth for testing)
router.post('/main-api-keys/test', async (req, res) => {
  try {
    console.log('🧪 Testing API key generation and registration...');
    
    // Generate test API key
    const { key, hash, prefix } = generateMainAPIKey();
    console.log('✅ Generated key:', { key: key.substring(0, 20) + '...', hash: hash.substring(0, 16), prefix });
    
    // Test main API registration
    try {
      const result = await registerWithMainAPI({
        key,
        hash,
        prefix,
        name: 'Test Key',
        organizationId: 'test-org-123',
        isSandbox: true
      });
      
      console.log('✅ Main API registration result:', result);
      
      res.json({
        success: true,
        message: 'Test completed successfully',
        data: {
          key: key.substring(0, 20) + '...',
          hash: hash.substring(0, 16) + '...',
          prefix,
          mainApiRegistration: !!result
        }
      });
      
    } catch (regError) {
      console.error('❌ Main API registration failed:', regError);
      res.json({
        success: false,
        message: 'Registration failed',
        error: regError.message,
        data: {
          key: key.substring(0, 20) + '...',
          hash: hash.substring(0, 16) + '...',
          prefix
        }
      });
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate API key in the same format as main API
const generateMainAPIKey = (): { key: string; hash: string; prefix: string } => {
  const key = `ik_${crypto.randomBytes(32).toString('hex')}`;
  const apiKeySecret = process.env.API_KEY_SECRET;
  
  if (!apiKeySecret) {
    throw new Error('API_KEY_SECRET environment variable is required for main API key generation');
  }
  
  
  const hash = crypto
    .createHmac('sha256', apiKeySecret)
    .update(key)
    .digest('hex');
  const prefix = key.substring(0, 8);
  
  return { key, hash, prefix };
};

// Helper function to register API key with main API database
const registerWithMainAPI = async (keyData: {
  key: string;
  hash: string;
  prefix: string;
  name: string;
  organizationId: string;
  isSandbox: boolean;
}) => {
  if (!mainApiSupabase) {
    console.log('⚠️ Main API integration not configured - API key only stored in VaaS');
    return null;
  }

  try {
    // First, ensure there's a VaaS service developer account
    const { data: vaasServiceDev, error: devError } = await mainApiSupabase
      .from('developers')
      .select('id')
      .eq('email', 'vaas-service@idswyft.app')
      .single();

    let developerId;
    if (devError || !vaasServiceDev) {
      // Create VaaS service developer account
      const { data: newDev, error: createError } = await mainApiSupabase
        .from('developers')
        .insert([{
          email: 'vaas-service@idswyft.app',
          name: 'VaaS Service Integration',
          company: 'Idswyft VaaS',
          is_verified: true
        }])
        .select('id')
        .single();

      if (createError) throw createError;
      developerId = newDev.id;
      console.log('✅ Created VaaS service developer account:', developerId);
    } else {
      developerId = vaasServiceDev.id;
    }

    // Register the API key in main API database
    const { data: apiKey, error: keyError } = await mainApiSupabase
      .from('api_keys')
      .insert([{
        developer_id: developerId,
        key_hash: keyData.hash,
        key_prefix: keyData.prefix,
        name: `${keyData.name} (Organization: ${keyData.organizationId})`,
        is_sandbox: keyData.isSandbox,
        is_active: true
      }])
      .select('id')
      .single();

    if (keyError) throw keyError;
    
    console.log('✅ API key registered with main API:', apiKey.id);
    return apiKey.id;
    
  } catch (error: any) {
    console.error('❌ Failed to register API key with main API:', error);
    throw new Error(`Main API registration failed: ${error.message}`);
  }
};

// Get organization's main API keys
router.get('/main-api-keys', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.admin!.organization_id;

    // Get stored main API keys for this organization
    const { data: apiKeys, error } = await vaasSupabase
      .from('vaas_organization_main_api_keys')
      .select('id, key_name, key_prefix, is_sandbox, created_at, last_used_at, expires_at')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch API keys: ${error.message}`);
    }

    const response: VaasApiResponse = {
      success: true,
      data: {
        api_keys: apiKeys || [],
        limits: {
          max_production_keys: 2,
          max_sandbox_keys: 5
        }
      }
    };

    res.json(response);
  } catch (error: any) {
    console.error('[OrganizationMainAPI] Failed to get API keys:', error);
    
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'GET_MAIN_API_KEYS_FAILED',
        message: error.message || 'Failed to retrieve main API keys'
      }
    };
    
    res.status(500).json(response);
  }
});

// Create a main API key for the organization
router.post('/main-api-keys', 
  [
    body('key_name')
      .trim()
      .escape()
      .isLength({ min: 1, max: 100 })
      .withMessage('API key name is required and must be less than 100 characters'),
    body('is_sandbox')
      .optional()
      .isBoolean()
      .withMessage('is_sandbox must be a boolean value')
  ],
  requireAuth, 
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Validate input
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
    const { key_name, is_sandbox = true } = req.body;

    // Check current key count limits
    const { data: existingKeys, error: countError } = await vaasSupabase
      .from('vaas_organization_main_api_keys')
      .select('id, is_sandbox')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (countError) {
      throw new Error(`Failed to check existing keys: ${countError.message}`);
    }

    const existingCount = existingKeys?.filter(k => k.is_sandbox === is_sandbox).length || 0;
    const maxKeys = is_sandbox ? 5 : 2;

    if (existingCount >= maxKeys) {
      const keyType = is_sandbox ? 'sandbox' : 'production';
      const actionMsg = is_sandbox 
        ? 'You can have up to 5 sandbox keys for testing.' 
        : 'Production keys are limited to 2 for security. Please revoke unused keys or contact support if you need more.';
      
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'MAIN_API_KEY_LIMIT_EXCEEDED',
          message: `You have reached the maximum limit of ${maxKeys} ${keyType} main API keys. ${actionMsg}`,
          details: {
            current_count: existingCount,
            max_allowed: maxKeys,
            key_type: keyType
          }
        }
      };
      return res.status(400).json(response);
    }

    // Get organization details for developer account creation
    const { data: organization, error: orgError } = await vaasSupabase
      .from('vaas_organizations')
      .select('name, contact_email')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      throw new Error('Organization not found');
    }

    // Generate API key using the exact same format as main API
    console.log('🔑 Generating main API key for organization:', organizationId);
    const { key, hash, prefix } = generateMainAPIKey();
    const keyId = crypto.randomUUID();
    
    console.log('🔑 Main API key generated:', { prefix, keyId, is_sandbox });

    // Store the key info in our database
    const { data: savedKey, error: saveError } = await vaasSupabase
      .from('vaas_organization_main_api_keys')
      .insert([{
        organization_id: organizationId,
        main_api_key_id: keyId,
        key_name: key_name.trim(),
        key_prefix: prefix,
        is_sandbox: is_sandbox,
        created_at: new Date().toISOString()
      }])
      .select('id, key_name, key_prefix, is_sandbox, created_at')
      .single();

    if (saveError) {
      throw new Error(`Failed to save API key: ${saveError.message}`);
    }

    // Register the API key with the main API database for authentication
    try {
      await registerWithMainAPI({
        key,
        hash,
        prefix,
        name: key_name.trim(),
        organizationId,
        isSandbox: is_sandbox
      });
    } catch (mainApiError) {
      console.error('⚠️ Failed to register with main API:', mainApiError);
      // Don't fail the entire operation - the key is still usable via VaaS
    }

    // Update organization settings to set default API key if this is the first one
    const defaultKeyField = is_sandbox ? 'default_sandbox_main_api_key' : 'default_main_api_key';
    
    if (existingCount === 0) {
      const { data: orgData } = await vaasSupabase
        .from('vaas_organizations')
        .select('settings')
        .eq('id', organizationId)
        .single();
      
      await vaasSupabase
        .from('vaas_organizations')
        .update({
          settings: {
            ...(orgData?.settings || {}),
            [defaultKeyField]: key // Store full key for customer portal usage
          }
        })
        .eq('id', organizationId);
    }

    console.log('✅ Main API key created successfully:', savedKey);

    const response: VaasApiResponse = {
      success: true,
      data: {
        api_key: key, // Return the actual key (only shown once)
        key_info: savedKey,
        message: 'Main API key created successfully. Store it securely - it will not be shown again.',
        integration_info: {
          environment: is_sandbox ? 'sandbox' : 'production',
          base_url: MAIN_API_BASE_URL,
          usage: 'This key allows your customer portal to perform real identity verification',
          key_format: 'ik_[64-character hex string] - Compatible with main Idswyft API'
        },
        security_info: {
          store_securely: 'This API key will not be shown again. Store it in a secure location.',
          environment_variable: 'Consider storing in environment variable like VITE_IDSWYFT_API_KEY',
          revocation: 'You can revoke this key at any time from your organization settings'
        }
      }
    };

    res.status(201).json(response);

  } catch (error: any) {
    console.error('[OrganizationMainAPI] Failed to create main API key:', error);
    
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'CREATE_MAIN_API_KEY_FAILED',
        message: error.message || 'Failed to create main API key'
      }
    };
    
    res.status(500).json(response);
  }
});

// Revoke a main API key
router.delete('/main-api-keys/:keyId',
  [
    param('keyId')
      .isUUID()
      .withMessage('Invalid API key ID format')
  ],
  requireAuth, 
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Validate input
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

    console.log('🗑️ Revoking main API key:', { keyId, organizationId });

    // Find the key
    const { data: apiKey, error: findError } = await vaasSupabase
      .from('vaas_organization_main_api_keys')
      .select('id, main_api_key_id, key_name, key_prefix')
      .eq('id', keyId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (findError || !apiKey) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'API_KEY_NOT_FOUND',
          message: 'API key not found or already revoked'
        }
      };
      return res.status(404).json(response);
    }

    console.log('🗑️ Existing key found:', { 
      id: apiKey.id, 
      name: apiKey.key_name, 
      prefix: apiKey.key_prefix 
    });

    // Mark as inactive locally
    const { error: updateError } = await vaasSupabase
      .from('vaas_organization_main_api_keys')
      .update({ is_active: false })
      .eq('id', keyId);

    if (updateError) {
      throw new Error(`Failed to revoke API key: ${updateError.message}`);
    }

    // Also revoke the API key from main API database
    if (mainApiSupabase) {
      try {
        await mainApiSupabase
          .from('api_keys')
          .update({ is_active: false })
          .eq('key_prefix', apiKey.key_prefix);
        
        console.log('✅ API key also revoked from main API');
      } catch (mainApiError) {
        console.warn('⚠️ Failed to revoke API key from main API:', mainApiError);
        // Don't fail the operation if main API cleanup fails
      }
    }

    console.log('✅ Main API key revoked successfully:', { 
      id: apiKey.id, 
      name: apiKey.key_name 
    });

    const response: VaasApiResponse = {
      success: true,
      data: {
        message: 'Main API key revoked successfully',
        revoked_key: {
          id: apiKey.id,
          name: apiKey.key_name,
          key_preview: `${apiKey.key_prefix}...`
        },
        security_info: {
          immediate_effect: 'This API key is immediately invalid for all requests',
          cleanup_recommendation: 'Remove this key from your customer portal environment variables',
          regeneration: 'Generate a new main API key if you need continued verification access'
        }
      }
    };

    res.json(response);

  } catch (error: any) {
    console.error('[OrganizationMainAPI] Failed to revoke main API key:', error);
    
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'REVOKE_MAIN_API_KEY_FAILED',
        message: error.message || 'Failed to revoke main API key'
      }
    };
    
    res.status(500).json(response);
  }
});

export default router;