import axios, { AxiosInstance, AxiosError } from 'axios';
import FormData from 'form-data';

export interface IdswyftConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  sandbox?: boolean;
}

export interface OCRData {
  name?: string;
  date_of_birth?: string;
  document_number?: string;
  expiration_date?: string;
  issuing_authority?: string;
  nationality?: string;
  address?: string;
  raw_text?: string;
  confidence_scores?: Record<string, number>;
}

export interface QualityAnalysis {
  isBlurry: boolean;
  blurScore: number;
  brightness: number;
  contrast: number;
  resolution: {
    width: number;
    height: number;
    isHighRes: boolean;
  };
  fileSize: {
    bytes: number;
    isReasonableSize: boolean;
  };
  overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
  issues: string[];
  recommendations: string[];
}

export interface VerificationResult {
  id: string;
  verification_id?: string;
  status: 'pending' | 'verified' | 'failed' | 'manual_review';
  type: 'document' | 'selfie' | 'combined' | 'live_capture';
  confidence_score?: number;
  created_at: string;
  updated_at: string;
  developer_id: string;
  user_id?: string;
  metadata?: Record<string, any>;
  webhook_url?: string;
  // AI Analysis Results
  ocr_data?: OCRData;
  quality_analysis?: QualityAnalysis;
  face_match_score?: number;
  liveness_score?: number;
  manual_review_reason?: string;
  // Enhanced Verification Features
  document_uploaded?: boolean;
  document_type?: string;
  back_of_id_uploaded?: boolean;
  live_capture_completed?: boolean;
  barcode_data?: BarcodeData;
  cross_validation_results?: CrossValidationResults;
  cross_validation_score?: number;
  enhanced_verification_completed?: boolean;
  liveness_details?: LivenessDetails;
  next_steps?: string[];
}

export interface BarcodeData {
  qr_code?: string;
  parsed_data?: Record<string, any>;
  verification_codes?: string[];
  security_features?: string[];
}

export interface CrossValidationResults {
  match_score: number;
  validation_results: Record<string, boolean>;
  discrepancies: string[];
}

export interface LivenessDetails {
  blink_detection?: number;
  head_movement?: number;
  texture_analysis?: number;
  challenge_passed?: boolean;
}

export interface StartVerificationRequest {
  user_id: string;
  sandbox?: boolean;
}

export interface StartVerificationResponse {
  verification_id: string;
  status: string;
  user_id: string;
  next_steps: string[];
  created_at: string;
}

export interface BackOfIdRequest {
  verification_id: string;
  document_type: 'passport' | 'drivers_license' | 'national_id' | 'other';
  back_of_id_file: File | Buffer;
  metadata?: Record<string, any>;
}

export interface LiveCaptureRequest {
  verification_id: string;
  live_image_data: string; // base64 encoded
  challenge_response?: string;
  metadata?: Record<string, any>;
}

export interface LiveTokenRequest {
  verification_id: string;
  challenge_type?: 'blink' | 'smile' | 'turn_head' | 'random';
}

export interface LiveTokenResponse {
  token: string;
  challenge: string;
  expires_at: string;
  instructions: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  environment: 'sandbox' | 'production';
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
  monthly_requests?: number;
}

export interface CreateApiKeyRequest {
  name: string;
  environment: 'sandbox' | 'production';
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  last_delivery_at?: string;
  secret?: string;
}

export interface CreateWebhookRequest {
  url: string;
  events?: string[];
  secret?: string;
}

export interface DocumentVerificationRequest {
  verification_id?: string; // For existing verification session
  document_type: 'passport' | 'drivers_license' | 'national_id' | 'other';
  document_file: File | Buffer;
  user_id?: string;
  webhook_url?: string;
  metadata?: Record<string, any>;
}

export interface SelfieVerificationRequest {
  verification_id?: string; // For existing verification session
  selfie_file: File | Buffer;
  reference_document_id?: string;
  user_id?: string;
  webhook_url?: string;
  metadata?: Record<string, any>;
}

export interface ApiError {
  error: string;
  message: string;
  details?: any;
  code?: string;
}

