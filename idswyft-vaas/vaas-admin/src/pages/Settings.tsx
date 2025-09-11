import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import { Organization, OrganizationSettings } from '../types.js';
import { Settings as SettingsIcon, Save, AlertCircle, CheckCircle, Shield, Palette, Bell, Clock, Users, Zap } from 'lucide-react';
import AdvancedThresholdSettings from '../components/AdvancedThresholdSettings';

export default function Settings() {
  const { organization, admin } = useAuth();
  const [orgData, setOrgData] = useState<Organization | null>(organization);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'verification' | 'security' | 'notifications' | 'appearance'>('verification');

  useEffect(() => {
    if (organization) {
      setOrgData(organization);
    }
  }, [organization]);

  const handleSaveSettings = async (updates: Partial<OrganizationSettings>) => {
    if (!orgData || !admin?.permissions.manage_settings) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updatedSettings = { ...orgData.settings, ...updates };
      const updated = await apiClient.updateOrganization(orgData.id, { 
        settings: updatedSettings 
      });
      setOrgData(updated);
      setSuccess('Settings updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickToggle = async (field: keyof OrganizationSettings, value: boolean) => {
    await handleSaveSettings({ [field]: value });
  };

  if (!orgData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const canEdit = admin?.permissions.manage_settings || false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Verification & System Settings</h1>
        <p className="text-gray-600">Configure technical verification thresholds, security settings, and system preferences</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:space-x-6">
        {/* Settings Navigation */}
        <div className="lg:w-64 mb-6 lg:mb-0">
          <nav className="space-y-2">
            <button
              onClick={() => setActiveSection('verification')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeSection === 'verification'
                  ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Shield className="h-4 w-4 mr-3" />
              Verification Configuration
            </button>
            
            <button
              onClick={() => setActiveSection('security')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeSection === 'security'
                  ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Users className="h-4 w-4 mr-3" />
              Security & Access
            </button>
            
            <button
              onClick={() => setActiveSection('notifications')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeSection === 'notifications'
                  ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Bell className="h-4 w-4 mr-3" />
              Notifications
            </button>
            
            <button
              onClick={() => setActiveSection('appearance')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeSection === 'appearance'
                  ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Palette className="h-4 w-4 mr-3" />
              Appearance
            </button>
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          {activeSection === 'verification' && (
            <div className="space-y-6">
              {/* Primary Verification Configuration */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Shield className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Primary Verification Configuration</h3>
                    <p className="mt-1 text-sm text-blue-700">
                      This is the main location for configuring all verification thresholds and technical settings. 
                      For business settings like company information and branding, visit the Organization page.
                    </p>
                  </div>
                </div>
              </div>

              {/* Enhanced Threshold Management */}
              <AdvancedThresholdSettings 
                organizationId={orgData.id}
                canEdit={canEdit}
                onThresholdsUpdated={() => {
                  // Refresh organization data when thresholds are updated
                  if (organization) {
                    setOrgData(organization);
                  }
                }}
              />
              
              {/* Legacy Settings (kept for backward compatibility) */}
              <VerificationSettingsSection
                settings={orgData.settings}
                onSave={handleSaveSettings}
                onQuickToggle={handleQuickToggle}
                isLoading={isLoading}
                canEdit={canEdit}
              />
            </div>
          )}

          {activeSection === 'security' && (
            <SecuritySettingsSection
              settings={orgData.settings}
              onSave={handleSaveSettings}
              onQuickToggle={handleQuickToggle}
              isLoading={isLoading}
              canEdit={canEdit}
            />
          )}

          {activeSection === 'notifications' && (
            <NotificationSettingsSection
              settings={orgData.settings}
              onSave={handleSaveSettings}
              onQuickToggle={handleQuickToggle}
              isLoading={isLoading}
              canEdit={canEdit}
            />
          )}

          {activeSection === 'appearance' && (
            <AppearanceSettingsSection
              settings={orgData.settings}
              onSave={handleSaveSettings}
              isLoading={isLoading}
              canEdit={canEdit}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface SettingsSectionProps {
  settings: OrganizationSettings;
  onSave: (updates: Partial<OrganizationSettings>) => Promise<void>;
  onQuickToggle?: (field: keyof OrganizationSettings, value: boolean) => Promise<void>;
  isLoading: boolean;
  canEdit: boolean;
}

function VerificationSettingsSection({ settings, onSave, onQuickToggle, isLoading, canEdit }: SettingsSectionProps) {
  const [formData, setFormData] = useState(settings);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  const handleChange = (field: keyof OrganizationSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleQuickToggleLocal = async (field: keyof OrganizationSettings, checked: boolean) => {
    setFormData(prev => ({ ...prev, [field]: checked }));
    if (onQuickToggle) {
      await onQuickToggle(field, checked);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Toggles */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-blue-600" />
            Quick Settings
          </h3>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Liveness Detection</label>
              <p className="text-xs text-gray-500">Require real-time selfie verification</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.require_liveness}
                onChange={(e) => handleQuickToggleLocal('require_liveness', e.target.checked)}
                disabled={!canEdit || isLoading}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Back of ID Required</label>
              <p className="text-xs text-gray-500">Require both sides of ID documents</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.require_back_of_id}
                onChange={(e) => handleQuickToggleLocal('require_back_of_id', e.target.checked)}
                disabled={!canEdit || isLoading}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Legacy Threshold Management (Simplified) */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-700">Additional Settings</h3>
          <p className="text-sm text-gray-500 mt-1">
            Additional verification settings that complement the advanced threshold management above.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Auto-Approve (%)
              </label>
              <input
                type="number"
                min="70"
                max="95"
                value={formData.auto_approve_threshold}
                onChange={(e) => handleChange('auto_approve_threshold', Number(e.target.value))}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Manual Review (%)
              </label>
              <input
                type="number"
                min="30"
                max="80"
                value={formData.manual_review_threshold}
                onChange={(e) => handleChange('manual_review_threshold', Number(e.target.value))}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Max Attempts
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.max_verification_attempts}
                onChange={(e) => handleChange('max_verification_attempts', Number(e.target.value))}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>

          {canEdit && (
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Update Additional Settings'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function SecuritySettingsSection({ settings, onSave, isLoading, canEdit }: SettingsSectionProps) {
  const [formData, setFormData] = useState(settings);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ session_timeout: formData.session_timeout });
  };

  const handleChange = (field: keyof OrganizationSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Security & Session Management</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="h-4 w-4 inline mr-1" />
            Session Timeout (minutes)
          </label>
          <input
            type="number"
            min="5"
            max="1440"
            value={formData.session_timeout}
            onChange={(e) => handleChange('session_timeout', Number(e.target.value))}
            disabled={!canEdit}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
          />
          <p className="mt-1 text-xs text-gray-500">
            How long verification sessions remain active (5-1440 minutes)
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-yellow-800">Security Notice</h4>
              <p className="mt-1 text-sm text-yellow-700">
                Shorter session timeouts improve security but may impact user experience for complex verifications.
              </p>
            </div>
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

function NotificationSettingsSection({ settings, onSave, onQuickToggle, isLoading, canEdit }: SettingsSectionProps) {
  const [formData, setFormData] = useState(settings);

  const handleQuickToggleLocal = async (field: keyof OrganizationSettings, checked: boolean) => {
    setFormData(prev => ({ ...prev, [field]: checked }));
    if (onQuickToggle) {
      await onQuickToggle(field, checked);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
      </div>
      
      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Email Notifications</label>
              <p className="text-xs text-gray-500">Receive email alerts for verification events</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.email_notifications}
                onChange={(e) => handleQuickToggleLocal('email_notifications', e.target.checked)}
                disabled={!canEdit || isLoading}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Webhook Notifications</label>
              <p className="text-xs text-gray-500">Send real-time events to configured webhooks</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.webhook_notifications}
                onChange={(e) => handleQuickToggleLocal('webhook_notifications', e.target.checked)}
                disabled={!canEdit || isLoading}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <Bell className="h-5 w-5 text-blue-400 flex-shrink-0" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">Notification Events</h4>
              <ul className="mt-1 text-sm text-blue-700 list-disc list-inside space-y-1">
                <li>Verification completion (success/failure)</li>
                <li>Manual review requirements</li>
                <li>System alerts and errors</li>
                <li>Usage threshold notifications</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppearanceSettingsSection({ settings, onSave, isLoading, canEdit }: SettingsSectionProps) {
  const [formData, setFormData] = useState(settings);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ theme: formData.theme, language: formData.language });
  };

  const handleChange = (field: keyof OrganizationSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Appearance & Localization</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Theme
            </label>
            <select
              value={formData.theme}
              onChange={(e) => handleChange('theme', e.target.value as 'light' | 'dark')}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select
              value={formData.language}
              onChange={(e) => handleChange('language', e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <div className="flex">
            <Palette className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-gray-800">Advanced Customization</h4>
              <p className="mt-1 text-sm text-gray-600">
                For custom branding, colors, and advanced appearance options, visit the{' '}
                <a href="/organization" className="text-blue-600 hover:text-blue-500 font-medium">
                  Organization Settings
                </a>{' '}
                page.
              </p>
            </div>
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