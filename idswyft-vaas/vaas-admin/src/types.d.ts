// TypeScript declarations for types.js

export interface AdminPermissions {
  manage_organization: boolean;
  manage_admins: boolean;
  manage_billing: boolean;
  view_users: boolean;
  manage_users: boolean;
  export_users: boolean;
  view_verifications: boolean;
  review_verifications: boolean;
  approve_verifications: boolean;
  manage_settings: boolean;
  manage_webhooks: boolean;
  manage_integrations: boolean;
  view_analytics: boolean;
  export_analytics: boolean;
}

export interface Admin {
  id: string;
  organization_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'owner' | 'admin' | 'operator' | 'viewer';
  permissions: AdminPermissions;
  status: 'active' | 'inactive' | 'pending';
  email_verified: boolean;
  email_verified_at?: string;
  last_login_at?: string;
  login_count?: number;
  created_at: string;
  updated_at: string;
}

export interface OrganizationSettings {
  require_liveness: boolean;
  require_back_of_id: boolean;
  auto_approve_threshold: number;
  manual_review_threshold: number;
  theme: 'light' | 'dark';
  language: string;
  email_notifications: boolean;
  webhook_notifications: boolean;
  session_timeout: number;
  max_verification_attempts: number;
}

export interface OrganizationBranding {
  company_name: string;
  logo_url?: string;
  primary_color?: string;
  welcome_message: string;
  success_message: string;
  custom_css?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_tier: 'starter' | 'professional' | 'enterprise' | 'custom';
  billing_status: 'active' | 'past_due' | 'cancelled' | 'suspended';
  contact_email: string;
  settings: OrganizationSettings;
  branding: OrganizationBranding;
  stripe_customer_id?: string;
  created_at: string;
  updated_at: string;
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

export interface LoginRequest {
  email: string;
  password: string;
  organization_slug?: string;
}

export interface LoginResponse {
  token: string;
  admin: Admin;
  organization: Organization;
  expires_at: string;
}

export interface EndUser {
  id: string;
  organization_id: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  external_id?: string;
  verification_status: 'pending' | 'in_progress' | 'verified' | 'failed' | 'expired' | 'manual_review';
  verification_completed_at?: string;
  metadata: Record<string, any>;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface VerificationResults {
  verification_status?: string;
  confidence_score?: number;
  face_match_score?: number;
  liveness_score?: number;
  cross_validation_score?: number;
  documents?: any[];
  liveness_analysis?: any;
  face_analysis?: any;
  failure_reasons?: string[];
  manual_review_reason?: string;
  reviewer_id?: string;
  reviewed_at?: string;
  review_notes?: string;
}

export interface VerificationSession {
  id: string;
  organization_id: string;
  end_user_id: string;
  idswyft_verification_id: string;
  idswyft_user_id: string;
  status: 'pending' | 'document_uploaded' | 'processing' | 'completed' | 'failed' | 'expired';
  session_token?: string;
  expires_at?: string;
  results: VerificationResults;
  confidence_score?: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  vaas_end_users?: EndUser;
}

export interface StartVerificationRequest {
  end_user: {
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    external_id?: string;
    metadata?: Record<string, any>;
  };
  settings?: {
    require_liveness?: boolean;
    require_back_of_id?: boolean;
    callback_url?: string;
    success_redirect_url?: string;
    failure_redirect_url?: string;
  };
}

export interface StartVerificationResponse {
  session_id: string;
  verification_url: string;
  end_user: EndUser;
  expires_at: string;
}

export interface Webhook {
  id: string;
  organization_id: string;
  url: string;
  events: string[];
  secret_key: string;
  enabled: boolean;
  last_success_at?: string;
  last_failure_at?: string;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  organization_id: string;
  event_type: string;
  event_data: any;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  http_status_code?: number;
  response_body?: string;
  error_message?: string;
  attempts: number;
  max_retries: number;
  delivered_at?: string;
  next_retry_at?: string;
  created_at: string;
}

export interface WebhookFormData {
  url: string;
  events: string[];
  secret_key?: string;
}

export interface UsageStats {
  current_period: {
    verification_count: number;
    api_calls: number;
    storage_used_mb: number;
  };
  monthly_limit: number;
  overage_cost_per_verification: number;
}

export interface DashboardStats {
  period_days: number;
  verification_sessions: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    processing: number;
    success_rate: number;
  };
  end_users: {
    total: number;
    verified: number;
    failed: number;
    pending: number;
    in_progress: number;
    manual_review: number;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  admin: Admin | null;
  organization: Organization | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface PaginationParams {
  page: number;
  per_page: number;
}

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
}

export interface CreateOrganizationFormData {
  name: string;
  slug?: string;
  contact_email: string;
  admin_email: string;
  admin_password: string;
  admin_first_name: string;
  admin_last_name: string;
  subscription_tier: 'starter' | 'professional' | 'enterprise';
}

export type VerificationStatus = 'pending' | 'processing' | 'verified' | 'failed' | 'manual_review' | 'expired';

export interface Verification {
  id: string;
  organization_id: string;
  end_user_id: string;
  idswyft_verification_id: string;
  idswyft_user_id: string;
  status: VerificationStatus;
  verification_type?: string;
  customer_email?: string;
  results: VerificationResults;
  confidence_score?: number;
  completed_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface VerificationDocument {
  id: string;
  verification_id: string;
  type: 'document_front' | 'document_back' | 'selfie' | 'liveness';
  url: string;
  analysis?: string;
  metadata?: Record<string, any>;
  created_at: string;
}