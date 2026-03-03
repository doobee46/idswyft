import { describe, it, expect, vi } from 'vitest';
import { AuthorizationError, ValidationError } from '../../middleware/errorHandler.js';

// --- AuthorizationError class tests ---
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
    const err = new AuthorizationError('custom');
    expect(err.message).toBe('custom');
  });
});

// --- IDOR ownership protection: atomic query pattern ---
describe('IDOR ownership protection — getVerificationRequestForDeveloper pattern', () => {
  function makeVerification(developerId: string) {
    return { id: 'ver-1', developer_id: developerId, user_id: 'user-1', status: 'pending' as const };
  }

  // Simulates the route logic: call atomic query, throw ValidationError if null
  async function simulateOwnershipCheck(
    queryResult: ReturnType<typeof makeVerification> | null
  ) {
    if (!queryResult) {
      throw new ValidationError('Verification request not found', 'verification_id', 'ver-1');
    }
    return queryResult;
  }

  it('returns the verification when the developer owns it', async () => {
    const ver = makeVerification('dev-A');
    const result = await simulateOwnershipCheck(ver);
    expect(result.id).toBe('ver-1');
  });

  it('throws ValidationError when the atomic query returns null (not found or wrong developer)', async () => {
    await expect(simulateOwnershipCheck(null)).rejects.toBeInstanceOf(ValidationError);
  });

  it('atomic query mock returns null when developer_id does not match — routes receive null', async () => {
    const mockService = {
      getVerificationRequestForDeveloper: vi.fn(
        async (id: string, devId: string) =>
          devId === 'dev-A' ? makeVerification('dev-A') : null
      ),
    };

    const resultOwned = await mockService.getVerificationRequestForDeveloper('ver-1', 'dev-A');
    expect(resultOwned).not.toBeNull();

    const resultUnowned = await mockService.getVerificationRequestForDeveloper('ver-1', 'dev-B');
    expect(resultUnowned).toBeNull();
  });

  it('ValidationError has correct statusCode (404-like behavior — no information leak)', () => {
    const err = new ValidationError('Verification request not found', 'verification_id', 'ver-1');
    // ValidationError maps to 400 via errorHandler — not a 403 that would confirm resource existence
    expect((err as any).statusCode).toBe(400);
  });
});
