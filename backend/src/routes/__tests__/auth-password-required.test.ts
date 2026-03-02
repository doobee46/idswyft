/**
 * Test: POST /api/auth/developer/login — password always required
 *
 * Imports developerLoginValidation directly from auth.ts and runs the real
 * express-validator middleware chain against mock request objects.
 * No HTTP server or database connection is needed.
 *
 * Because the worktree's backend/node_modules is sparse (packages live in
 * the main repo's backend/node_modules), we satisfy the 'express-validator'
 * import that auth.ts performs by registering a vi.mock factory that loads
 * the real package via createRequire from its absolute location.
 * All other auth.ts dependencies are mocked with minimal stubs.
 */
import { describe, it, expect, vi } from 'vitest';

// ── Module stubs ─────────────────────────────────────────────────────────────
// These must appear before any imports from auth.ts.
// vi.mock calls are hoisted by vitest's transformer to the top of the file.

// Load the real express-validator from the main repo's node_modules and expose
// it under the 'express-validator' module ID so auth.ts can import it normally.
vi.mock('express-validator', async () => {
  const { createRequire } = await import('module');
  const req = createRequire('D:/code_repo/Idswyft/backend/package.json');
  return req('express-validator');
});

// Minimal stubs for every other auth.ts dependency
vi.mock('express', () => {
  const mockRouter = { post: vi.fn(), get: vi.fn() };
  return { default: { Router: () => mockRouter }, Router: () => mockRouter };
});

vi.mock('bcryptjs', () => ({
  default: { compare: vi.fn(), hash: vi.fn(), genSalt: vi.fn() },
}));

vi.mock('validator', () => ({ default: {} }));

vi.mock('@/config/database.js', () => ({
  supabase: { from: vi.fn() },
  connectDB: vi.fn(),
}));

vi.mock('@/middleware/auth.js', () => ({
  generateAdminToken: vi.fn(),
  generateDeveloperToken: vi.fn(),
  authenticateJWT: vi.fn((_req: any, _res: any, next: any) => next()),
}));

vi.mock('@/middleware/errorHandler.js', () => ({
  catchAsync: vi.fn((fn: any) => fn),
  ValidationError: class ValidationError extends Error {
    constructor(msg: string) { super(msg); }
  },
  AuthenticationError: class AuthenticationError extends Error {
    constructor(msg: string) { super(msg); }
  },
}));

vi.mock('@/services/totpService.js', () => ({
  TotpService: class TotpService {
    generateSecret() { return 'secret'; }
    generateQrCode() { return Promise.resolve('qr'); }
    verifyToken() { return false; }
  },
}));

vi.mock('@/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logVerificationEvent: vi.fn(),
}));

vi.mock('@/middleware/csrf.js', () => ({
  generateToken: vi.fn(() => 'csrf-token'),
}));

// ── Import the real production validator array ────────────────────────────────

import { developerLoginValidation } from '../auth.js';

// Import validationResult by absolute path (avoids the module-not-found issue
// when importing by package name from within the sparse worktree node_modules).
import { validationResult } from 'D:/code_repo/Idswyft/backend/node_modules/express-validator/lib/index.js';

// ── Helper ───────────────────────────────────────────────────────────────────

async function validate(body: Record<string, unknown>) {
  const req = { body } as any;
  const res = {} as any;
  for (const middleware of developerLoginValidation) {
    await new Promise<void>((resolve) => middleware(req, res, resolve));
  }
  return validationResult(req);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('developerLoginValidation', () => {
  it('rejects missing password', async () => {
    const result = await validate({ email: 'test@example.com' });
    expect(result.isEmpty()).toBe(false);
    expect(result.array().some((e: any) => e.path === 'password')).toBe(true);
  });

  it('rejects empty password', async () => {
    const result = await validate({ email: 'test@example.com', password: '' });
    expect(result.isEmpty()).toBe(false);
    expect(result.array().some((e: any) => e.path === 'password')).toBe(true);
  });

  it('rejects password shorter than 8 characters', async () => {
    const result = await validate({ email: 'test@example.com', password: 'short' });
    expect(result.isEmpty()).toBe(false);
    expect(result.array().some((e: any) => e.path === 'password')).toBe(true);
  });

  it('passes with valid email and password >= 8 characters', async () => {
    const result = await validate({ email: 'test@example.com', password: 'longpassword' });
    expect(result.isEmpty()).toBe(true);
  });
});
