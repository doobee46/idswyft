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
  status: 'pending' | 'verified' | 'failed' | 'manual_review';
  type: 'document' | 'selfie' | 'combined';
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
}

export interface DocumentVerificationRequest {
  document_type: 'passport' | 'drivers_license' | 'national_id' | 'other';
  document_file: File | Buffer;
  user_id?: string;
  webhook_url?: string;
  metadata?: Record<string, any>;
}

export interface SelfieVerificationRequest {
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
        'User-Agent': '@idswyft/sdk/1.0.0',
        'X-SDK-Version': '1.0.0',
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
   * Verify a document (passport, driver's license, etc.)
   */
  async verifyDocument(request: DocumentVerificationRequest): Promise<VerificationResult> {
    const formData = new FormData();
    formData.append('document_type', request.document_type);
    formData.append('document', request.document_file);
    
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

    return response.data.verification;
  }

  /**
   * Verify a selfie, optionally against a reference document
   */
  async verifySelfie(request: SelfieVerificationRequest): Promise<VerificationResult> {
    const formData = new FormData();
    formData.append('selfie', request.selfie_file);
    
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

    return response.data.verification;
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
   * Update webhook URL for a verification
   */
  async updateWebhook(verificationId: string, webhookUrl: string): Promise<{ success: boolean }> {
    const response = await this.client.patch(`/api/verify/${verificationId}/webhook`, {
      webhook_url: webhookUrl
    });
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