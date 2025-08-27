import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { supabase } from '../config/database.js';
import { generateAPIKey, authenticateDeveloperJWT } from '../middleware/auth.js';
import { catchAsync, ValidationError, NotFoundError, AuthenticationError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { getRecentActivities } from '../middleware/apiLogger.js';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
const router = express.Router();
// Rate limiting for developer registration
const registrationRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 registration attempts per windowMs
    message: {
        error: 'Too many registration attempts from this IP, please try again later.',
        retryAfter: 15 * 60 * 1000
    },
    standardHeaders: true,
    legacyHeaders: false
});
// Rate limiting for API key operations
const apiKeyRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 50, // limit each IP to 50 API key operations per minute (increased for development)
    message: {
        error: 'Too many API key operations, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});
// Register as developer
router.post('/register', registrationRateLimit, [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('name')
        .trim()
        .escape()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('company')
        .optional()
        .trim()
        .escape()
        .isLength({ max: 100 })
        .withMessage('Company name must be less than 100 characters'),
    body('webhook_url')
        .optional()
        .isURL({ protocols: ['https'] })
        .withMessage('Webhook URL must be a valid HTTPS URL')
], catchAsync(async (req, res) => {
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
    // Set appropriate sandbox mode based on environment
    const isProductionEnv = process.env.NODE_ENV === 'production';
    const defaultIsSandbox = !isProductionEnv; // Sandbox in dev, production in prod
    console.log('🔑 Inserting API key into database...');
    const { data: apiKey, error: keyError } = await supabase
        .from('api_keys')
        .insert({
        developer_id: developer.id,
        key_hash: hash,
        key_prefix: prefix,
        name: 'Default API Key',
        is_sandbox: defaultIsSandbox
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
}));
// Create API key (requires developer authentication)
router.post('/api-key', apiKeyRateLimit, [
    body('name')
        .trim()
        .escape()
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
], authenticateDeveloperJWT, catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', 'multiple', errors.array());
    }
    const { name, is_sandbox = false, expires_in_days } = req.body;
    const developer = req.developer;
    if (!developer) {
        throw new AuthenticationError('Developer authentication required');
    }
    // Debug logging for API key creation
    console.log('🔑 API Key Creation Debug:', {
        originalRequest: { name, is_sandbox, expires_in_days },
        environment: process.env.NODE_ENV,
        developerEmail: developer.email,
        requestBody: req.body
    });
    // Environment-based API key restrictions
    const isProductionEnv = process.env.NODE_ENV === 'production';
    if (isProductionEnv && is_sandbox) {
        throw new ValidationError('Sandbox API keys cannot be created in production environment. Use production keys only.', 'is_sandbox', 'Production environment requires production keys only');
    }
    if (!isProductionEnv && !is_sandbox) {
        throw new ValidationError('Production API keys cannot be created in development/local environment. Use sandbox keys only.', 'is_sandbox', 'Development environment requires sandbox keys only');
    }
    // Check if developer has reached API key limit
    const { count: existingKeysCount, error: countError } = await supabase
        .from('api_keys')
        .select('*', { count: 'exact', head: true })
        .eq('developer_id', developer.id)
        .eq('is_active', true);
    if (countError) {
        logger.error('Failed to count API keys:', countError);
        throw new Error('Failed to check API key limits');
    }
    const maxKeys = is_sandbox ? 10 : 5; // Allow more sandbox keys
    if (existingKeysCount && existingKeysCount >= maxKeys) {
        throw new ValidationError(`Maximum ${maxKeys} ${is_sandbox ? 'sandbox' : 'production'} API keys allowed. Please revoke unused keys.`, 'api_key_limit', maxKeys);
    }
    // Generate API key with enhanced security
    console.log('🔑 Generating API key...');
    const { key, hash, prefix } = generateAPIKey();
    const keyId = crypto.randomUUID();
    console.log('🔑 API key generated:', { prefix, keyId });
    // Calculate expiration date
    let expiresAt = null;
    if (expires_in_days) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expires_in_days);
    }
    // Create API key record with enhanced security
    console.log('🔑 Inserting API key into database...');
    const { data: apiKey, error: keyError } = await supabase
        .from('api_keys')
        .insert({
        id: keyId,
        developer_id: developer.id,
        key_hash: hash,
        key_prefix: prefix,
        name,
        is_sandbox: is_sandbox, // Explicitly set the value
        expires_at: expiresAt?.toISOString(),
        created_at: new Date().toISOString()
    })
        .select('id, name, is_sandbox, created_at, expires_at')
        .single();
    if (keyError) {
        console.error('🚨 API Key Creation Error:', keyError);
        logger.error('Failed to create API key:', keyError);
        throw new Error(`Failed to create API key: ${keyError.message || keyError.code || 'Unknown database error'}`);
    }
    // Debug logging for created API key
    console.log('🔑 API Key Created Successfully:', {
        savedKey: {
            id: apiKey.id,
            name: apiKey.name,
            is_sandbox: apiKey.is_sandbox
        },
        requestedSandbox: is_sandbox,
        actualSandbox: apiKey.is_sandbox,
        sandboxMismatch: is_sandbox !== apiKey.is_sandbox
    });
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
        key_prefix: prefix,
        security_info: {
            store_securely: 'This API key will not be shown again. Store it in a secure location.',
            environment_variable: 'Consider storing in an environment variable like IDSWYFT_API_KEY',
            revocation: 'You can revoke this key at any time from your developer dashboard'
        },
        message: 'API key created successfully. Store it securely - it will not be shown again.'
    });
}));
// List API keys for developer
router.get('/api-keys', apiKeyRateLimit, authenticateDeveloperJWT, catchAsync(async (req, res) => {
    const developer = req.developer;
    if (!developer) {
        throw new AuthenticationError('Developer authentication required');
    }
    // Get API keys with additional security info (only active keys)
    const { data: apiKeys, error } = await supabase
        .from('api_keys')
        .select('id, key_prefix, name, is_sandbox, is_active, last_used_at, created_at, expires_at')
        .eq('developer_id', developer.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
    if (error) {
        logger.error('Failed to get API keys:', error);
        throw new Error('Failed to get API keys');
    }
    res.json({
        api_keys: apiKeys.map(key => {
            const isExpired = key.expires_at && new Date(key.expires_at) < new Date();
            const daysSinceLastUse = key.last_used_at
                ? Math.floor((Date.now() - new Date(key.last_used_at).getTime()) / (1000 * 60 * 60 * 24))
                : null;
            return {
                id: key.id,
                name: key.name,
                key_preview: `${key.key_prefix}...`,
                is_sandbox: key.is_sandbox,
                is_active: key.is_active && !isExpired,
                last_used_at: key.last_used_at,
                created_at: key.created_at,
                expires_at: key.expires_at,
                status: !key.is_active ? 'revoked' : isExpired ? 'expired' : 'active',
                security_status: {
                    days_since_last_use: daysSinceLastUse,
                    needs_rotation: daysSinceLastUse && daysSinceLastUse > 90,
                    expires_soon: key.expires_at && new Date(key.expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
                }
            };
        }),
        total_keys: apiKeys.length,
        active_keys: apiKeys.filter(k => k.is_active && (!k.expires_at || new Date(k.expires_at) >= new Date())).length,
        security_recommendations: {
            rotate_unused_keys: 'Consider rotating API keys that haven\'t been used in 90+ days',
            monitor_usage: 'Regularly monitor API key usage and revoke unused keys',
            use_environment_variables: 'Store API keys in environment variables, not in code'
        }
    });
}));
// Revoke API key
router.delete('/api-key/:keyId', apiKeyRateLimit, [
    param('keyId')
        .isUUID()
        .withMessage('Invalid API key ID format')
], authenticateDeveloperJWT, catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', 'multiple', errors.array());
    }
    const { keyId } = req.params;
    const developer = req.developer;
    if (!developer) {
        throw new AuthenticationError('Developer authentication required');
    }
    // Debug logging
    console.log('🗑️ Deleting API key:', { keyId, developerId: developer.id });
    // First, check if the key exists and belongs to the developer
    const { data: existingKey, error: checkError } = await supabase
        .from('api_keys')
        .select('id, name, key_prefix, is_active')
        .eq('id', keyId)
        .eq('developer_id', developer.id)
        .single();
    console.log('🗑️ Existing key check:', { existingKey, checkError });
    if (checkError || !existingKey) {
        console.log('🗑️ API key not found:', { keyId, developerId: developer.id, checkError });
        throw new NotFoundError('API key not found or does not belong to this developer');
    }
    // Deactivate API key
    const { data: apiKey, error } = await supabase
        .from('api_keys')
        .update({
        is_active: false
    })
        .eq('id', keyId)
        .eq('developer_id', developer.id)
        .select('id, name, key_prefix')
        .single();
    console.log('🗑️ Update result:', { apiKey, error });
    if (error || !apiKey) {
        console.log('🗑️ Failed to update API key:', error);
        throw new Error(`Failed to deactivate API key: ${error?.message || 'Unknown error'}`);
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
            name: apiKey.name,
            key_preview: `${apiKey.key_prefix}...`
        },
        security_info: {
            immediate_effect: 'This API key is immediately invalid for all requests',
            cleanup_recommendation: 'Remove this key from your applications and environment variables',
            regeneration: 'Generate a new API key if you need continued access'
        }
    });
}));
// Get developer usage statistics
router.get('/stats', apiKeyRateLimit, authenticateDeveloperJWT, catchAsync(async (req, res) => {
    const developer = req.developer;
    if (!developer) {
        throw new AuthenticationError('Developer authentication required');
    }
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    // Get verification request stats
    const { data: stats, error } = await supabase
        .from('verification_requests')
        .select('status, created_at')
        .eq('developer_id', developer.id)
        .gte('created_at', thirtyDaysAgo.toISOString());
    if (error) {
        logger.error('Failed to get developer stats:', error);
        throw new Error('Failed to get usage statistics');
    }
    const totalRequests = stats.length;
    const successfulRequests = stats.filter(s => s.status === 'verified').length;
    const failedRequests = stats.filter(s => s.status === 'failed').length;
    const pendingRequests = stats.filter(s => s.status === 'pending').length;
    const manualReviewRequests = stats.filter(s => s.status === 'manual_review').length;
    res.json({
        period: '30_days',
        total_requests: totalRequests,
        successful_requests: successfulRequests,
        failed_requests: failedRequests,
        pending_requests: pendingRequests,
        manual_review_requests: manualReviewRequests,
        success_rate: totalRequests > 0 ? (successfulRequests / totalRequests * 100).toFixed(2) + '%' : '0%',
        monthly_limit: 1000,
        monthly_usage: totalRequests,
        remaining_quota: Math.max(0, 1000 - totalRequests),
        quota_reset_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
    });
}));
// Get API activity logs
router.get('/activity', apiKeyRateLimit, authenticateDeveloperJWT, catchAsync(async (req, res) => {
    const developer = req.developer;
    if (!developer) {
        throw new AuthenticationError('Developer authentication required');
    }
    // Get recent activities from memory (fast)
    const recentActivities = getRecentActivities(developer.id);
    // Debug logging for activities
    console.log(`🔍 Developer ${developer.id} activity check:`, {
        activitiesFound: recentActivities.length,
        recentActivities: recentActivities.slice(0, 3).map(a => ({
            method: a.method,
            endpoint: a.endpoint,
            timestamp: a.timestamp
        }))
    });
    // Get verification statistics from database
    const { data: verificationStats, error: statsError } = await supabase
        .from('verification_requests')
        .select('status')
        .eq('developer_id', developer.id);
    if (statsError) {
        logger.error('Failed to get verification stats:', statsError);
    }
    // Calculate statistics
    const stats = {
        total_requests: verificationStats?.length || 0,
        successful_requests: verificationStats?.filter(v => v.status === 'verified').length || 0,
        failed_requests: verificationStats?.filter(v => v.status === 'failed').length || 0,
        pending_requests: verificationStats?.filter(v => v.status === 'pending').length || 0,
        manual_review_requests: verificationStats?.filter(v => v.status === 'manual_review').length || 0
    };
    // Format recent activities for frontend
    const formattedActivities = recentActivities.slice(0, 50).map(activity => ({
        timestamp: activity.timestamp || new Date(),
        method: activity.method,
        endpoint: activity.endpoint,
        status_code: activity.status_code,
        response_time_ms: activity.response_time_ms,
        user_agent: activity.user_agent,
        ip_address: activity.ip_address,
        error_message: activity.error_message
    }));
    res.json({
        statistics: stats,
        recent_activities: formattedActivities,
        total_activities: recentActivities.length
    });
}));
export default router;
