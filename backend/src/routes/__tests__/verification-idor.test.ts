import { describe, it, expect } from 'vitest';
import { AuthorizationError } from '../../middleware/errorHandler.js';

describe('AuthorizationError', () => {
  it('is exported and is a class', () => {
    expect(typeof AuthorizationError).toBe('function');
  });

  it('produces a 403 status code', () => {
    const err = new AuthorizationError();
    expect((err as any).statusCode).toBe(403);
  });

  it('has default message', () => {
    const err = new AuthorizationError();
    expect(err.message).toBe('Not authorized to access this resource');
  });

  it('accepts a custom message', () => {
    const err = new AuthorizationError('custom message');
    expect(err.message).toBe('custom message');
  });
});
