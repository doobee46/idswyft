/**
 * Test: /api/files/* route authentication
 *
 * Verifies that authenticateAPIKey is exported from the auth middleware and
 * conforms to the standard Express middleware signature (arity 3).
 *
 * Because auth.ts has heavy runtime dependencies (jsonwebtoken, supabase,
 * config, logger, types) that are not available in the sparse worktree
 * node_modules, we mock every dependency before importing auth.ts so that
 * the module can be loaded in a pure unit-test context.
 *
 * The mocks are hoisted by vitest to the top of the file (before imports).
 */
import { describe, it, expect, vi } from 'vitest';

// ── Module stubs ──────────────────────────────────────────────────────────────
// All vi.mock calls are hoisted before any import so auth.ts loads cleanly.

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
    JsonWebTokenError: class JsonWebTokenError extends Error {},
    TokenExpiredError: class TokenExpiredError extends Error {},
  },
}));

vi.mock('@/config/database.js', () => ({
  supabase: { from: vi.fn() },
  connectDB: vi.fn(),
}));

vi.mock('@/config/index.js', () => ({
  default: {
    apiKeySecret: 'test-secret',
    jwtSecret: 'test-jwt-secret',
    serviceToken: 'test-service-token',
    nodeEnv: 'test',
  },
}));

vi.mock('./errorHandler.js', () => ({
  catchAsync: vi.fn((fn: any) => fn),
  AuthenticationError: class AuthenticationError extends Error {
    constructor(msg: string) { super(msg); }
  },
  AuthorizationError: class AuthorizationError extends Error {
    constructor(msg: string) { super(msg); }
  },
}));

vi.mock('@/middleware/errorHandler.js', () => ({
  catchAsync: (fn: any) => (req: any, res: any, next: any) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  },
  AuthenticationError: class AuthenticationError extends Error {
    constructor(msg: string) { super(msg); }
  },
  AuthorizationError: class AuthorizationError extends Error {
    constructor(msg: string) { super(msg); }
  },
}));

vi.mock('@/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logVerificationEvent: vi.fn(),
}));

vi.mock('@/types/index.js', () => ({}));

// ── Tests ─────────────────────────────────────────────────────────────────────

import { authenticateAPIKey } from '../../middleware/auth.js';

describe('file-serving route authentication', () => {
  it('authenticateAPIKey is exported and is a function', () => {
    expect(typeof authenticateAPIKey).toBe('function');
  });

  it('authenticateAPIKey has arity 3 — standard Express middleware signature', () => {
    // Express middleware must have (req, res, next) — arity 3
    expect(authenticateAPIKey.length).toBe(3);
  });

  it('rejects requests with no X-API-Key header — calls next with an error', async () => {
    const errors: any[] = [];
    const mockReq = { headers: {}, body: {} } as any;
    const mockRes = {} as any;
    const mockNext = (err?: any) => { if (err) errors.push(err); };

    // Call the middleware — it should call next(AuthenticationError)
    await authenticateAPIKey(mockReq, mockRes, mockNext);

    expect(errors.length).toBe(1);
    expect(errors[0]).toBeTruthy(); // An error was passed to next
  });
});
