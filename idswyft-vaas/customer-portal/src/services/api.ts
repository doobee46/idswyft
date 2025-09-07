import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  VerificationSession, 
  ApiResponse, 
  DocumentUploadResponse, 
  VerificationStatusResponse 
} from '../types';

class CustomerPortalAPI {
  private client: AxiosInstance;

  constructor() {
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3002';
    
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('[API] Response error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Get verification session with organization branding
  async getVerificationSession(sessionToken: string): Promise<VerificationSession> {
    const response: AxiosResponse<ApiResponse<VerificationSession>> = await this.client.get(
      `/api/verifications/session/${sessionToken}`
    );
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to load verification session');
    }
    
    return response.data.data!;
  }

  // Upload document for verification
  async uploadDocument(
    sessionToken: string, 
    file: File, 
    type: 'front' | 'back' | 'selfie',
    onUploadProgress?: (progress: number) => void
  ): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('type', type);

    const response: AxiosResponse<DocumentUploadResponse> = await this.client.post(
      `/api/public/sessions/${sessionToken}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onUploadProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onUploadProgress(progress);
          }
        },
      }
    );

    return response.data;
  }

  // Submit verification for processing
  async submitVerification(sessionToken: string): Promise<void> {
    await this.client.post(`/api/public/sessions/${sessionToken}/submit`);
  }

  // Get verification status
  async getVerificationStatus(sessionToken: string): Promise<VerificationStatusResponse> {
    const response: AxiosResponse<VerificationStatusResponse> = await this.client.get(
      `/api/public/sessions/${sessionToken}/status`
    );
    
    return response.data;
  }

  // Perform liveness check
  async performLivenessCheck(sessionToken: string, livenessData: any): Promise<void> {
    await this.client.post(`/api/public/sessions/${sessionToken}/liveness`, livenessData);
  }
}

// Create and export a singleton instance
export const customerPortalAPI = new CustomerPortalAPI();
export default customerPortalAPI;