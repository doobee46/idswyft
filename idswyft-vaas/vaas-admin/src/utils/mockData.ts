import { Admin, Organization, LoginResponse } from '../types.js';

// Mock data for development and testing
export const mockAdmin: Admin = {
  id: '1',
  organization_id: '1',
  email: 'admin@test.com',
  first_name: 'Test',
  last_name: 'Admin',
  role: 'owner',
  permissions: {
    manage_organization: true,
    manage_admins: true,
    manage_billing: true,
    view_users: true,
    manage_users: true,
    export_users: true,
    view_verifications: true,
    review_verifications: true,
    approve_verifications: true,
    manage_settings: true,
    manage_webhooks: true,
    manage_integrations: true,
    view_analytics: true,
    export_analytics: true,
  },
  status: 'active',
  email_verified: true,
  email_verified_at: '2024-01-01T00:00:00Z',
  last_login_at: '2024-01-15T10:30:00Z',
  login_count: 25,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:30:00Z',
};

export const mockOrganization: Organization = {
  id: '1',
  name: 'Test Organization',
  slug: 'test-org',
  subscription_tier: 'professional',
  billing_status: 'active',
  contact_email: 'contact@test.com',
  settings: {
    require_liveness: true,
    require_back_of_id: true,
    auto_approve_threshold: 85,
    manual_review_threshold: 70,
    theme: 'light',
    language: 'en',
    email_notifications: true,
    webhook_notifications: true,
    session_timeout: 30,
    max_verification_attempts: 3,
  },
  branding: {
    company_name: 'Test Company',
    logo_url: 'https://via.placeholder.com/200x60',
    primary_color: '#3B82F6',
    welcome_message: 'Welcome! Please verify your identity to continue.',
    success_message: 'Thank you! Your identity has been successfully verified.',
    custom_css: '',
  },
  stripe_customer_id: 'cus_test123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:30:00Z',
};

export const mockLoginResponse: LoginResponse = {
  token: 'mock_jwt_token_for_development',
  admin: mockAdmin,
  organization: mockOrganization,
  expires_at: '2024-12-31T23:59:59Z',
};

// Development mode authentication bypass
export const enableMockAuth = () => {
  localStorage.setItem('vaas_admin_token', mockLoginResponse.token);
  localStorage.setItem('vaas_mock_auth', 'true');
};

export const isMockAuthEnabled = () => {
  return localStorage.getItem('vaas_mock_auth') === 'true';
};