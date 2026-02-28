import { describe, it, expect, vi } from 'vitest';

// Mock heavy dependencies so only the pure crypto helpers are exercised
vi.mock('@/config/database.js', () => ({
  supabase: { from: vi.fn() },
  connectDB: vi.fn(),
}));
vi.mock('@/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logWebhookDelivery: vi.fn(),
}));
vi.mock('@/config/index.js', () => ({
  default: { webhooks: { retryAttempts: 3, timeoutMs: 5000 } },
}));
vi.mock('axios', () => ({ default: { post: vi.fn() } }));

import { createWebhookSignature, verifyWebhookSignature } from '../../services/webhook.js';

const secret = 'test-secret-key-12345';
const payload = JSON.stringify({ event: 'verification.completed', data: {} });

describe('Webhook HMAC signing', () => {
  it('creates an HMAC-SHA256 signature in sha256=<hex> format', () => {
    const sig = createWebhookSignature(payload, secret);
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it('produces the same signature for the same input', () => {
    const sig1 = createWebhookSignature(payload, secret);
    const sig2 = createWebhookSignature(payload, secret);
    expect(sig1).toBe(sig2);
  });

  it('produces different signatures for different secrets', () => {
    const sig1 = createWebhookSignature(payload, 'secret-one');
    const sig2 = createWebhookSignature(payload, 'secret-two');
    expect(sig1).not.toBe(sig2);
  });

  it('verifies a valid signature', () => {
    const sig = createWebhookSignature(payload, secret);
    expect(verifyWebhookSignature(payload, sig, secret)).toBe(true);
  });

  it('rejects a tampered payload', () => {
    const sig = createWebhookSignature(payload, secret);
    const tampered = JSON.stringify({ event: 'verification.completed', data: { injected: true } });
    expect(verifyWebhookSignature(tampered, sig, secret)).toBe(false);
  });

  it('rejects a forged signature', () => {
    const forgery = 'sha256=' + 'a'.repeat(64);
    expect(verifyWebhookSignature(payload, forgery, secret)).toBe(false);
  });

  it('rejects signatures with mismatched length', () => {
    expect(verifyWebhookSignature(payload, 'sha256=tooshort', secret)).toBe(false);
  });
});
