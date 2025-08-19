import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '@/config/database.js';
import { generateAPIKey } from '@/middleware/auth.js';
import { catchAsync, ValidationError, NotFoundError } from '@/middleware/errorHandler.js';
import { logger } from '@/utils/logger.js';

const router = express.Router();

// Register as developer
router.post('/register',
  [
    body('email')
      .isEmail()
      .withMessage('Valid email is required'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('company')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Company name must be less than 100 characters'),
    body('webhook_url')
      .optional()
      .isURL()
      .withMessage('Webhook URL must be a valid URL')
  ],
  catchAsync(async (req, res) => {
    console.log('🎯 REGISTRATION ENDPOINT CALLED', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', 'multiple', errors.array());
    }
    
    const { email, name, company, webhook_url } = req.body;
    
    // Check if developer already exists
    const { data: existingDev, error: checkError } = await supabase
      .from('developers')
      .select('id')
      .eq('email', email)
      .single();
    
    // If no error and data exists, developer already exists
    if (existingDev && !checkError) {
      throw new ValidationError('Developer with this email already exists', 'email', email);
    }
    
    // Create developer
    const { data: developer, error } = await supabase
      .from('developers')
      .insert({
        email,
        name,
        company,
        webhook_url,
        is_verified: true // Auto-verify for MVP
      })
      .select('*')
      .single();
    
    if (error) {
      console.error('🚨 Developer creation failed:', error);
      logger.error('Database error:', error);
      
      // Handle specific duplicate email error
      if (error.code === '23505' && error.details?.includes('email')) {
        throw new ValidationError('Developer with this email already exists', 'email', email);
      }
      
      throw new Error('Failed to create developer account');
    }
    
    console.log('✅ Developer created successfully:', developer.id);
    console.log('📋 Developer object:', developer);
    
    // Create initial API key
    console.log('🔑 About to generate API key...');
    console.log('🔑 Generating API key for developer:', developer.id);
    const { key, hash, prefix } = generateAPIKey();
    console.log('🔑 Generated API key parts:', { keyLength: key.length, prefix, hashLength: hash.length });
    
    console.log('🔑 Inserting API key into database...');
    const { data: apiKey, error: keyError } = await supabase
      .from('api_keys')
      .insert({
        developer_id: developer.id,
        key_hash: hash,
        key_prefix: prefix,
        name: 'Default API Key',
        is_sandbox: false
      })
      .select('id, name, is_sandbox, created_at')
      .single();
    
    console.log('🔑 API key insertion result:', { data: !!apiKey, error: keyError });
    
    if (keyError) {
      console.error('🚨 API key creation failed:', keyError);
      logger.error('Failed to create API key:', keyError);
      // Still return developer info even if API key creation fails
      return res.status(201).json({
        developer: {
          id: developer.id,
          email: developer.email,
          name: developer.name,
          company: developer.company,
          is_verified: developer.is_verified,
          created_at: developer.created_at
        },
        message: 'Developer account created successfully, but API key creation failed. Please create one manually.',
        error: 'API key creation failed'
      });
    }
    
    console.log('✅ API key created successfully:', apiKey);
    
    logger.info('New developer registered', {
      developerId: developer.id,
      email: developer.email,
      company: developer.company,
      apiKeyId: apiKey.id
    });
    
    res.status(201).json({
      developer: {
        id: developer.id,
        email: developer.email,
        name: developer.name,
        company: developer.company,
        is_verified: developer.is_verified,
        created_at: developer.created_at
      },
      api_key: {
        key, // Only returned once
        id: apiKey.id,
        name: apiKey.name,
        is_sandbox: apiKey.is_sandbox,
        created_at: apiKey.created_at
      },
      message: 'Developer account created successfully. Store your API key securely - it will not be shown again.'
    });
  })
);

// Create API key (requires developer authentication)
router.post('/api-key',
  // TODO: Add developer authentication middleware
  [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('API key name is required and must be less than 100 characters'),
    body('is_sandbox')
      .optional()
      .isBoolean()
      .withMessage('is_sandbox must be a boolean'),
    body('expires_in_days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('expires_in_days must be between 1 and 365')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', 'multiple', errors.array());
    }
    
    // For MVP, we'll use email from request body
    // In production, this would come from authenticated session
    const { developer_email, name, is_sandbox = false, expires_in_days } = req.body;
    
    if (!developer_email) {
      throw new ValidationError('Developer email is required', 'developer_email', developer_email);
    }
    
    // Get developer
    const { data: developer, error: devError } = await supabase
      .from('developers')
      .select('*')
      .eq('email', developer_email)
      .single();
    
    if (devError || !developer) {
      throw new NotFoundError('Developer');
    }
    
    // Generate API key
    const { key, hash, prefix } = generateAPIKey();
    
    // Calculate expiration date
    let expiresAt = null;
    if (expires_in_days) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expires_in_days);
    }
    
    // Create API key record
    const { data: apiKey, error: keyError } = await supabase
      .from('api_keys')
      .insert({
        developer_id: developer.id,
        key_hash: hash,
        key_prefix: prefix,
        name,
        is_sandbox,
        expires_at: expiresAt?.toISOString()
      })
      .select('id, name, is_sandbox, created_at, expires_at')
      .single();
    
    if (keyError) {
      logger.error('Failed to create API key:', keyError);
      throw new Error('Failed to create API key');
    }
    
    logger.info('API key created', {
      developerId: developer.id,
      keyId: apiKey.id,
      isSandbox: is_sandbox,
      expiresAt
    });
    
    res.status(201).json({
      api_key: key, // Only returned once
      key_id: apiKey.id,
      name: apiKey.name,
      is_sandbox: apiKey.is_sandbox,
      created_at: apiKey.created_at,
      expires_at: apiKey.expires_at,
      message: 'API key created successfully. Store it securely - it will not be shown again.'
    });
  })
);

