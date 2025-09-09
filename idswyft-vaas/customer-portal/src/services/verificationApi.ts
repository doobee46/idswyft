// Real verification API integration (same as demo page)
import { VerificationSession } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

interface StartVerificationResponse {
  verification_id: string;
}

interface VerificationResults {
  verification_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'manual_review';
  confidence_score?: number;
  ocr_data?: {
    full_name?: string;
    document_number?: string;
    date_of_birth?: string;
    expiration_date?: string;
    document_type?: string;
    country?: string;
    state?: string;
  };
  face_match?: {
    similarity_score?: number;
    confidence?: number;
  };
  liveness_check?: {
    is_live?: boolean;
    confidence?: number;
  };
  document_analysis?: {
    is_authentic?: boolean;
    quality_score?: number;
    tampering_detected?: boolean;
  };
}

class VerificationAPI {
  private getApiKey(session: VerificationSession): string {
    // Get API key from organization settings
    // Priority: sandbox key for testing, then production key, then fallback to env
    const isTestMode = import.meta.env.VITE_SANDBOX_MODE === 'true';
    
    const sandboxKey = session.organization?.settings?.default_sandbox_main_api_key;
    const productionKey = session.organization?.settings?.default_main_api_key;
    
    const apiKey = (isTestMode && sandboxKey) ? sandboxKey : 
                   productionKey || 
                   sandboxKey || // fallback to sandbox if production not available
                   session.organization?.settings?.idswyft_api_key || 
                   session.organization?.settings?.api_key ||
                   import.meta.env.VITE_IDSWYFT_API_KEY ||
                   '';
    
    if (!apiKey) {
      console.warn('No Idswyft API key found in organization settings or environment');
      console.log('Organization settings:', session.organization?.settings);
    } else {
      console.log('Using API key:', apiKey.substring(0, 8) + '...');
    }
    
    return apiKey;
  }

  private getUserId(session: VerificationSession): string {
    // Use session ID as user_id since the main API requires a valid UUID
    return session.id;
  }

  private shouldUseSandbox(): boolean {
    return import.meta.env.VITE_SANDBOX_MODE === 'true' || 
           window.location.hostname === 'localhost' ||
           window.location.hostname.includes('preview');
  }

  async startVerification(session: VerificationSession): Promise<string> {
    const apiKey = this.getApiKey(session);
    const userId = this.getUserId(session);
    
    if (!apiKey) {
      throw new Error(
        'No API key configured. Please contact your organization administrator to set up main API keys in the VaaS admin panel.'
      );
    }

    const useSandbox = this.shouldUseSandbox();
    const requestBody = {
      user_id: userId,
      ...(useSandbox && { sandbox: true })
    };

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
        
        if (response.status === 401) {
          throw new Error('Invalid API key. Please contact your organization administrator to check the main API key configuration.');
        } else if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        } else if (response.status >= 500) {
          throw new Error('Verification service is temporarily unavailable. Please try again later.');
        }
        
        throw new Error(`Failed to start verification: ${errorMessage}`);
      }

      const data: StartVerificationResponse = await response.json();
      
      if (!data.verification_id) {
        throw new Error('Invalid response from verification service. Please try again.');
      }
      
      return data.verification_id;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred while starting verification. Please check your connection and try again.');
    }
  }

  async uploadDocument(
    session: VerificationSession, 
    verificationId: string, 
    file: File, 
    documentType: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const apiKey = this.getApiKey(session);
    
    if (!apiKey) {
      throw new Error('Organization API key not configured');
    }

    const formData = new FormData();
    formData.append('verification_id', verificationId);
    formData.append('document', file);
    formData.append('document_type', documentType);
    formData.append('user_id', this.getUserId(session));

    const useSandbox = this.shouldUseSandbox();
    const url = new URL(`${API_BASE_URL}/api/verify/document`);
    if (useSandbox) {
      url.searchParams.append('sandbox', 'true');
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || errorData.message || 'Failed to upload document');
    }

    // Simulate progress for now
    onProgress?.(100);
  }

  async uploadBackOfId(
    session: VerificationSession,
    verificationId: string, 
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const apiKey = this.getApiKey(session);
    
    if (!apiKey) {
      throw new Error('Organization API key not configured');
    }

    const formData = new FormData();
    formData.append('verification_id', verificationId);
    formData.append('back_of_id', file);
    formData.append('user_id', this.getUserId(session));

    const useSandbox = this.shouldUseSandbox();
    const url = new URL(`${API_BASE_URL}/api/verify/back-of-id`);
    if (useSandbox) {
      url.searchParams.append('sandbox', 'true');
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || errorData.message || 'Failed to upload back of ID');
    }

    onProgress?.(100);
  }

  async captureSelfie(
    session: VerificationSession,
    verificationId: string, 
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const apiKey = this.getApiKey(session);
    
    if (!apiKey) {
      throw new Error('Organization API key not configured');
    }

    // Convert file to base64 for live capture API
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:image/jpeg;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const useSandbox = this.shouldUseSandbox();
    const url = new URL(`${API_BASE_URL}/api/verify/live-capture`);
    if (useSandbox) {
      url.searchParams.append('sandbox', 'true');
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        verification_id: verificationId,
        image_data: base64,
        user_id: this.getUserId(session)
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || errorData.message || 'Failed to capture selfie');
    }

    onProgress?.(100);
  }

  async getResults(session: VerificationSession, verificationId: string): Promise<VerificationResults> {
    const apiKey = this.getApiKey(session);
    
    if (!apiKey) {
      throw new Error('Organization API key not configured');
    }

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
      const errorData = await response.json();
      throw new Error(errorData.error || errorData.message || 'Failed to get verification results');
    }

    return await response.json();
  }
}

export default new VerificationAPI();