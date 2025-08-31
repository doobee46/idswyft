// VaaS Types - JavaScript Module with TypeScript Support
// Using JS to bypass TypeScript compilation issues

// Define and export all the types as empty objects for runtime
// TypeScript will use JSDoc types for type checking

/**
 * @typedef {Object} Admin
 * @property {string} id
 * @property {string} organization_id  
 * @property {string} email
 * @property {string} first_name
 * @property {string} last_name
 * @property {'owner'|'admin'|'operator'|'viewer'} role
 * @property {AdminPermissions} permissions
 * @property {'active'|'inactive'|'pending'} status
 * @property {boolean} email_verified
 * @property {string} [email_verified_at]
 * @property {string} [last_login_at]
 * @property {number} [login_count]
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} AdminPermissions
 * @property {boolean} manage_organization
 * @property {boolean} manage_admins
 * @property {boolean} manage_billing
 * @property {boolean} view_users
 * @property {boolean} manage_users
 * @property {boolean} export_users
 * @property {boolean} view_verifications
 * @property {boolean} review_verifications
 * @property {boolean} approve_verifications
 * @property {boolean} manage_settings
 * @property {boolean} manage_webhooks
 * @property {boolean} manage_integrations
 * @property {boolean} view_analytics
 * @property {boolean} export_analytics
 */

/**
 * @typedef {Object} Organization
 * @property {string} id
 * @property {string} name
 * @property {string} slug
 * @property {'starter'|'professional'|'enterprise'|'custom'} subscription_tier
 * @property {'active'|'past_due'|'cancelled'|'suspended'} billing_status
 * @property {string} contact_email
 * @property {OrganizationSettings} settings
 * @property {OrganizationBranding} branding
 * @property {string} [stripe_customer_id]
 * @property {string} created_at
 * @property {string} updated_at
 */

// Export empty objects that can be imported
export const Admin = {};
export const AdminPermissions = {};
export const Organization = {};
export const OrganizationSettings = {};
export const OrganizationBranding = {};
export const ApiResponse = {};
export const LoginRequest = {};
export const LoginResponse = {};
export const EndUser = {};
export const VerificationResults = {};
export const VerificationSession = {};
export const StartVerificationRequest = {};
export const StartVerificationResponse = {};
export const Webhook = {};
export const WebhookDelivery = {};
export const WebhookFormData = {};
export const UsageStats = {};
export const DashboardStats = {};
export const AuthState = {};
export const LoadingState = {};
export const PaginationParams = {};
export const TableColumn = {};
export const CreateOrganizationFormData = {};
export const Verification = {};
export const VerificationDocument = {};

// Default export
export default {
  Admin,
  AdminPermissions,
  Organization,
  OrganizationSettings,
  OrganizationBranding,
  ApiResponse,
  LoginRequest,
  LoginResponse,
  EndUser,
  VerificationResults,
  VerificationSession,
  StartVerificationRequest,
  StartVerificationResponse,
  Webhook,
  WebhookDelivery,
  WebhookFormData,
  UsageStats,
  DashboardStats,
  AuthState,
  LoadingState,
  PaginationParams,
  TableColumn,
  CreateOrganizationFormData,
  Verification,
  VerificationDocument
};