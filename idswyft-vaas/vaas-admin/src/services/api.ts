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
  PaginationParams
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