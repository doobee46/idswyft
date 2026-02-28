import { doubleCsrf } from 'csrf-csrf';
import config from '@/config/index.js';

export const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => config.jwtSecret, // reuse JWT secret as CSRF secret
  cookieName: '__Host-psifi.x-csrf-token',
  cookieOptions: {
    sameSite: 'strict',
    secure: config.nodeEnv === 'production',
    httpOnly: true,
    path: '/'
  },
  size: 64,
  getTokenFromRequest: (req) => req.headers['x-csrf-token'] as string,
});

export { doubleCsrfProtection as csrfProtection };
