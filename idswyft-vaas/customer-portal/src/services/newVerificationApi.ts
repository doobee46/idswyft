// Clean verification API service connecting to backend endpoints
import { VerificationSession } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface StartVerificationResponse {
  verification_id: string;
  status: string;
  user_id: string;
  next_steps: string[];
  created_at: string;
}

interface VerificationResults {
  verification_id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'verified' | 'failed' | 'manual_review';
  document_uploaded: boolean;
  document_type?: string;
  ocr_data?: any;
  back_of_id_uploaded: boolean;
  barcode_data?: any;
  cross_validation_results?: any;
  cross_validation_score?: number;
  enhanced_verification_completed: boolean;
  live_capture_completed: boolean;
  face_match_score?: number;
  liveness_score?: number;
  confidence_score?: number;
  failure_reason?: string;
  manual_review_reason?: string;
  next_steps: string[];
}

class NewVerificationAPI {
  private getApiKey(session: VerificationSession): string {
    // Get API key from organization settings
    const isTestMode = import.meta.env.VITE_SANDBOX_MODE === 'true';

    const sandboxKey = session.organization?.settings?.default_sandbox_main_api_key;
    const productionKey = session.organization?.settings?.default_main_api_key;

    const apiKey = (isTestMode && sandboxKey) ? sandboxKey :
                   productionKey ||
                   sandboxKey ||
                   session.organization?.settings?.idswyft_api_key ||
                   session.organization?.settings?.api_key ||
                   import.meta.env.VITE_IDSWYFT_API_KEY ||
                   '';

    if (!apiKey) {
      console.warn('❌ No API key found for verification');
      throw new Error('No API key configured. Please contact your organization administrator.');
    }

    console.log('✅ Using API key:', apiKey.substring(0, 8) + '...');
    return apiKey;
  }

  private shouldUseSandbox(): boolean {
    return import.meta.env.VITE_SANDBOX_MODE === 'true' ||
           window.location.hostname === 'localhost' ||
           window.location.hostname.includes('preview');
  }

  async startVerification(session: VerificationSession): Promise<string> {
    console.log('🚀 Starting verification session...');

    const apiKey = this.getApiKey(session);
    const useSandbox = this.shouldUseSandbox();

    const requestBody = {
      user_id: session.id,
      ...(useSandbox && { sandbox: true })
    };

    console.log('📡 Request:', { url: `${API_BASE_URL}/api/verify/start`, body: requestBody, sandbox: useSandbox });

    try {
      const response = await fetch(`${API_BASE_URL}/api/verify/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error?.message || errorData?.error || errorData?.message || response.statusText;
        console.error('❌ Start verification failed:', errorMessage);
        throw new Error(`Failed to start verification: ${errorMessage}`);
      }

      const data: StartVerificationResponse = await response.json();
      console.log('✅ Verification started:', data);

      return data.verification_id;
    } catch (error) {
      console.error('❌ Start verification error:', error);
      throw error;
    }
  }

  async uploadFrontDocument(session: VerificationSession, verificationId: string, file: File, documentType: string): Promise<void> {
    console.log('📄 Uploading front document...', { verificationId, documentType, fileSize: file.size });

    const apiKey = this.getApiKey(session);
    const useSandbox = this.shouldUseSandbox();

    const formData = new FormData();
    formData.append('verification_id', verificationId);
    formData.append('document', file);
    formData.append('document_type', documentType);
    formData.append('user_id', session.id);
    if (useSandbox) {
      formData.append('sandbox', 'true');
    }

    const response = await fetch(`${API_BASE_URL}/api/verify/document`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('❌ Front document upload failed:', errorData);
      throw new Error(errorData?.error || errorData?.message || 'Failed to upload front document');
    }

    const result = await response.json();
    console.log('✅ Front document uploaded:', result);
  }

  async uploadBackDocument(session: VerificationSession, verificationId: string, file: File, documentType: string): Promise<void> {
    console.log('📄 Uploading back document...', { verificationId, documentType, fileSize: file.size });

    const apiKey = this.getApiKey(session);
    const useSandbox = this.shouldUseSandbox();

    const formData = new FormData();
    formData.append('verification_id', verificationId);
    formData.append('back_of_id', file);
    formData.append('document_type', documentType);
    formData.append('user_id', session.id);
    if (useSandbox) {
      formData.append('sandbox', 'true');
    }

    const response = await fetch(`${API_BASE_URL}/api/verify/back-of-id`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('❌ Back document upload failed:', errorData);
      throw new Error(errorData?.error || errorData?.message || 'Failed to upload back document');
    }

    const result = await response.json();
    console.log('✅ Back document uploaded:', result);
  }

  async captureLiveSelfie(session: VerificationSession, verificationId: string, imageData: string): Promise<void> {
    console.log('📸 Capturing live selfie...', { verificationId, dataSize: imageData.length });

    const apiKey = this.getApiKey(session);
    const useSandbox = this.shouldUseSandbox();

    const requestBody = {
      verification_id: verificationId,
      live_image_data: imageData,
      challenge_response: 'blink',
      user_id: session.id,
      ...(useSandbox && { sandbox: true })
    };

    const response = await fetch(`${API_BASE_URL}/api/verify/live-capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('❌ Live capture failed:', errorData);
      throw new Error(errorData?.error || errorData?.message || 'Live capture failed');
    }

    const result = await response.json();
    console.log('✅ Live capture completed:', result);
  }

  async getVerificationResults(session: VerificationSession, verificationId: string): Promise<VerificationResults> {
    console.log('🔍 Getting verification results...', { verificationId });

    const apiKey = this.getApiKey(session);
    const useSandbox = this.shouldUseSandbox();

    const url = new URL(`${API_BASE_URL}/api/verify/results/${verificationId}`);
    if (useSandbox) {
      url.searchParams.append('sandbox', 'true');
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('❌ Get results failed:', errorData);
      throw new Error(errorData?.error || errorData?.message || 'Failed to get verification results');
    }

    const results: VerificationResults = await response.json();
    console.log('📊 Verification results:', results);

    return results;
  }
}

export default new NewVerificationAPI();