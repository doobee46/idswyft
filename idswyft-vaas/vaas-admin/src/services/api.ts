import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  Admin,
  Organization,
  EndUser,
  VerificationSession,
  StartVerificationRequest,
  StartVerificationResponse,
  Webhook,
  WebhookDelivery,
  WebhookFormData,
  UsageStats,
  DashboardStats,
  PaginationParams,
  ApiKey,
  ApiKeyFormData,
  ApiKeyCreateResponse,
  ApiKeyUsage,
  BillingPlan,
  BillingSubscription,
  BillingInvoice,
  BillingOverview,
  BillingUsageItem,
  AuditLogEntry,
  AuditLogFilters,
  AuditLogResponse,
  AuditLogStats,
  AdminRole,
  AdminPermission,
  AdminUser,
  AdminUserFormData,
  AdminUserUpdateData,
  AdminUserInvite,
  AdminUserStats,
  AdminUserFilters,
  AdminUserResponse,
  RolePermissionUpdate,
  AdminUserPasswordReset
} from '../types.js';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3002/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from localStorage
    this.token = localStorage.getItem('vaas_admin_token');
    if (this.token) {
      this.setAuthHeader(this.token);
    }

    // Request interceptor
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

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[API] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error(`[API] ${error.response?.status || 'NETWORK'} ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
        
        // Handle authentication errors
        if (error.response?.status === 401) {
          this.clearToken();
          window.location.href = '/login';
        }
        
        return Promise.reject(error);
      }
    );
  }

  private setAuthHeader(token: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  private clearToken() {
    this.token = null;
    localStorage.removeItem('vaas_admin_token');
    delete this.client.defaults.headers.common['Authorization'];
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response: AxiosResponse<ApiResponse<LoginResponse>> = await this.client.post('/auth/login', credentials);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Login failed');
    }

    const loginData = response.data.data!;
    this.token = loginData.token;
    localStorage.setItem('vaas_admin_token', this.token);
    this.setAuthHeader(this.token);
    
    return loginData;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      this.clearToken();
    }
  }

  async getCurrentAdmin(): Promise<{ admin: Admin; organization: Organization }> {
    const response: AxiosResponse<ApiResponse> = await this.client.get('/auth/me');
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get admin info');
    }

    return response.data.data!;
  }

  // Organizations
  async getOrganization(id: string): Promise<Organization> {
    const response: AxiosResponse<ApiResponse<Organization>> = await this.client.get(`/organizations/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get organization');
    }

    return response.data.data!;
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    const response: AxiosResponse<ApiResponse<Organization>> = await this.client.put(`/organizations/${id}`, updates);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to update organization');
    }

    return response.data.data!;
  }

  async getOrganizationUsage(id: string): Promise<UsageStats> {
    const response: AxiosResponse<ApiResponse<UsageStats>> = await this.client.get(`/organizations/${id}/usage`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get usage stats');
    }

    return response.data.data!;
  }

  // Verifications
  async listVerifications(params?: {
    status?: string;
    user_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    per_page?: number;
  }): Promise<{ verifications: VerificationSession[]; meta: any }> {
    const response: AxiosResponse<ApiResponse<VerificationSession[]>> = await this.client.get('/verifications', { params });
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to list verifications');
    }

    return {
      verifications: response.data.data!,
      meta: response.data.meta || {}
    };
  }

  async getVerification(id: string): Promise<VerificationSession> {
    const response: AxiosResponse<ApiResponse<VerificationSession>> = await this.client.get(`/verifications/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get verification');
    }

    return response.data.data!;
  }

  async startVerification(request: StartVerificationRequest): Promise<StartVerificationResponse> {
    const response: AxiosResponse<ApiResponse<StartVerificationResponse>> = await this.client.post('/verifications/start', request);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to start verification');
    }

    return response.data.data!;
  }

  async approveVerification(id: string, notes?: string): Promise<VerificationSession> {
    const response: AxiosResponse<ApiResponse<VerificationSession>> = await this.client.post(`/verifications/${id}/approve`, { notes });
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to approve verification');
    }

    return response.data.data!;
  }

  async rejectVerification(id: string, reason: string, notes?: string): Promise<VerificationSession> {
    const response: AxiosResponse<ApiResponse<VerificationSession>> = await this.client.post(`/verifications/${id}/reject`, { reason, notes });
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to reject verification');
    }

    return response.data.data!;
  }

  async syncVerification(id: string): Promise<VerificationSession> {
    const response: AxiosResponse<ApiResponse<VerificationSession>> = await this.client.post(`/verifications/${id}/sync`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to sync verification');
    }

    return response.data.data!;
  }

  async getVerificationStats(days: number = 30): Promise<DashboardStats> {
    const response: AxiosResponse<ApiResponse<DashboardStats>> = await this.client.get('/verifications/stats/overview', {
      params: { days }
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get verification stats');
    }

    return response.data.data!;
  }

  // Webhooks
  async listWebhooks(): Promise<Webhook[]> {
    const response: AxiosResponse<ApiResponse<Webhook[]>> = await this.client.get('/webhooks');
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to list webhooks');
    }

    return response.data.data!;
  }

  async getWebhook(id: string): Promise<Webhook> {
    const response: AxiosResponse<ApiResponse<Webhook>> = await this.client.get(`/webhooks/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get webhook');
    }

    return response.data.data!;
  }

  async createWebhook(data: WebhookFormData): Promise<Webhook> {
    const response: AxiosResponse<ApiResponse<Webhook>> = await this.client.post('/webhooks', data);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to create webhook');
    }

    return response.data.data!;
  }

  async updateWebhook(id: string, updates: Partial<Webhook>): Promise<Webhook> {
    const response: AxiosResponse<ApiResponse<Webhook>> = await this.client.put(`/webhooks/${id}`, updates);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to update webhook');
    }

    return response.data.data!;
  }

  async deleteWebhook(id: string): Promise<void> {
    const response: AxiosResponse<ApiResponse> = await this.client.delete(`/webhooks/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to delete webhook');
    }
  }

  async testWebhook(id: string): Promise<{ success: boolean; status_code?: number; error?: string }> {
    const response: AxiosResponse<ApiResponse> = await this.client.post(`/webhooks/${id}/test`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to test webhook');
    }

    return response.data.data!;
  }

  async getWebhookDeliveries(id: string, params?: PaginationParams): Promise<{ deliveries: WebhookDelivery[]; meta: any }> {
    const response: AxiosResponse<ApiResponse<WebhookDelivery[]>> = await this.client.get(`/webhooks/${id}/deliveries`, { params });
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get webhook deliveries');
    }

    return {
      deliveries: response.data.data!,
      meta: response.data.meta || {}
    };
  }

  // End Users
  async listEndUsers(params?: {
    status?: string;
    search?: string;
    tags?: string[];
    page?: number;
    per_page?: number;
  }): Promise<{ users: EndUser[]; meta: any }> {
    const response: AxiosResponse<ApiResponse<EndUser[]>> = await this.client.get('/users', { params });
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to list end users');
    }

    return {
      users: response.data.data!,
      meta: response.data.meta || {}
    };
  }

  async getEndUser(id: string): Promise<EndUser> {
    const response: AxiosResponse<ApiResponse<EndUser>> = await this.client.get(`/users/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get end user');
    }

    return response.data.data!;
  }

  async createEndUser(userData: Partial<EndUser>): Promise<EndUser> {
    const response: AxiosResponse<ApiResponse<EndUser>> = await this.client.post('/users', userData);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to create end user');
    }

    return response.data.data!;
  }

  async updateEndUser(id: string, updates: Partial<EndUser>): Promise<EndUser> {
    const response: AxiosResponse<ApiResponse<EndUser>> = await this.client.put(`/users/${id}`, updates);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to update end user');
    }

    return response.data.data!;
  }

  async deleteEndUser(id: string): Promise<void> {
    const response: AxiosResponse<ApiResponse> = await this.client.delete(`/users/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to delete end user');
    }
  }

  async getEndUserVerifications(id: string, params?: PaginationParams): Promise<{ verifications: VerificationSession[]; meta: any }> {
    const response: AxiosResponse<ApiResponse<VerificationSession[]>> = await this.client.get(`/users/${id}/verifications`, { params });
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get user verifications');
    }

    return {
      verifications: response.data.data!,
      meta: response.data.meta || {}
    };
  }

  async exportEndUsers(params?: {
    status?: string;
    search?: string;
    tags?: string[];
  }): Promise<Blob> {
    const response = await this.client.get('/users/export', {
      params,
      responseType: 'blob'
    });
    
    return response.data;
  }

  async sendVerificationInvitation(userId: string, options?: {
    custom_message?: string;
    expiration_days?: number;
  }): Promise<EndUser> {
    const response: AxiosResponse<ApiResponse<EndUser>> = await this.client.post(`/users/${userId}/send-verification-invitation`, options);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to send verification invitation');
    }

    return response.data.data!;
  }

  // API Keys
  async listApiKeys(): Promise<ApiKey[]> {
    const response: AxiosResponse<ApiResponse<ApiKey[]>> = await this.client.get('/api-keys');
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to list API keys');
    }

    return response.data.data!;
  }

  async getApiKey(id: string): Promise<ApiKey> {
    const response: AxiosResponse<ApiResponse<ApiKey>> = await this.client.get(`/api-keys/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get API key');
    }

    return response.data.data!;
  }

  async createApiKey(data: ApiKeyFormData): Promise<ApiKeyCreateResponse> {
    const response: AxiosResponse<ApiResponse<ApiKeyCreateResponse>> = await this.client.post('/api-keys', data);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to create API key');
    }

    return response.data.data!;
  }

  async updateApiKey(id: string, updates: Partial<ApiKey>): Promise<ApiKey> {
    const response: AxiosResponse<ApiResponse<ApiKey>> = await this.client.put(`/api-keys/${id}`, updates);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to update API key');
    }

    return response.data.data!;
  }

  async deleteApiKey(id: string): Promise<void> {
    const response: AxiosResponse<ApiResponse> = await this.client.delete(`/api-keys/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to delete API key');
    }
  }

  async rotateApiKey(id: string): Promise<{ secret_key: string }> {
    const response: AxiosResponse<ApiResponse<{ secret_key: string }>> = await this.client.post(`/api-keys/${id}/rotate`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to rotate API key');
    }

    return response.data.data!;
  }

  async getApiKeyUsage(id: string, params?: { 
    start_date?: string; 
    end_date?: string; 
    granularity?: 'hour' | 'day' | 'month' 
  }): Promise<ApiKeyUsage[]> {
    const response: AxiosResponse<ApiResponse<ApiKeyUsage[]>> = await this.client.get(`/api-keys/${id}/usage`, { params });
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get API key usage');
    }

    return response.data.data!;
  }

  // Billing
  async getBillingOverview(organizationId: string): Promise<BillingOverview> {
    const response: AxiosResponse<ApiResponse<BillingOverview>> = await this.client.get(`/organizations/${organizationId}/billing`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get billing overview');
    }

    return response.data.data!;
  }

  async listBillingPlans(): Promise<BillingPlan[]> {
    const response: AxiosResponse<ApiResponse<BillingPlan[]>> = await this.client.get('/billing/plans');
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to list billing plans');
    }

    return response.data.data!;
  }

  async changeBillingPlan(subscriptionId: string, planId: string, billingCycle: 'monthly' | 'yearly'): Promise<BillingSubscription> {
    const response: AxiosResponse<ApiResponse<BillingSubscription>> = await this.client.post(`/billing/subscriptions/${subscriptionId}/change-plan`, {
      plan_id: planId,
      billing_cycle: billingCycle
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to change billing plan');
    }

    return response.data.data!;
  }

  async getBillingInvoices(organizationId: string, params?: { limit?: number; status?: string }): Promise<BillingInvoice[]> {
    const response: AxiosResponse<ApiResponse<BillingInvoice[]>> = await this.client.get(`/organizations/${organizationId}/billing/invoices`, { params });
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get billing invoices');
    }

    return response.data.data!;
  }

  async getBillingUsageHistory(organizationId: string, params?: { 
    start_date?: string; 
    end_date?: string; 
    granularity?: 'day' | 'month' 
  }): Promise<BillingUsageItem[]> {
    const response: AxiosResponse<ApiResponse<BillingUsageItem[]>> = await this.client.get(`/organizations/${organizationId}/billing/usage-history`, { params });
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get usage history');
    }

    return response.data.data!;
  }

  async downloadInvoice(invoiceId: string): Promise<Blob> {
    const response = await this.client.get(`/billing/invoices/${invoiceId}/download`, {
      responseType: 'blob'
    });
    
    return response.data;
  }

  async updatePaymentMethod(organizationId: string, paymentMethodId: string): Promise<void> {
    const response: AxiosResponse<ApiResponse> = await this.client.post(`/organizations/${organizationId}/billing/payment-method`, {
      payment_method_id: paymentMethodId
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to update payment method');
    }
  }

  // Audit Logs API methods (Organization-scoped)
  async getAuditLogs(organizationId: string, params?: AuditLogFilters & PaginationParams): Promise<AuditLogResponse> {
    const response: AxiosResponse<ApiResponse<AuditLogResponse>> = await this.client.get(`/organizations/${organizationId}/audit-logs`, { params });
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get audit logs');
    }

    return response.data.data!;
  }

  async getAuditLogStats(organizationId: string): Promise<AuditLogStats> {
    const response: AxiosResponse<ApiResponse<AuditLogStats>> = await this.client.get(`/organizations/${organizationId}/audit-logs/stats`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get audit log statistics');
    }

    return response.data.data!;
  }

  async exportAuditLogs(organizationId: string, filters?: AuditLogFilters & { format?: 'csv' | 'json' }): Promise<Blob> {
    const response = await this.client.get(`/organizations/${organizationId}/audit-logs/export`, {
      params: filters,
      responseType: 'blob'
    });

    if (response.status !== 200) {
      throw new Error('Failed to export audit logs');
    }

    return response.data;
  }

  async createAuditLog(organizationId: string, entry: Omit<AuditLogEntry, 'id' | 'organization_id' | 'created_at' | 'timestamp'>): Promise<AuditLogEntry> {
    const response: AxiosResponse<ApiResponse<AuditLogEntry>> = await this.client.post(`/organizations/${organizationId}/audit-logs`, entry);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to create audit log entry');
    }

    return response.data.data!;
  }

  // Admin User Management API methods (Organization-scoped)
  
  // Roles and Permissions
  async getAdminRoles(organizationId: string): Promise<AdminRole[]> {
    const response: AxiosResponse<ApiResponse<AdminRole[]>> = await this.client.get(`/organizations/${organizationId}/admin-roles`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get admin roles');
    }

    return response.data.data!;
  }

  async getAdminPermissions(): Promise<AdminPermission[]> {
    const response: AxiosResponse<ApiResponse<AdminPermission[]>> = await this.client.get('/admin-permissions');
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get admin permissions');
    }

    return response.data.data!;
  }

  async updateRolePermissions(organizationId: string, data: RolePermissionUpdate): Promise<AdminRole> {
    const response: AxiosResponse<ApiResponse<AdminRole>> = await this.client.put(`/organizations/${organizationId}/admin-roles/${data.role_id}/permissions`, {
      permission_ids: data.permission_ids
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to update role permissions');
    }

    return response.data.data!;
  }

  // Admin Users CRUD
  async getAdminUsers(organizationId: string, params?: AdminUserFilters & PaginationParams): Promise<AdminUserResponse> {
    const response: AxiosResponse<ApiResponse<AdminUserResponse>> = await this.client.get(`/organizations/${organizationId}/admin-users`, { params });
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get admin users');
    }

    return response.data.data!;
  }

  async getAdminUser(organizationId: string, adminId: string): Promise<AdminUser> {
    const response: AxiosResponse<ApiResponse<AdminUser>> = await this.client.get(`/organizations/${organizationId}/admin-users/${adminId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get admin user');
    }

    return response.data.data!;
  }

  async createAdminUser(organizationId: string, data: AdminUserFormData): Promise<AdminUser> {
    const response: AxiosResponse<ApiResponse<AdminUser>> = await this.client.post(`/organizations/${organizationId}/admin-users`, data);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to create admin user');
    }

    return response.data.data!;
  }

  async updateAdminUser(organizationId: string, adminId: string, data: AdminUserUpdateData): Promise<AdminUser> {
    const response: AxiosResponse<ApiResponse<AdminUser>> = await this.client.put(`/organizations/${organizationId}/admin-users/${adminId}`, data);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to update admin user');
    }

    return response.data.data!;
  }

  async deleteAdminUser(organizationId: string, adminId: string): Promise<void> {
    const response: AxiosResponse<ApiResponse<void>> = await this.client.delete(`/organizations/${organizationId}/admin-users/${adminId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to delete admin user');
    }
  }

  // Admin User Status Management
  async suspendAdminUser(organizationId: string, adminId: string, reason?: string): Promise<AdminUser> {
    const response: AxiosResponse<ApiResponse<AdminUser>> = await this.client.post(`/organizations/${organizationId}/admin-users/${adminId}/suspend`, { reason });
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to suspend admin user');
    }

    return response.data.data!;
  }

  async activateAdminUser(organizationId: string, adminId: string): Promise<AdminUser> {
    const response: AxiosResponse<ApiResponse<AdminUser>> = await this.client.post(`/organizations/${organizationId}/admin-users/${adminId}/activate`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to activate admin user');
    }

    return response.data.data!;
  }

  async unlockAdminUser(organizationId: string, adminId: string): Promise<AdminUser> {
    const response: AxiosResponse<ApiResponse<AdminUser>> = await this.client.post(`/organizations/${organizationId}/admin-users/${adminId}/unlock`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to unlock admin user');
    }

    return response.data.data!;
  }

  // Admin User Invites
  async getAdminUserInvites(organizationId: string): Promise<AdminUserInvite[]> {
    const response: AxiosResponse<ApiResponse<AdminUserInvite[]>> = await this.client.get(`/organizations/${organizationId}/admin-invites`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get admin invites');
    }

    return response.data.data!;
  }

  async resendAdminInvite(organizationId: string, inviteId: string): Promise<AdminUserInvite> {
    const response: AxiosResponse<ApiResponse<AdminUserInvite>> = await this.client.post(`/organizations/${organizationId}/admin-invites/${inviteId}/resend`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to resend admin invite');
    }

    return response.data.data!;
  }

  async revokeAdminInvite(organizationId: string, inviteId: string): Promise<void> {
    const response: AxiosResponse<ApiResponse<void>> = await this.client.delete(`/organizations/${organizationId}/admin-invites/${inviteId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to revoke admin invite');
    }
  }

  // Password Management
  async resetAdminPassword(organizationId: string, adminId: string, data: AdminUserPasswordReset): Promise<{ temporary_password?: string }> {
    const response: AxiosResponse<ApiResponse<{ temporary_password?: string }>> = await this.client.post(`/organizations/${organizationId}/admin-users/${adminId}/reset-password`, data);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to reset admin password');
    }

    return response.data.data!;
  }

  // Statistics and Analytics
  async getAdminUserStats(organizationId: string): Promise<AdminUserStats> {
    const response: AxiosResponse<ApiResponse<AdminUserStats>> = await this.client.get(`/organizations/${organizationId}/admin-users/stats`);
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to get admin user statistics');
    }

    return response.data.data!;
  }

  // Bulk Operations
  async bulkUpdateAdminUsers(organizationId: string, updates: Array<{ admin_id: string; data: AdminUserUpdateData }>): Promise<AdminUser[]> {
    const response: AxiosResponse<ApiResponse<AdminUser[]>> = await this.client.post(`/organizations/${organizationId}/admin-users/bulk-update`, { updates });
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to bulk update admin users');
    }

    return response.data.data!;
  }

  // Generic HTTP methods
  async get(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.client.get(url, config);
  }

  async post(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.client.post(url, data, config);
  }

  async put(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.client.put(url, data, config);
  }

  async patch(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.client.patch(url, data, config);
  }

  async delete(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.client.delete(url, config);
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }
}

export const apiClient = new ApiClient();
export default apiClient;