// TypeScript declarations for customer portal

export interface OrganizationBranding {
  company_name: string;
  logo_url?: string;
  primary_color?: string;
  welcome_message: string;
  success_message: string;
  custom_css?: string;
}

export interface VerificationSettings {
  require_liveness: boolean;
  require_back_of_id: boolean;
}

export interface VerificationSession {
  id: string;
  status: 'pending' | 'document_uploaded' | 'processing' | 'completed' | 'failed' | 'expired';
  organization_name: string;
  organization_branding?: OrganizationBranding;
  settings: VerificationSettings;
  expires_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
    has_more?: boolean;
  };
}

export interface DocumentUploadResponse {
  success: boolean;
  document_id: string;
  processing_status: 'uploaded' | 'processing' | 'completed' | 'failed';
}

export interface VerificationStatusResponse {
  status: 'pending' | 'document_uploaded' | 'processing' | 'completed' | 'verified' | 'failed' | 'expired';
  confidence_score?: number;
  results?: {
    face_match_score?: number;
    liveness_score?: number;
    document_validity?: boolean;
    failure_reasons?: string[];
  };
}