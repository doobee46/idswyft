import { Request, Response, NextFunction } from 'express';
import { VaasApiResponse } from '../types/index.js';
import { isValidSlug } from '../utils/slug.js';

interface ValidationError {
  field: string;
  message: string;
}

export const validateCreateOrganization = (req: Request, res: Response, next: NextFunction) => {
  const errors: ValidationError[] = [];
  const { name, slug, contact_email, admin_email, admin_password, subscription_tier } = req.body;
  
  // Required fields
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Organization name must be at least 2 characters' });
  }
  
  if (!contact_email || !isValidEmail(contact_email)) {
    errors.push({ field: 'contact_email', message: 'Valid contact email is required' });
  }
  
  if (!admin_email || !isValidEmail(admin_email)) {
    errors.push({ field: 'admin_email', message: 'Valid admin email is required' });
  }
  
  if (!admin_password || admin_password.length < 8) {
    errors.push({ field: 'admin_password', message: 'Admin password must be at least 8 characters' });
  }
  
  // Optional slug validation
  if (slug && !isValidSlug(slug)) {
    errors.push({ field: 'slug', message: 'Slug must be 3-100 characters, lowercase letters, numbers, and hyphens only' });
  }
  
  // Optional subscription tier validation
  if (subscription_tier && !['starter', 'professional', 'enterprise'].includes(subscription_tier)) {
    errors.push({ field: 'subscription_tier', message: 'Invalid subscription tier' });
  }
  
  if (errors.length > 0) {
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors
      }
    };
    
    return res.status(400).json(response);
  }
  
  next();
};

export const validateLoginRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors: ValidationError[] = [];
  const { email, password } = req.body;
  
  if (!email || !isValidEmail(email)) {
    errors.push({ field: 'email', message: 'Valid email is required' });
  }
  
  if (!password || password.length < 1) {
    errors.push({ field: 'password', message: 'Password is required' });
  }
  
  if (errors.length > 0) {
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors
      }
    };
    
    return res.status(400).json(response);
  }
  
  next();
};

export const validateStartVerification = (req: Request, res: Response, next: NextFunction) => {
  const errors: ValidationError[] = [];
  const { end_user, settings } = req.body;
  
  if (!end_user || typeof end_user !== 'object') {
    errors.push({ field: 'end_user', message: 'End user information is required' });
  } else {
    // At least one of email or phone is required
    if (!end_user.email && !end_user.phone) {
      errors.push({ field: 'end_user', message: 'Either email or phone is required' });
    }
    
    if (end_user.email && !isValidEmail(end_user.email)) {
      errors.push({ field: 'end_user.email', message: 'Valid email format required' });
    }
    
    if (end_user.phone && !isValidPhone(end_user.phone)) {
      errors.push({ field: 'end_user.phone', message: 'Valid phone format required' });
    }
    
    if (end_user.external_id && (typeof end_user.external_id !== 'string' || end_user.external_id.length > 255)) {
      errors.push({ field: 'end_user.external_id', message: 'External ID must be a string up to 255 characters' });
    }
  }
  
  // Optional settings validation
  if (settings) {
    if (settings.callback_url && !isValidUrl(settings.callback_url)) {
      errors.push({ field: 'settings.callback_url', message: 'Valid callback URL required' });
    }
    
    if (settings.success_redirect_url && !isValidUrl(settings.success_redirect_url)) {
      errors.push({ field: 'settings.success_redirect_url', message: 'Valid success redirect URL required' });
    }
    
    if (settings.failure_redirect_url && !isValidUrl(settings.failure_redirect_url)) {
      errors.push({ field: 'settings.failure_redirect_url', message: 'Valid failure redirect URL required' });
    }
  }
  
  if (errors.length > 0) {
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors
      }
    };
    
    return res.status(400).json(response);
  }
  
  next();
};

export const validateWebhookConfig = (req: Request, res: Response, next: NextFunction) => {
  const errors: ValidationError[] = [];
  const { url, events } = req.body;
  
  if (!url || !isValidUrl(url)) {
    errors.push({ field: 'url', message: 'Valid webhook URL is required' });
  }
  
  if (!events || !Array.isArray(events) || events.length === 0) {
    errors.push({ field: 'events', message: 'At least one event type is required' });
  } else {
    const validEvents = [
      'verification.started',
      'verification.completed',
      'verification.failed',
      'verification.manual_review',
      'user.created',
      'user.updated',
      'billing.usage_updated',
      'billing.payment_failed'
    ];
    
    const invalidEvents = events.filter(event => !validEvents.includes(event));
    if (invalidEvents.length > 0) {
      errors.push({ 
        field: 'events', 
        message: `Invalid event types: ${invalidEvents.join(', ')}. Valid events: ${validEvents.join(', ')}` 
      });
    }
  }
  
  if (errors.length > 0) {
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors
      }
    };
    
    return res.status(400).json(response);
  }
  
  next();
};

export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string);
  const perPage = parseInt(req.query.per_page as string);
  
  if (req.query.page && (isNaN(page) || page < 1)) {
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Page must be a positive integer'
      }
    };
    
    return res.status(400).json(response);
  }
  
  if (req.query.per_page && (isNaN(perPage) || perPage < 1 || perPage > 100)) {
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Per page must be between 1 and 100'
      }
    };
    
    return res.status(400).json(response);
  }
  
  next();
};

// Utility functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone: string): boolean {
  // Simple phone validation - accepts international format
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s-()]/g, ''));
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}