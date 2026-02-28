export interface CorsConfig {
  nodeEnv: string;
  corsOrigins: string[];
  railwayAllowedOrigins?: string[];
}

/**
 * Determines whether an origin is allowed to make cross-origin requests.
 *
 * Uses an explicit allowlist only — NO pattern matching or wildcard subdomains.
 * The previous implementation used origin.match(/customer|portal|vaas/i) which
 * would pass for attacker-portal.up.railway.app. This function fixes that.
 */
export function isCorsAllowed(origin: string, config: CorsConfig): boolean {
  // 1. Check the configured origin allowlist (exact match)
  if (config.corsOrigins.includes(origin)) return true;

  // 2. Check the explicit Railway deployment allowlist (exact match, no wildcards)
  if (config.railwayAllowedOrigins?.includes(origin)) return true;

  // 3. In development only, allow localhost and loopback addresses
  if (config.nodeEnv === 'development') {
    if (origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')) {
      return true;
    }
  }

  return false;
}

export function buildCorsOptions(config: CorsConfig) {
  return {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      // Allow server-to-server requests (no Origin header)
      if (!origin) return callback(null, true);
      if (isCorsAllowed(origin, config)) return callback(null, true);
      return callback(new Error(`CORS: origin not allowed`), false);
    },
    credentials: true,
    optionsSuccessStatus: 200,
  };
}
