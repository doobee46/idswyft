import { describe, it, expect } from 'vitest';
import { validateSecrets } from '../../config/validateSecrets.js';

describe('validateSecrets', () => {
  it('throws if JWT_SECRET is default placeholder', () => {
    expect(() => validateSecrets({
      jwtSecret: 'your-super-secret-jwt-key',
      apiKeySecret: 'real-secret',
      encryptionKey: '12345678901234567890123456789012',
      serviceToken: 'real-token'
    })).toThrow('JWT_SECRET must be changed from the default value');
  });

  it('throws if API_KEY_SECRET is default placeholder', () => {
    expect(() => validateSecrets({
      jwtSecret: 'a-real-random-jwt-secret-here-padded!!',
      apiKeySecret: 'your-api-key-encryption-secret',
      encryptionKey: '12345678901234567890123456789012',
      serviceToken: 'real-token'
    })).toThrow('API_KEY_SECRET must be changed from the default value');
  });

  it('throws if ENCRYPTION_KEY is too short', () => {
    expect(() => validateSecrets({
      jwtSecret: 'a-real-random-jwt-secret-here-padded!!',
      apiKeySecret: 'a-real-api-key-secret',
      encryptionKey: 'too-short',
      serviceToken: 'real-token'
    })).toThrow('ENCRYPTION_KEY must be at least 32 characters');
  });

  it('passes with valid secrets', () => {
    expect(() => validateSecrets({
      jwtSecret: 'a-real-random-jwt-secret-here-padded!!',
      apiKeySecret: 'a-real-api-key-secret',
      encryptionKey: '12345678901234567890123456789012',
      serviceToken: 'a-real-service-token'
    })).not.toThrow();
  });
});
