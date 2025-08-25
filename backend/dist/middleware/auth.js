import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { supabase } from '../config/database.js';
import config from '../config/index.js';
import { AuthenticationError, AuthorizationError, catchAsync } from './errorHandler.js';
import { logger } from '../utils/logger.js';
// API Key authentication middleware
export const authenticateAPIKey = catchAsync(async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        throw new AuthenticationError('API key is required. Include X-API-Key header.');
    }
    // Extract key prefix and hash the full key
    const keyPrefix = apiKey.substring(0, 8);
    const keyHash = crypto
        .createHmac('sha256', config.apiKeySecret)
        .update(apiKey)
        .digest('hex');
    try {
        // Find API key in database
        const { data: apiKeyRecord, error: keyError } = await supabase
            .from('api_keys')
            .select(`
        *,
        developer:developers(*)
      `)
            .eq('key_hash', keyHash)
            .eq('is_active', true)
            .single();
        if (keyError || !apiKeyRecord) {
            logger.warn('Invalid API key attempted', {
                keyPrefix,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            throw new AuthenticationError('Invalid API key');
        }
        // Check if key is expired
        if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
            throw new AuthenticationError('API key has expired');
        }
        // Update last used timestamp
        await supabase
            .from('api_keys')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', apiKeyRecord.id);
        // Attach API key and developer to request
        req.apiKey = apiKeyRecord;
        req.developer = apiKeyRecord.developer;
        logger.info('API key authenticated', {
            developerId: apiKeyRecord.developer_id,
            keyPrefix,
            isSandbox: apiKeyRecord.is_sandbox
        });
        next();
    }
    catch (error) {
        if (error instanceof AuthenticationError) {
            throw error;
        }
        logger.error('API key authentication error:', error);
        throw new AuthenticationError('Authentication failed');
    }
});
// JWT authentication for admin users
export const authenticateJWT = catchAsync(async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        throw new AuthenticationError('Access token is required');
    }
    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        // Get admin user from database
        const { data: adminUser, error } = await supabase
            .from('admin_users')
            .select('*')
            .eq('id', decoded.id)
            .single();
        if (error || !adminUser) {
            throw new AuthenticationError('Invalid token');
        }
        req.user = {
            ...adminUser,
            updated_at: adminUser.updated_at || adminUser.created_at
        };
        next();
    }
    catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            throw new AuthenticationError('Invalid token');
        }
        if (error instanceof jwt.TokenExpiredError) {
            throw new AuthenticationError('Token has expired');
        }
        throw error;
    }
});
// User authentication (for verification endpoints)
export const authenticateUser = catchAsync(async (req, res, next) => {
    // For verification endpoints, we'll use user_id from request body/params
    // and validate against the API key's permissions
    if (!req.apiKey || !req.developer) {
        throw new AuthenticationError('API key authentication required');
    }
    const userId = req.body.user_id || req.params.user_id;
    if (!userId) {
        throw new AuthenticationError('User ID is required');
    }
    try {
        // Get or create user
        let { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        if (error && error.code === 'PGRST116') {
            // User doesn't exist, create them
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({ id: userId })
                .select('*')
                .single();
            if (createError) {
                logger.error('Failed to create user:', createError);
                throw new AuthenticationError('Failed to authenticate user');
            }
            user = newUser;
            logger.info('New user created', { userId, developerId: req.developer.id });
        }
        else if (error) {
            logger.error('User authentication error:', error);
            throw new AuthenticationError('Failed to authenticate user');
        }
        req.user = user;
        next();
    }
    catch (error) {
        if (error instanceof AuthenticationError) {
            throw error;
        }
        logger.error('User authentication error:', error);
        throw new AuthenticationError('Authentication failed');
    }
});
// Authorization middleware for admin roles
export const requireAdminRole = (allowedRoles = ['admin', 'reviewer']) => {
    return catchAsync(async (req, res, next) => {
        if (!req.user) {
            throw new AuthenticationError('Authentication required');
        }
        const adminUser = req.user;
        if (!allowedRoles.includes(adminUser.role)) {
            logger.warn('Unauthorized admin access attempt', {
                userId: adminUser.id,
                role: adminUser.role,
                requiredRoles: allowedRoles,
                endpoint: req.originalUrl
            });
            throw new AuthorizationError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
        }
        next();
    });
};
// Sandbox mode check
export const checkSandboxMode = (req, res, next) => {
    const isSandboxRequest = req.body.sandbox === true || req.query.sandbox === 'true';
    const isProductionEnv = config.nodeEnv === 'production';
    if (req.apiKey) {
        const isSandboxKey = req.apiKey.is_sandbox;
        // Environment-based key validation
        if (isProductionEnv && isSandboxKey) {
            throw new AuthorizationError('Sandbox API keys cannot be used in production environment');
        }
        if (!isProductionEnv && !isSandboxKey) {
            throw new AuthorizationError('Production API keys cannot be used in development environment');
        }
        // Sandbox keys can only make sandbox requests
        if (isSandboxKey && !isSandboxRequest) {
            throw new AuthorizationError('Sandbox API keys can only make sandbox requests');
        }
        // Production keys cannot make sandbox requests
        if (!isSandboxKey && isSandboxRequest) {
            throw new AuthorizationError('Production API keys cannot make sandbox requests');
        }
    }
    // Add sandbox flag to request for downstream middleware
    req.isSandbox = isSandboxRequest || req.apiKey?.is_sandbox || false;
    next();
};
// Rate limiting bypass for premium developers (future feature)
export const checkPremiumAccess = catchAsync(async (req, res, next) => {
    if (!req.developer) {
        return next();
    }
    // For now, all developers have the same access level
    // This can be extended to check for premium subscriptions
    req.isPremium = false;
    next();
});
// Generate JWT token for admin users
export const generateAdminToken = (adminUser) => {
    return jwt.sign({
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
    }, config.jwtSecret, {
        expiresIn: '24h',
        issuer: 'idswyft-api',
        audience: 'idswyft-admin'
    });
};
// Generate JWT token for developers
export const generateDeveloperToken = (developer) => {
    return jwt.sign({
        id: developer.id,
        email: developer.email,
        type: 'developer'
    }, config.jwtSecret, {
        expiresIn: '7d',
        issuer: 'idswyft-api',
        audience: 'idswyft-developer'
    });
};
// JWT authentication for developers
export const authenticateDeveloperJWT = catchAsync(async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        throw new AuthenticationError('Access token is required');
    }
    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        // Verify it's a developer token
        if (decoded.type !== 'developer') {
            throw new AuthenticationError('Invalid developer token');
        }
        // Get developer from database
        const { data: developer, error } = await supabase
            .from('developers')
            .select('*')
            .eq('id', decoded.id)
            .eq('is_verified', true)
            .single();
        if (error || !developer) {
            throw new AuthenticationError('Invalid token or developer not found');
        }
        req.developer = developer;
        next();
    }
    catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            throw new AuthenticationError('Invalid token');
        }
        if (error instanceof jwt.TokenExpiredError) {
            throw new AuthenticationError('Token has expired');
        }
        throw error;
    }
});
// Generate API key
export const generateAPIKey = () => {
    const key = `ik_${crypto.randomBytes(32).toString('hex')}`;
    const hash = crypto
        .createHmac('sha256', config.apiKeySecret)
        .update(key)
        .digest('hex');
    const prefix = key.substring(0, 8);
    return { key, hash, prefix };
};
// Middleware to log authentication events
export const logAuthEvent = (event) => {
    return (req, res, next) => {
        logger.info(`Auth event: ${event}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            developerId: req.developer?.id,
            userId: req.user?.id,
            apiKeyPrefix: req.apiKey?.key_prefix
        });
        next();
    };
};
export default {
    authenticateAPIKey,
    authenticateJWT,
    authenticateDeveloperJWT,
    authenticateUser,
    requireAdminRole,
    checkSandboxMode,
    checkPremiumAccess,
    generateAdminToken,
    generateDeveloperToken,
    generateAPIKey,
    logAuthEvent
};
