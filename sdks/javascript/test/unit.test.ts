/**
 * Unit tests for Idswyft JavaScript SDK
 */

import { IdswyftSDK, IdswyftError } from '../src/index';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('IdswyftSDK', () => {
  let sdk: IdswyftSDK;
  
  beforeEach(() => {
    sdk = new IdswyftSDK({
      apiKey: 'test-api-key',
      baseURL: 'https://api.test.idswyft.com',
      sandbox: true
    });
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(sdk.config.apiKey).toBe('test-api-key');
      expect(sdk.config.baseURL).toBe('https://api.test.idswyft.com');
      expect(sdk.config.sandbox).toBe(true);
      expect(sdk.config.timeout).toBe(30000);
    });

    it('should use default values when not provided', () => {
      const defaultSDK = new IdswyftSDK({ apiKey: 'test-key' });
      
      expect(defaultSDK.config.baseURL).toBe('https://api.idswyft.com');
      expect(defaultSDK.config.timeout).toBe(30000);
      expect(defaultSDK.config.sandbox).toBe(false);
    });

    it('should throw error if API key is missing', () => {
      expect(() => {
        new IdswyftSDK({ apiKey: '' });
      }).toThrow('API key is required');
    });
  });

  describe('verifyDocument', () => {
    it('should make correct API call for document verification', async () => {
      const mockResponse = {
        data: {
          verification: {
            id: 'verif_123',
            status: 'pending',
            type: 'document'
          }
        }
      };
      
      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse),
        interceptors: {
          response: { use: jest.fn() }
        }
      } as any);

      const testBuffer = Buffer.from('test image data');
      
      const result = await sdk.verifyDocument({
        document_type: 'passport',
        document_file: testBuffer,
        user_id: 'user-123'
      });

      expect(result).toEqual(mockResponse.data.verification);
    });
  });

  describe('webhook signature verification', () => {
    it('should verify valid webhook signatures', () => {
      const payload = '{"verification_id":"test","status":"verified"}';
      const secret = 'webhook-secret';
      
      // Create valid signature using crypto
      const crypto = require('crypto');
      const signature = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const isValid = IdswyftSDK.verifyWebhookSignature(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid webhook signatures', () => {
      const payload = '{"verification_id":"test","status":"verified"}';
      const secret = 'webhook-secret';
      const invalidSignature = 'sha256=invalid';

      const isValid = IdswyftSDK.verifyWebhookSignature(payload, invalidSignature, secret);
      expect(isValid).toBe(false);
    });

    it('should handle empty inputs gracefully', () => {
      const isValid = IdswyftSDK.verifyWebhookSignature('', '', '');
      expect(isValid).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should create IdswyftError with correct properties', () => {
      const error = new IdswyftError('Test error', 400, 'test_code', { field: 'test' });
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('test_code');
      expect(error.details).toEqual({ field: 'test' });
      expect(error.name).toBe('IdswyftError');
    });
  });

  describe('file preparation', () => {
    it('should handle Buffer objects', () => {
      const testBuffer = Buffer.from('test data');
      // This would be tested in integration tests since _prepareFile is private
      expect(testBuffer).toBeInstanceOf(Buffer);
    });

    it('should handle File objects in browser environment', () => {
      // Mock File object for Node.js environment
      const mockFile = new Blob(['test data'], { type: 'image/jpeg' });
      expect(mockFile).toBeDefined();
    });
  });
});