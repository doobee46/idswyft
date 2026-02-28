import { describe, it, expect } from 'vitest';
import { isCorsAllowed } from '../../middleware/cors.js';

const config = {
  nodeEnv: 'production',
  corsOrigins: ['https://idswyft.app', 'https://admin.idswyft.app'],
  railwayAllowedOrigins: ['https://customer-abc123.up.railway.app'],
};

describe('isCorsAllowed', () => {
  it('allows explicitly configured origins', () => {
    expect(isCorsAllowed('https://idswyft.app', config)).toBe(true);
    expect(isCorsAllowed('https://admin.idswyft.app', config)).toBe(true);
  });

  it('allows explicit railway origins in the allowlist', () => {
    expect(isCorsAllowed('https://customer-abc123.up.railway.app', config)).toBe(true);
  });

  it('blocks unknown railway origins even if they contain portal/customer/vaas in name', () => {
    expect(isCorsAllowed('https://attacker-portal.up.railway.app', config)).toBe(false);
    expect(isCorsAllowed('https://evil-customer.up.railway.app', config)).toBe(false);
    expect(isCorsAllowed('https://fake-vaas.up.railway.app', config)).toBe(false);
  });

  it('blocks completely unknown origins', () => {
    expect(isCorsAllowed('https://evil.com', config)).toBe(false);
    expect(isCorsAllowed('https://idswyft.app.evil.com', config)).toBe(false);
  });

  it('allows localhost in development mode', () => {
    const devConfig = { ...config, nodeEnv: 'development' };
    expect(isCorsAllowed('http://localhost:5173', devConfig)).toBe(true);
    expect(isCorsAllowed('http://127.0.0.1:3000', devConfig)).toBe(true);
  });

  it('blocks localhost in production mode', () => {
    expect(isCorsAllowed('http://localhost:5173', config)).toBe(false);
  });
});
