import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { vaasSupabase } from '../config/database.js';
import config from '../config/index.js';
import { VaasApiResponse } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  admin?: {
    id: string;
    organization_id: string;
    email: string;
    role: string;
    permissions: any;
  };
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token required'
        }
      };
      
      return res.status(401).json(response);
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    
    // Get admin details from database
    const { data: admin, error } = await vaasSupabase
      .from('vaas_admins')
      .select(`
        id,
        organization_id,
        email,
        role,
        permissions,
        status,
        vaas_organizations!inner(
          id,
          name,
          slug,
          billing_status
        )
      `)
      .eq('id', decoded.admin_id)
      .eq('status', 'active')
      .single();
      
    if (error || !admin) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired authentication token'
        }
      };
      
      return res.status(401).json(response);
    }
    
    // Check if organization is active
    if ((admin.vaas_organizations as any).billing_status === 'suspended' || (admin.vaas_organizations as any).billing_status === 'cancelled') {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'ORGANIZATION_SUSPENDED',
          message: 'Organization account is suspended'
        }
      };
      
      return res.status(403).json(response);
    }
    
    // Update last login
    await vaasSupabase
      .from('vaas_admins')
      .update({ 
        last_login_at: new Date().toISOString(),
        login_count: ((admin as any).login_count || 0) + 1
      })
      .eq('id', admin.id);
    
    // Attach admin to request
    req.admin = {
      id: admin.id,
      organization_id: admin.organization_id,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions
    };
    
    next();
  } catch (error: any) {
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication failed'
      }
    };
    
    res.status(401).json(response);
  }
};

export const requireSuperAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // First check regular auth
  await new Promise<void>((resolve, reject) => {
    requireAuth(req, res, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  
  if (!req.admin) {
    return; // Auth middleware already sent response
  }
  
  // Check if user is super admin (defined by environment variable)
  const superAdminEmails = (config.superAdminEmails || '').split(',').map(e => e.trim());
  
  if (!superAdminEmails.includes(req.admin.email)) {
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Super admin access required'
      }
    };
    
    return res.status(403).json(response);
  }
  
  next();
};

export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      };
      
      return res.status(401).json(response);
    }
    
    // Owners and super admins have all permissions
    if (req.admin.role === 'owner' || req.admin.email === process.env.SUPER_ADMIN_EMAIL) {
      return next();
    }
    
    // Check specific permission
    if (!req.admin.permissions?.[permission]) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Permission '${permission}' required`
        }
      };
      
      return res.status(403).json(response);
    }
    
    next();
  };
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      };
      
      return res.status(401).json(response);
    }
    
    if (!roles.includes(req.admin.role)) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Role '${roles.join(' or ')}' required`
        }
      };
      
      return res.status(403).json(response);
    }
    
    next();
  };
};

// API Key authentication for webhook/integration endpoints
export const requireApiKey = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'API key required'
        }
      };
      
      return res.status(401).json(response);
    }
    
    // Extract key prefix to find the organization
    const keyPrefix = apiKey.substring(0, 20);
    
    const { data: apiKeyRecord, error } = await vaasSupabase
      .from('vaas_api_keys')
      .select(`
        id,
        organization_id,
        name,
        scopes,
        rate_limit_per_hour,
        enabled,
        vaas_organizations!inner(
          id,
          name,
          slug,
          billing_status
        )
      `)
      .eq('key_prefix', keyPrefix)
      .eq('enabled', true)
      .single();
      
    if (error || !apiKeyRecord) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key'
        }
      };
      
      return res.status(401).json(response);
    }
    
    // Update last used timestamp
    await vaasSupabase
      .from('vaas_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyRecord.id);
    
    // Attach API key info to request
    (req as any).apiKey = apiKeyRecord;
    
    next();
  } catch (error: any) {
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'API_KEY_ERROR',
        message: 'API key authentication failed'
      }
    };
    
    res.status(401).json(response);
  }
};

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}