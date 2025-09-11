import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import { Organization as OrgType, OrganizationSettings, OrganizationBranding } from '../types.js';
import { Building2, Settings, CreditCard, Palette, Users, Save, AlertCircle, UserCog, Key, Database } from 'lucide-react';
import AdminManagement from '../components/organization/AdminManagement';
import UsageDashboard from '../components/organization/UsageDashboard';

export default function Organization() {
  const { organization, admin } = useAuth();
  const [orgData, setOrgData] = useState<OrgType | null>(organization);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'billing' | 'branding' | 'storage' | 'api-keys' | 'admins'>('general');

  useEffect(() => {
    if (organization) {
      setOrgData(organization);
    }
  }, [organization]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgData || !admin?.permissions.manage_organization) return;

    setIsLoading(true);
    setError(null);

    try {
      const updated = await apiClient.updateOrganization(orgData.id, {
        name: orgData.name,
        contact_email: orgData.contact_email
      });
      setOrgData(updated);
      setSuccess('Organization details updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update organization');
    } finally {
      setIsLoading(false);
    }
  };


  const handleSaveBranding = async (branding: OrganizationBranding) => {
    if (!orgData || !admin?.permissions.manage_organization) return;

    setIsLoading(true);
    setError(null);

    try {
      const updated = await apiClient.updateOrganization(orgData.id, { branding });
      setOrgData(updated);
      setSuccess('Branding updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update branding');
    } finally {
      setIsLoading(false);
    }
  };

  if (!orgData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
        <p className="text-gray-600">Manage your organization's business settings, branding, and data storage configuration</p>
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">
            Looking for verification thresholds and technical settings? Visit{' '}
            <a href="/settings" className="font-medium text-blue-600 hover:text-blue-500 underline">
              Verification Settings
            </a>{' '}
            for threshold management and system configuration.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <span className="text-green-700">{success}</span>
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'general'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Building2 className="h-4 w-4 inline mr-2" />
            General
          </button>
          
          <button
            onClick={() => setActiveTab('billing')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'billing'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CreditCard className="h-4 w-4 inline mr-2" />
            Billing
          </button>

          <button
            onClick={() => setActiveTab('branding')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'branding'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Palette className="h-4 w-4 inline mr-2" />
            Branding
          </button>


          <button
            onClick={() => setActiveTab('storage')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'storage'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Database className="h-4 w-4 inline mr-2" />
            Storage & Data
          </button>

          <button
            onClick={() => setActiveTab('api-keys')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'api-keys'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Key className="h-4 w-4 inline mr-2" />
            Main API Keys
          </button>

          <button
            onClick={() => setActiveTab('admins')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'admins'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UserCog className="h-4 w-4 inline mr-2" />
            Admin Users
          </button>
        </nav>
      </div>

      {activeTab === 'general' && (
        <GeneralSettings
          organization={orgData}
          onSave={handleSaveGeneral}
          isLoading={isLoading}
          canEdit={admin?.permissions.manage_organization || false}
          onChange={setOrgData}
        />
      )}

      {activeTab === 'billing' && (
        <div className="space-y-6">
          <UsageDashboard organizationId={orgData.id} />
          <BillingSettings
            organization={orgData}
            canManage={admin?.permissions.manage_billing || false}
          />
        </div>
      )}

      {activeTab === 'branding' && (
        <BrandingSettings
          branding={orgData.branding}
          onSave={handleSaveBranding}
          isLoading={isLoading}
          canEdit={admin?.permissions.manage_organization || false}
        />
      )}


      {activeTab === 'storage' && (
        <StorageSettings
          organizationId={orgData.id}
          canManageStorage={admin?.permissions.manage_organization || false}
        />
      )}

      {activeTab === 'api-keys' && (
        <MainAPIKeysManagement
          organizationId={orgData.id}
          canManageKeys={admin?.permissions.manage_organization || false}
        />
      )}

      {activeTab === 'admins' && (
        <AdminManagement
          organizationId={orgData.id}
          canManageAdmins={admin?.permissions.manage_admins || false}
        />
      )}
    </div>
  );
}

interface MainAPIKeysManagementProps {
  organizationId: string;
  canManageKeys: boolean;
}

function MainAPIKeysManagement({ organizationId, canManageKeys }: MainAPIKeysManagementProps) {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [isSandbox, setIsSandbox] = useState(true);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchAPIKeys();
  }, []);

  const fetchAPIKeys = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get('/organizations/main-api-keys');
      
      if (response.data.success) {
        setApiKeys(response.data.data.api_keys || []);
      } else {
        throw new Error(response.data.error?.message || 'Failed to fetch API keys');
      }
    } catch (err: any) {
      console.error('Failed to fetch API keys:', err);
      setError(err.message || 'Failed to fetch API keys');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageKeys || !newKeyName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await apiClient.post('/organizations/main-api-keys', {
        key_name: newKeyName.trim(),
        is_sandbox: isSandbox
      });

      if (response.data.success) {
        setCreatedKey(response.data.data.api_key);
        setNewKeyName('');
        setShowCreateForm(false);
        await fetchAPIKeys(); // Refresh the list
      } else {
        throw new Error(response.data.error?.message || 'Failed to create API key');
      }
    } catch (err: any) {
      console.error('Failed to create API key:', err);
      setError(err.message || 'Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string, keyName: string) => {
    if (!canManageKeys || !confirm(`Are you sure you want to revoke the API key "${keyName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setError(null);
      const response = await apiClient.delete(`/organizations/main-api-keys/${keyId}`);
      
      if (response.data.success) {
        await fetchAPIKeys(); // Refresh the list
      } else {
        throw new Error(response.data.error?.message || 'Failed to revoke API key');
      }
    } catch (err: any) {
      console.error('Failed to revoke API key:', err);
      setError(err.message || 'Failed to revoke API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    });
  };

  return (
    <div className="space-y-6">
      {/* Success Message for Created Key */}
      {createdKey && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Key className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-green-800">
                API Key Created Successfully
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p className="font-medium">Store this key securely - it will not be shown again:</p>
                <div className="mt-2 flex items-center space-x-2">
                  <code className="flex-1 px-3 py-2 bg-green-100 border border-green-300 rounded-md font-mono text-xs break-all">
                    {createdKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(createdKey)}
                    className="px-3 py-2 text-xs font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => setCreatedKey(null)}
                  className="text-green-600 hover:text-green-500 text-sm font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Main API Keys</h3>
            <p className="mt-1 text-sm text-gray-500">
              API keys for accessing the main Idswyft verification API from your customer portal
            </p>
          </div>
          {canManageKeys && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Key className="h-4 w-4 mr-2" />
              Create API Key
            </button>
          )}
        </div>

        {/* Create Form */}
        {showCreateForm && canManageKeys && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <form onSubmit={handleCreateKey} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Key Name
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Customer Portal Production"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Environment
                  </label>
                  <select
                    value={isSandbox ? 'sandbox' : 'production'}
                    onChange={(e) => setIsSandbox(e.target.value === 'sandbox')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="sandbox">Sandbox (Testing)</option>
                    <option value="production">Production (Live)</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  {isSandbox ? 'Up to 5 sandbox keys allowed' : 'Up to 2 production keys allowed'}
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newKeyName.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isCreating ? 'Creating...' : 'Create Key'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No API keys</h3>
              <p className="mt-1 text-sm text-gray-500">
                Create your first main API key to enable verification in your customer portal.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-sm font-medium text-gray-900">{key.key_name}</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        key.is_sandbox ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {key.is_sandbox ? 'Sandbox' : 'Production'}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 space-y-1">
                      <p>Key: <code className="bg-gray-100 px-2 py-1 rounded">{key.key_prefix}...</code></p>
                      <p>Created: {new Date(key.created_at).toLocaleDateString()}</p>
                      {key.last_used_at && (
                        <p>Last used: {new Date(key.last_used_at).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  {canManageKeys && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleRevokeKey(key.id, key.key_name)}
                        className="text-red-600 hover:text-red-500 text-sm font-medium"
                      >
                        Revoke
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Information Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              About Main API Keys
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Main API keys allow your customer portal to perform real identity verification</li>
                <li>Sandbox keys are for testing and don't process real verifications</li>
                <li>Production keys process real verifications and incur charges</li>
                <li>Keys use the format: <code>ik_[64-character hex string]</code></li>
                <li>Store keys securely in environment variables, never in code</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface GeneralSettingsProps {
  organization: OrgType;
  onSave: (e: React.FormEvent) => void;
  isLoading: boolean;
  canEdit: boolean;
  onChange: (org: OrgType) => void;
}

function GeneralSettings({ organization, onSave, isLoading, canEdit, onChange }: GeneralSettingsProps) {
  const handleChange = (field: keyof OrgType, value: any) => {
    onChange({ ...organization, [field]: value });
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Organization Details</h3>
      </div>
      
      <form onSubmit={onSave} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Name
            </label>
            <input
              type="text"
              value={organization.name}
              onChange={(e) => handleChange('name', e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Slug
            </label>
            <input
              type="text"
              value={organization.slug}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-500">Slug cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Email
            </label>
            <input
              type="email"
              value={organization.contact_email}
              onChange={(e) => handleChange('contact_email', e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subscription Tier
            </label>
            <input
              type="text"
              value={organization.subscription_tier}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 capitalize"
            />
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

interface BillingSettingsProps {
  organization: OrgType;
  canManage: boolean;
}

function BillingSettings({ organization, canManage }: BillingSettingsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'past_due': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'starter': return 'bg-blue-100 text-blue-800';
      case 'professional': return 'bg-purple-100 text-purple-800';
      case 'enterprise': return 'bg-green-100 text-green-800';
      case 'custom': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Billing Information</h3>
      </div>
      
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Plan
            </label>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getTierColor(organization.subscription_tier)}`}>
              {organization.subscription_tier}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Billing Status
            </label>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(organization.billing_status)}`}>
              {organization.billing_status.replace('_', ' ')}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stripe Customer ID
            </label>
            <p className="text-sm text-gray-900 font-mono">
              {organization.stripe_customer_id || 'Not configured'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Created
            </label>
            <p className="text-sm text-gray-900">
              {new Date(organization.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {canManage && (
          <div className="border-t border-gray-200 pt-6">
            <div className="flex space-x-3">
              <button
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => {/* TODO: Implement billing portal */}}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Billing
              </button>
              
              <button
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => {/* TODO: Implement plan upgrade */}}
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface BrandingSettingsProps {
  branding: OrganizationBranding;
  onSave: (branding: OrganizationBranding) => void;
  isLoading: boolean;
  canEdit: boolean;
}

function BrandingSettings({ branding, onSave, isLoading, canEdit }: BrandingSettingsProps) {
  const [formData, setFormData] = useState(branding);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (field: keyof OrganizationBranding, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Branding & Customization</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => handleChange('company_name', e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo URL
            </label>
            <input
              type="url"
              value={formData.logo_url || ''}
              onChange={(e) => handleChange('logo_url', e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Color
            </label>
            <div className="flex space-x-2">
              <input
                type="color"
                value={formData.primary_color || '#3B82F6'}
                onChange={(e) => handleChange('primary_color', e.target.value)}
                disabled={!canEdit}
                className="h-10 w-20 border border-gray-300 rounded-md disabled:opacity-50"
              />
              <input
                type="text"
                value={formData.primary_color || '#3B82F6'}
                onChange={(e) => handleChange('primary_color', e.target.value)}
                disabled={!canEdit}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                placeholder="#3B82F6"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Welcome Message
          </label>
          <textarea
            value={formData.welcome_message}
            onChange={(e) => handleChange('welcome_message', e.target.value)}
            disabled={!canEdit}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
            placeholder="Welcome! Please verify your identity to continue."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Success Message
          </label>
          <textarea
            value={formData.success_message}
            onChange={(e) => handleChange('success_message', e.target.value)}
            disabled={!canEdit}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
            placeholder="Thank you! Your identity has been successfully verified."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom CSS
          </label>
          <textarea
            value={formData.custom_css || ''}
            onChange={(e) => handleChange('custom_css', e.target.value)}
            disabled={!canEdit}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 font-mono text-sm"
            placeholder=".verification-form { /* Custom styles */ }"
          />
          <p className="mt-1 text-xs text-gray-500">
            Add custom CSS to style the verification interface
          </p>
        </div>

        {canEdit && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Branding'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}


interface StorageSettingsProps {
  organizationId: string;
  canManageStorage: boolean;
}

function StorageSettings({ organizationId, canManageStorage }: StorageSettingsProps) {
  const [storageConfig, setStorageConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Storage configuration state
  const [storageType, setStorageType] = useState<'default' | 'supabase' | 's3' | 'gcs'>('default');
  const [config, setConfig] = useState({
    // Supabase Storage
    supabase_url: '',
    supabase_service_key: '',
    supabase_bucket: '',
    
    // AWS S3
    s3_region: '',
    s3_bucket: '',
    s3_access_key: '',
    s3_secret_key: '',
    
    // Google Cloud Storage
    gcs_bucket: '',
    gcs_project_id: '',
    gcs_key_file: '',
    
    // Data retention settings
    retention_days: 365,
    auto_delete_completed: false,
    encryption_enabled: true
  });

  useEffect(() => {
    fetchStorageConfig();
  }, [organizationId]);

  const fetchStorageConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get(`/organizations/${organizationId}/storage-config`);
      
      if (response.data.success) {
        const data = response.data.data;
        setStorageConfig(data);
        setStorageType(data.storage_type || 'default');
        setConfig({ ...config, ...data.config });
      }
    } catch (err: any) {
      // If no config exists yet, that's okay - use defaults
      if (err.response?.status !== 404) {
        console.error('Failed to fetch storage config:', err);
        setError(err.message || 'Failed to fetch storage configuration');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageStorage) return;

    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        storage_type: storageType,
        config: storageType === 'default' ? {} : config
      };

      const response = await apiClient.post(`/organizations/${organizationId}/storage-config`, payload);
      
      if (response.data.success) {
        setSuccess('Storage configuration updated successfully');
        await fetchStorageConfig();
      } else {
        throw new Error(response.data.error?.message || 'Failed to update storage configuration');
      }
    } catch (err: any) {
      console.error('Failed to update storage config:', err);
      setError(err.message || 'Failed to update storage configuration');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <span className="text-green-700">{success}</span>
        </div>
      )}

      {/* Storage Configuration Card */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Document Storage Configuration</h3>
          <p className="mt-1 text-sm text-gray-500">
            Configure where identity documents are stored for data sovereignty and compliance
          </p>
        </div>
        
        <form onSubmit={handleSaveConfig} className="p-6 space-y-6">
          {/* Storage Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Storage Provider
            </label>
            <select
              value={storageType}
              onChange={(e) => setStorageType(e.target.value as any)}
              disabled={!canManageStorage}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
            >
              <option value="default">Default (Idswyft Storage)</option>
              <option value="supabase">Supabase Storage</option>
              <option value="s3">Amazon S3</option>
              <option value="gcs">Google Cloud Storage</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Custom storage providers will be configured in the next phase
            </p>
          </div>

          {/* Data Retention Settings */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Data Retention & Security</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retention Period (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="2555" // ~7 years
                  value={config.retention_days}
                  onChange={(e) => setConfig({ ...config, retention_days: Number(e.target.value) })}
                  disabled={!canManageStorage}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Documents will be automatically deleted after this period</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    id="auto_delete_completed"
                    type="checkbox"
                    checked={config.auto_delete_completed}
                    onChange={(e) => setConfig({ ...config, auto_delete_completed: e.target.checked })}
                    disabled={!canManageStorage}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                  />
                  <label htmlFor="auto_delete_completed" className="ml-2 block text-sm text-gray-900">
                    Auto-delete completed verifications
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="encryption_enabled"
                    type="checkbox"
                    checked={config.encryption_enabled}
                    onChange={(e) => setConfig({ ...config, encryption_enabled: e.target.checked })}
                    disabled={!canManageStorage}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                  />
                  <label htmlFor="encryption_enabled" className="ml-2 block text-sm text-gray-900">
                    Enable encryption at rest
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {canManageStorage && (
            <div className="flex justify-end pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={isUpdating}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {isUpdating ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Information Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              About Custom Storage
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Custom storage allows you to store identity documents in your own cloud storage</li>
                <li>This ensures data sovereignty and compliance with your organization's data policies</li>
                <li>All documents are encrypted in transit and at rest (when enabled)</li>
                <li>Storage credentials are encrypted and stored securely</li>
                <li>Coming soon: Full configuration for Supabase, AWS S3, and Google Cloud Storage</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}