// List API keys for developer
router.get('/api-keys',
  // TODO: Add developer authentication middleware
  catchAsync(async (req, res) => {
    const { developer_email } = req.query;
    
    if (!developer_email) {
      throw new ValidationError('Developer email is required', 'developer_email', developer_email);
    }
    
    // Get developer
    const { data: developer, error: devError } = await supabase
      .from('developers')
      .select('id')
      .eq('email', developer_email as string)
      .single();
    
    if (devError || !developer) {
      throw new NotFoundError('Developer');
    }
    
    // Get API keys
    const { data: apiKeys, error } = await supabase
      .from('api_keys')
      .select('id, key_prefix, name, is_sandbox, is_active, last_used_at, created_at, expires_at')
      .eq('developer_id', developer.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      logger.error('Failed to get API keys:', error);
      throw new Error('Failed to get API keys');
    }
    
    res.json({
      api_keys: apiKeys.map(key => ({
        id: key.id,
        name: key.name,
        key_preview: `${key.key_prefix}...`,
        is_sandbox: key.is_sandbox,
        is_active: key.is_active,
        last_used_at: key.last_used_at,
        created_at: key.created_at,
        expires_at: key.expires_at,
        status: key.expires_at && new Date(key.expires_at) < new Date() ? 'expired' : 'active'
      }))
    });
  })
);

// Revoke API key
router.delete('/api-key/:keyId',
  // TODO: Add developer authentication middleware
  catchAsync(async (req, res) => {
    const { keyId } = req.params;
    const { developer_email } = req.body;
    
    if (!developer_email) {
      throw new ValidationError('Developer email is required', 'developer_email', developer_email);
    }
    
    // Get developer
    const { data: developer, error: devError } = await supabase
      .from('developers')
      .select('id')
      .eq('email', developer_email)
      .single();
    
    if (devError || !developer) {
      throw new NotFoundError('Developer');
    }
    
    // Deactivate API key
    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId)
      .eq('developer_id', developer.id)
      .select('id, name')
      .single();
    
    if (error || !apiKey) {
      throw new NotFoundError('API key');
    }
    
    logger.info('API key revoked', {
      developerId: developer.id,
      keyId: apiKey.id,
      keyName: apiKey.name
    });
    
    res.json({
      message: 'API key revoked successfully',
      revoked_key: {
        id: apiKey.id,
        name: apiKey.name
      }
    });
  })
);

export default router;