import { Application, Router } from 'express';

interface RouteInfo {
  method: string;
  path: string;
  description?: string;
}

interface GroupedRoutes {
  [group: string]: {
    [endpoint: string]: string;
  };
}

/**
 * Extract all routes from Express app and routers
 */
export function extractRoutes(app: Application): RouteInfo[] {
  const routes: RouteInfo[] = [];

  // Extract routes from the main app
  extractRoutesFromStack(app._router?.stack || [], '', routes);

  return routes;
}

/**
 * Recursively extract routes from router stack
 */
function extractRoutesFromStack(stack: any[], basePath: string, routes: RouteInfo[]) {
  stack.forEach((middleware) => {
    if (middleware.route) {
      // Direct route
      const path = basePath + middleware.route.path;
      const methods = Object.keys(middleware.route.methods);
      
      methods.forEach((method) => {
        routes.push({
          method: method.toUpperCase(),
          path: path,
          description: getRouteDescription(method.toUpperCase(), path)
        });
      });
    } else if (middleware.name === 'router') {
      // Sub-router - extract base path from regexp
      let routerBasePath = basePath;
      
      if (middleware.regexp && middleware.regexp.source) {
        const regexMatch = middleware.regexp.source.match(/^\\?\^(.*?)\\\?\$/);
        if (regexMatch && regexMatch[1]) {
          const pathPart = regexMatch[1]
            .replace(/\\\//g, '/')
            .replace(/\(\?\:\(\\\.\)\?\)\?\$/, '')
            .replace(/\$/, '');
          routerBasePath = basePath + pathPart;
        }
      }
      
      if (middleware.handle?.stack) {
        extractRoutesFromStack(middleware.handle.stack, routerBasePath, routes);
      }
    }
  });
}

/**
 * Generate descriptions for common route patterns
 */
function getRouteDescription(method: string, path: string): string {
  const descriptions: { [key: string]: string } = {
    // Health routes
    'GET /api/health': 'Health check endpoint',
    
    // Verification routes
    'POST /api/verify/start': 'Start a new verification session',
    'POST /api/verify/document': 'Upload identity document for verification',
    'POST /api/verify/back-of-id': 'Upload back-of-ID for enhanced verification',
    'POST /api/verify/selfie': 'Upload selfie for face matching',
    'POST /api/verify/live-capture': 'Upload live capture for liveness detection',
    'GET /api/verify/results/:verification_id': 'Get complete verification results',
    'GET /api/verify/status/:user_id': 'Get verification status (deprecated)',
    'GET /api/verify/status-legacy/:user_id': 'Legacy verification status',
    'GET /api/verify/history/:user_id': 'Get verification history for user',
    'POST /api/verify/generate-live-token': 'Generate live capture token',
    
    // Developer routes
    'POST /api/developer/register': 'Register as a developer',
    'POST /api/developer/api-key': 'Create new API key',
    'GET /api/developer/api-keys': 'List API keys',
    'DELETE /api/developer/api-key/:id': 'Delete API key',
    'GET /api/developer/stats': 'Get usage statistics',
    'GET /api/developer/activity': 'Get API activity logs',
    
    // Admin routes
    'GET /api/admin/verifications': 'List all verifications',
    'GET /api/admin/verification/:id': 'Get verification details',
    'PUT /api/admin/verification/:id/review': 'Update verification review',
    'GET /api/admin/stats': 'Get admin statistics',
    'GET /api/admin/developers': 'List all developers',
    
    // Webhook routes
    'POST /api/webhooks/register': 'Register webhook URL',
    'GET /api/webhooks': 'List registered webhooks',
    'DELETE /api/webhooks/:id': 'Delete webhook',
    'POST /api/webhooks/test': 'Test webhook delivery',
    
    // Auth routes
    'POST /api/auth/login': 'Admin login',
    'POST /api/auth/logout': 'Admin logout',
    'GET /api/auth/me': 'Get current user info'
  };

  return descriptions[`${method} ${path}`] || `${method} ${path}`;
}

/**
 * Group routes by category for better organization
 */
export function groupRoutes(routes: RouteInfo[]): GroupedRoutes {
  const grouped: GroupedRoutes = {
    health: {},
    verification: {},
    developer: {},
    admin: {},
    webhooks: {},
    auth: {},
    other: {}
  };

  routes.forEach((route) => {
    const endpoint = `${route.method} ${route.path}`;
    const description = route.description || endpoint;

    if (route.path.startsWith('/api/health')) {
      grouped.health[endpoint] = description;
    } else if (route.path.startsWith('/api/verify')) {
      grouped.verification[endpoint] = description;
    } else if (route.path.startsWith('/api/developer')) {
      grouped.developer[endpoint] = description;
    } else if (route.path.startsWith('/api/admin')) {
      grouped.admin[endpoint] = description;
    } else if (route.path.startsWith('/api/webhooks')) {
      grouped.webhooks[endpoint] = description;
    } else if (route.path.startsWith('/api/auth')) {
      grouped.auth[endpoint] = description;
    } else {
      grouped.other[endpoint] = description;
    }
  });

  // Remove empty groups
  Object.keys(grouped).forEach(key => {
    if (Object.keys(grouped[key]).length === 0) {
      delete grouped[key];
    }
  });

  return grouped;
}

/**
 * Generate API documentation object
 */
export function generateApiDocs(app: Application) {
  const routes = extractRoutes(app);
  const groupedRoutes = groupRoutes(routes);

  return {
    title: 'Idswyft API Documentation',
    version: '1.0.0',
    generated: new Date().toISOString(),
    totalRoutes: routes.length,
    endpoints: groupedRoutes,
    authentication: {
      'API Key': 'Include X-API-Key header with your API key',
      'Admin': 'Include Authorization header with Bearer token'
    },
    notes: {
      'Rate Limiting': 'All endpoints are rate limited',
      'CORS': 'Cross-origin requests are supported',
      'Sandbox Mode': 'Use sandbox=true parameter for testing'
    }
  };
}