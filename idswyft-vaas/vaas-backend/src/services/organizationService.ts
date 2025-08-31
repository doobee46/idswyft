import { vaasSupabase } from '../config/database.js';
import { VaasOrganization, VaasCreateOrganizationRequest } from '../types/index.js';
import bcrypt from 'bcrypt';
import { generateSlug } from '../utils/slug.js';

export class OrganizationService {
  
  async createOrganization(data: VaasCreateOrganizationRequest): Promise<VaasOrganization> {
    const slug = data.slug || generateSlug(data.name);
    
    // Check if slug already exists
    const { data: existingOrg } = await vaasSupabase
      .from('vaas_organizations')
      .select('id')
      .eq('slug', slug)
      .single();
      
    if (existingOrg) {
      throw new Error(`Organization slug '${slug}' already exists`);
    }
    
    // Check if admin email already exists
    const { data: existingAdmin } = await vaasSupabase
      .from('vaas_admins')
      .select('id')
      .eq('email', data.admin_email)
      .single();
      
    if (existingAdmin) {
      throw new Error(`Admin email '${data.admin_email}' already exists`);
    }
    
    // Hash admin password
    const passwordHash = await bcrypt.hash(data.admin_password, 12);
    
    // Start transaction by creating organization first
    const { data: organization, error: orgError } = await vaasSupabase
      .from('vaas_organizations')
      .insert({
        name: data.name,
        slug: slug,
        subscription_tier: data.subscription_tier || 'starter',
        billing_status: 'active',
        contact_email: data.contact_email,
        settings: {
          require_liveness: true,
          require_back_of_id: true,
          auto_approve_threshold: 0.9,
          manual_review_threshold: 0.7,
          theme: 'light',
          language: 'en',
          email_notifications: true,
          webhook_notifications: true,
          session_timeout: 3600,
          max_verification_attempts: 3
        },
        branding: {
          company_name: data.name,
          welcome_message: `Welcome to ${data.name} verification portal`,
          success_message: 'Your identity has been successfully verified!'
        }
      })
      .select()
      .single();
      
    if (orgError) {
      throw new Error(`Failed to create organization: ${orgError.message}`);
    }
    
    // Create owner admin user
    const { error: adminError } = await vaasSupabase
      .from('vaas_admins')
      .insert({
        organization_id: organization.id,
        email: data.admin_email,
        password_hash: passwordHash,
        first_name: data.admin_first_name,
        last_name: data.admin_last_name,
        role: 'owner',
        status: 'active',
        email_verified: true,
        email_verified_at: new Date().toISOString(),
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
          export_analytics: true
        }
      });
      
    if (adminError) {
      // Rollback organization creation
      await vaasSupabase
        .from('vaas_organizations')
        .delete()
        .eq('id', organization.id);
        
      throw new Error(`Failed to create admin user: ${adminError.message}`);
    }
    
    return organization;
  }
  
  async getOrganizationById(id: string): Promise<VaasOrganization | null> {
    const { data, error } = await vaasSupabase
      .from('vaas_organizations')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch organization: ${error.message}`);
    }
    
    return data;
  }
  
  async getOrganizationBySlug(slug: string): Promise<VaasOrganization | null> {
    const { data, error } = await vaasSupabase
      .from('vaas_organizations')
      .select('*')
      .eq('slug', slug)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch organization: ${error.message}`);
    }
    
    return data;
  }
  
  async updateOrganization(id: string, updates: Partial<VaasOrganization>): Promise<VaasOrganization> {
    // Remove fields that shouldn't be updated directly
    const { id: _, created_at, updated_at, ...allowedUpdates } = updates;
    
    const { data, error } = await vaasSupabase
      .from('vaas_organizations')
      .update(allowedUpdates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      throw new Error(`Failed to update organization: ${error.message}`);
    }
    
    return data;
  }
  
  async deleteOrganization(id: string): Promise<void> {
    // This will cascade delete all related records (admins, users, sessions, etc.)
    const { error } = await vaasSupabase
      .from('vaas_organizations')
      .delete()
      .eq('id', id);
      
    if (error) {
      throw new Error(`Failed to delete organization: ${error.message}`);
    }
  }
  
  async listOrganizations(page = 1, perPage = 20): Promise<{ organizations: VaasOrganization[], total: number }> {
    const offset = (page - 1) * perPage;
    
    // Get total count
    const { count, error: countError } = await vaasSupabase
      .from('vaas_organizations')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      throw new Error(`Failed to count organizations: ${countError.message}`);
    }
    
    // Get organizations
    const { data, error } = await vaasSupabase
      .from('vaas_organizations')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);
      
    if (error) {
      throw new Error(`Failed to list organizations: ${error.message}`);
    }
    
    return {
      organizations: data || [],
      total: count || 0
    };
  }
  
  async getOrganizationUsage(organizationId: string): Promise<{
    current_period: {
      verification_count: number;
      api_calls: number;
      storage_used_mb: number;
    };
    monthly_limit: number;
    overage_cost_per_verification: number;
  }> {
    // Get current month's usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    const { data: usage, error } = await vaasSupabase
      .from('vaas_usage_records')
      .select('verification_count, api_calls, storage_used_mb')
      .eq('organization_id', organizationId)
      .gte('period_start', startOfMonth.toISOString().split('T')[0])
      .lte('period_end', endOfMonth.toISOString().split('T')[0])
      .single();
      
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get organization usage: ${error.message}`);
    }
    
    // Get organization tier for limits
    const org = await this.getOrganizationById(organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }
    
    // Define limits and costs based on subscription tier
    const tierLimits = {
      starter: { limit: 500, overage: 200 }, // $2.00
      professional: { limit: 2000, overage: 150 }, // $1.50
      enterprise: { limit: -1, overage: 100 }, // $1.00, unlimited
      custom: { limit: -1, overage: 100 }
    };
    
    const tier = tierLimits[org.subscription_tier] || tierLimits.starter;
    
    return {
      current_period: {
        verification_count: usage?.verification_count || 0,
        api_calls: usage?.api_calls || 0,
        storage_used_mb: usage?.storage_used_mb || 0
      },
      monthly_limit: tier.limit,
      overage_cost_per_verification: tier.overage
    };
  }
}

export const organizationService = new OrganizationService();