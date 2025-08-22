import { Request, Response, NextFunction } from 'express';
import { supabase } from '@/config/database.js';
import { logger } from '@/utils/logger.js';

interface ApiLogEntry {
  developer_id?: string;
  api_key_id?: string;
  method: string;
  endpoint: string;
  status_code: number;
  response_time_ms: number;
  user_agent?: string;
  ip_address?: string;
  error_message?: string;
  timestamp?: Date;
}

// In-memory store for recent API activities (last 100 calls per developer)
const recentActivities = new Map<string, ApiLogEntry[]>();

export const apiActivityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function to capture response details
  res.end = function(chunk?: any, encoding?: any): any {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Get developer info from request
    const developer = (req as any).developer;
    const apiKey = (req as any).apiKey;
    
    const logEntry: ApiLogEntry = {
      developer_id: developer?.id,
      api_key_id: apiKey?.id,
      method: req.method,
      endpoint: req.originalUrl,
      status_code: res.statusCode,
      response_time_ms: responseTime,
      user_agent: req.get('User-Agent'),
      ip_address: req.ip || req.connection.remoteAddress,
      error_message: res.statusCode >= 400 ? `${res.statusCode} ${res.statusMessage}` : undefined
    };
    
    // Store in memory for quick access (but exclude developer portal calls)
    if (developer?.id && apiKey?.id) { // Only log if there's an API key (external API usage)
      // Filter out developer dashboard internal calls
      const isDeveloperPortalCall = req.originalUrl.startsWith('/api/developer/');
      
      if (!isDeveloperPortalCall) {
        if (!recentActivities.has(developer.id)) {
          recentActivities.set(developer.id, []);
        }
        
        const activities = recentActivities.get(developer.id)!;
        activities.unshift({ ...logEntry, timestamp: new Date() } as any);
        
        // Keep only last 100 activities per developer
        if (activities.length > 100) {
          activities.splice(100);
        }
        
        recentActivities.set(developer.id, activities);
      }
    }
    
    // Log to console for debugging (like in your screenshot)
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const statusColor = res.statusCode >= 400 ? '\x1b[31m' : res.statusCode >= 300 ? '\x1b[33m' : '\x1b[32m';
    const resetColor = '\x1b[0m';
    
    console.log(`${timestamp} ${req.method.padEnd(7)} ${req.originalUrl.padEnd(40)} ${statusColor}${res.statusCode}${resetColor} ${responseTime}ms`);
    
    // Async database logging (don't block response) - only for API key usage
    if (developer?.id && apiKey?.id) {
      const isDeveloperPortalCall = req.originalUrl.startsWith('/api/developer/');
      
      if (!isDeveloperPortalCall) {
        setImmediate(async () => {
          try {
            await supabase
              .from('api_activity_logs')
              .insert({
                developer_id: developer.id,
                api_key_id: apiKey?.id,
                method: req.method,
                endpoint: req.originalUrl,
                status_code: res.statusCode,
                response_time_ms: responseTime,
                user_agent: req.get('User-Agent'),
                ip_address: req.ip || req.connection.remoteAddress,
                error_message: logEntry.error_message,
                timestamp: new Date().toISOString()
              });
          } catch (error) {
            logger.error('Failed to log API activity to database:', error);
          }
        });
      }
    }
    
    // Call original end function
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Get recent activities for a developer
export const getRecentActivities = (developerId: string): ApiLogEntry[] => {
  return recentActivities.get(developerId) || [];
};

// Clear activities for a developer
export const clearActivities = (developerId: string): void => {
  recentActivities.delete(developerId);
};