export class IdswyftError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly details?: any;

  constructor(message: string, statusCode: number, code?: string, details?: any) {
    super(message);
    this.name = 'IdswyftError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class IdswyftSDK {
  private client: AxiosInstance;
  private config: Required<IdswyftConfig>;

  constructor(config: IdswyftConfig) {
    this.config = {
      apiKey: config.apiKey,
      baseURL: config.baseURL || 'https://api.idswyft.com',
      timeout: config.timeout || 30000,
      sandbox: config.sandbox || false
    };

    if (!this.config.apiKey) {
      throw new Error('API key is required');
    }

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'X-API-Key': this.config.apiKey,
        'User-Agent': '@idswyft/sdk/2.0.0',
        'X-SDK-Version': '2.0.0',
        'X-SDK-Language': 'javascript'
      }
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const apiError = error.response.data as ApiError;
          throw new IdswyftError(
            apiError.message || 'API request failed',
            error.response.status,
            apiError.code,
            apiError.details
          );
        } else if (error.request) {
          throw new IdswyftError('Network error - no response received', 0);
        } else {
          throw new IdswyftError(`Request setup error: ${error.message}`, 0);
        }
      }
    );
  }

  /**
   * Start a new verification session
   */
  async startVerification(request: StartVerificationRequest): Promise<StartVerificationResponse> {
    const response = await this.client.post('/api/verify/start', request);
    return response.data;
  }

  /**
   * Verify a document (passport, driver's license, etc.)
   */
  async verifyDocument(request: DocumentVerificationRequest): Promise<VerificationResult> {
    const formData = new FormData();
    formData.append('document_type', request.document_type);
    formData.append('document', request.document_file);
    
    if (request.verification_id) {
      formData.append('verification_id', request.verification_id);
    }
    
    if (request.user_id) {
      formData.append('user_id', request.user_id);
    }
    
    if (request.webhook_url) {
      formData.append('webhook_url', request.webhook_url);
    }
    
    if (request.metadata) {
      formData.append('metadata', JSON.stringify(request.metadata));
    }

    const response = await this.client.post('/api/verify/document', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    return response.data.verification || response.data;
  }

  /**
   * Upload back-of-ID for enhanced verification with barcode scanning
   */
  async verifyBackOfId(request: BackOfIdRequest): Promise<VerificationResult> {
    const formData = new FormData();
    formData.append('verification_id', request.verification_id);
    formData.append('document_type', request.document_type);
    formData.append('back_of_id', request.back_of_id_file);
    
    if (request.metadata) {
      formData.append('metadata', JSON.stringify(request.metadata));
    }

    const response = await this.client.post('/api/verify/back-of-id', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    return response.data;
  }

  /**
   * Verify a selfie, optionally against a reference document
   */
  async verifySelfie(request: SelfieVerificationRequest): Promise<VerificationResult> {
    const formData = new FormData();
    formData.append('selfie', request.selfie_file);
    
    if (request.verification_id) {
      formData.append('verification_id', request.verification_id);
    }
    
    if (request.reference_document_id) {
      formData.append('reference_document_id', request.reference_document_id);
    }
    
    if (request.user_id) {
      formData.append('user_id', request.user_id);
    }
    
    if (request.webhook_url) {
      formData.append('webhook_url', request.webhook_url);
    }
    
    if (request.metadata) {
      formData.append('metadata', JSON.stringify(request.metadata));
    }

    const response = await this.client.post('/api/verify/selfie', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    return response.data.verification || response.data;
  }

  /**
   * Live capture with AI liveness detection
   */
  async liveCapture(request: LiveCaptureRequest): Promise<VerificationResult> {
    const response = await this.client.post('/api/verify/live-capture', request);
    return response.data;
  }

  /**
   * Generate a secure token for live capture sessions
   */
  async generateLiveToken(request: LiveTokenRequest): Promise<LiveTokenResponse> {
    const response = await this.client.post('/api/verify/generate-live-token', request);
    return response.data;
  }

  /**
   * Get complete verification results including all enhancements
   */
  async getVerificationResults(verificationId: string): Promise<VerificationResult> {
    const response = await this.client.get(`/api/verify/results/${verificationId}`);
    return response.data;
  }

  /**
   * Get verification history for a user
   */
  async getVerificationHistory(userId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    verifications: VerificationResult[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const response = await this.client.get(`/api/verify/history/${userId}?${params.toString()}`);
    return response.data;
  }

  /**
   * Check the status of a verification request
   */
  async getVerificationStatus(verificationId: string): Promise<VerificationResult> {
    const response = await this.client.get(`/api/verify/status/${verificationId}`);
    return response.data.verification;
  }

  /**
   * List all verification requests for the developer
   */
  async listVerifications(options?: {
    status?: string;
    limit?: number;
    offset?: number;
    user_id?: string;
  }): Promise<{
    verifications: VerificationResult[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const params = new URLSearchParams();
    
    if (options?.status) params.append('status', options.status);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.user_id) params.append('user_id', options.user_id);

    const response = await this.client.get(`/api/verify/list?${params.toString()}`);
    return response.data;
  }


  /**
   * Verify webhook signature (for webhook endpoint security)
   */
  static verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    const providedSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
  }

  /**
   * Register as a new developer
   */
  async registerDeveloper(email: string, name: string): Promise<{ developer_id: string; message: string }> {
    const response = await this.client.post('/api/developer/register', { email, name });
    return response.data;
  }

  /**
   * Create a new API key
   */
  async createApiKey(request: CreateApiKeyRequest): Promise<{ api_key: string; key_id: string }> {
    const response = await this.client.post('/api/developer/api-key', request);
    return response.data;
  }

  /**
   * List all API keys
   */
  async listApiKeys(): Promise<{ api_keys: ApiKey[] }> {
    const response = await this.client.get('/api/developer/api-keys');
    return response.data;
  }

  /**
   * Revoke/delete an API key
   */
  async revokeApiKey(keyId: string): Promise<{ success: boolean; message: string }> {
    const response = await this.client.delete(`/api/developer/api-key/${keyId}`);
    return response.data;
  }

  /**
   * Get API activity logs
   */
  async getApiActivity(options?: {
    limit?: number;
    offset?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<{
    activities: any[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.start_date) params.append('start_date', options.start_date);
    if (options?.end_date) params.append('end_date', options.end_date);

    const response = await this.client.get(`/api/developer/activity?${params.toString()}`);
    return response.data;
  }

  /**
   * Register a webhook URL
   */
  async registerWebhook(request: CreateWebhookRequest): Promise<{ webhook: Webhook }> {
    const response = await this.client.post('/api/webhooks/register', request);
    return response.data;
  }

  /**
   * List all webhooks
   */
  async listWebhooks(): Promise<{ webhooks: Webhook[] }> {
    const response = await this.client.get('/api/webhooks');
    return response.data;
  }

  /**
   * Update a webhook
   */
  async updateWebhook(webhookId: string, request: Partial<CreateWebhookRequest>): Promise<{ webhook: Webhook }> {
    const response = await this.client.put(`/api/webhooks/${webhookId}`, request);
    return response.data;
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<{ success: boolean; message: string }> {
    const response = await this.client.delete(`/api/webhooks/${webhookId}`);
    return response.data;
  }

  /**
   * Test webhook delivery
   */
  async testWebhook(webhookId: string): Promise<{ success: boolean; delivery_id: string }> {
    const response = await this.client.post(`/api/webhooks/${webhookId}/test`);
    return response.data;
  }

  /**
   * Get webhook delivery history
   */
  async getWebhookDeliveries(webhookId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    deliveries: any[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const response = await this.client.get(`/api/webhooks/${webhookId}/deliveries?${params.toString()}`);
    return response.data;
  }

  /**
   * Get developer usage statistics
   */
  async getUsageStats(): Promise<{
    period: string;
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    pending_requests: number;
    manual_review_requests: number;
    success_rate: string;
    monthly_limit: number;
    monthly_usage: number;
    remaining_quota: number;
    quota_reset_date: string;
  }> {
    const response = await this.client.get('/api/developer/stats');
    return response.data;
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await this.client.get('/api/health');
      return response.data;
    } catch (error) {
      if (error instanceof IdswyftError && error.statusCode === 404) {
        // Fallback for basic connectivity test
        return { status: 'ok', timestamp: new Date().toISOString() };
      }
      throw error;
    }
  }
}

// Export default instance creator
export default function createIdswyftSDK(config: IdswyftConfig): IdswyftSDK {
  return new IdswyftSDK(config);
}

// Export alias for the main SDK class
export { IdswyftSDK as Idswyft };