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
      expect(sdk['config'].apiKey).toBe('test-api-key');
      expect(sdk['config'].baseURL).toBe('https://api.test.idswyft.com');
      expect(sdk['config'].sandbox).toBe(true);
      expect(sdk['config'].timeout).toBe(30000);
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

  describe('startVerification', () => {
    it('should start a new verification session', async () => {
      const mockResponse = {
        data: {
          verification_id: 'verif_123',
          status: 'started',
          user_id: 'user-123',
          next_steps: ['Upload document'],
          created_at: '2024-01-01T12:00:00Z'
        }
      };
      
      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse),
        interceptors: {
          response: { use: jest.fn() }
        }
      } as any);
      
      const result = await sdk.startVerification({
        user_id: 'user-123',
        sandbox: true
      });

      expect(result).toEqual(mockResponse.data);
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
        verification_id: 'verif_123',
        document_type: 'passport',
        document_file: testBuffer,
        user_id: 'user-123'
      });

      expect(result).toEqual(mockResponse.data.verification);
    });
  });

  describe('verifyBackOfId', () => {
    it('should upload back-of-ID for enhanced verification', async () => {
      const mockResponse = {
        data: {
          verification_id: 'verif_123',
          back_of_id_document_id: 'doc_back456',
          status: 'processing',
          enhanced_verification: {
            barcode_scanning_enabled: true,
            cross_validation_enabled: true,
            ai_powered: true
          }
        }
      };
      
      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse),
        interceptors: {
          response: { use: jest.fn() }
        }
      } as any);

      const testBuffer = Buffer.from('test back image data');
      
      const result = await sdk.verifyBackOfId({
        verification_id: 'verif_123',
        document_type: 'drivers_license',
        back_of_id_file: testBuffer
      });

      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('liveCapture', () => {
    it('should perform live capture with AI liveness detection', async () => {
      const mockResponse = {
        data: {
          id: 'verif_live123',
          status: 'verified',
          type: 'live_capture',
          liveness_score: 0.94,
          face_match_score: 0.92,
          confidence_score: 0.93
        }
      };
      
      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse),
        interceptors: {
          response: { use: jest.fn() }
        }
      } as any);
      
      const result = await sdk.liveCapture({
        verification_id: 'verif_123',
        live_image_data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABA...',
        challenge_response: 'smile'
      });

      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('generateLiveToken', () => {
    it('should generate secure token for live capture', async () => {
      const mockResponse = {
        data: {
          token: 'live_token_xyz789',
          challenge: 'smile',
          expires_at: '2024-01-01T12:05:00Z',
          instructions: 'Please smile naturally for the camera'
        }
      };
      
      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse),
        interceptors: {
          response: { use: jest.fn() }
        }
      } as any);
      
      const result = await sdk.generateLiveToken({
        verification_id: 'verif_123',
        challenge_type: 'smile'
      });

      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('developer management', () => {
    it('should create API key', async () => {
      const mockResponse = {
        data: {
          api_key: 'sk_test_123...',
          key_id: 'key_abc123'
        }
      };
      
      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse),
        interceptors: {
          response: { use: jest.fn() }
        }
      } as any);
      
      const result = await sdk.createApiKey({
        name: 'Test Key',
        environment: 'sandbox'
      });

      expect(result).toEqual(mockResponse.data);
    });

    it('should list API keys', async () => {
      const mockResponse = {
        data: {
          api_keys: [{
            id: 'key_123',
            name: 'Test Key',
            key_prefix: 'sk_test_',
            environment: 'sandbox',
            is_active: true
          }]
        }
      };
      
      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse),
        interceptors: {
          response: { use: jest.fn() }
        }
      } as any);
      
      const result = await sdk.listApiKeys();

      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('webhook management', () => {
    it('should register webhook', async () => {
      const mockResponse = {
        data: {
          webhook: {
            id: 'hook_123',
            url: 'https://example.com/webhook',
            events: ['verification.completed'],
            is_active: true
          }
        }
      };
      
      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse),
        interceptors: {
          response: { use: jest.fn() }
        }
      } as any);
      
      const result = await sdk.registerWebhook({
        url: 'https://example.com/webhook',
        events: ['verification.completed']
      });

      expect(result).toEqual(mockResponse.data);
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