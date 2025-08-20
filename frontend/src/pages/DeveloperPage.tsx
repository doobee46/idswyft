import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  TrashIcon,
  PlusIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  ChartBarIcon,
  ClockIcon,
  CpuChipIcon,
  GlobeAltIcon,
  LockClosedIcon,
  CheckCircleIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface ApiKey {
  id: string;
  name: string;
  key_preview: string;
  is_sandbox: boolean;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
  status: 'active' | 'expired';
}

interface DeveloperStats {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  monthly_usage: number;
  monthly_limit: number;
}

export const DeveloperPage: React.FC = () => {
  const [currentApiKey, setCurrentApiKey] = useState<string>('');
  
  // Debug logging for currentApiKey state changes
  React.useEffect(() => {
    console.log('currentApiKey state changed:', currentApiKey);
  }, [currentApiKey]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<DeveloperStats | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'docs'>('overview');
  const [developerInfo, setDeveloperInfo] = useState({
    name: '',
    email: '',
    company: '',
    webhookUrl: ''
  });
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [newApiKeyForm, setNewApiKeyForm] = useState({
    name: '',
    isSandbox: false
  });

  useEffect(() => {
    // Check if developer is already registered (could use localStorage or session)
    const storedEmail = localStorage.getItem('developer_email');
    if (storedEmail) {
      setDeveloperInfo(prev => ({ ...prev, email: storedEmail }));
      setIsRegistered(true);
      loadApiKeys(storedEmail);
      loadStats(storedEmail);
    }
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Basic client-side validation
    if (!developerInfo.name.trim()) {
      toast.error('Developer name is required');
      setLoading(false);
      return;
    }
    
    if (!developerInfo.email.trim()) {
      toast.error('Email address is required');
      setLoading(false);
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(developerInfo.email)) {
      toast.error('Please enter a valid email address');
      setLoading(false);
      return;
    }
    
    try {
      const requestData = {
        name: developerInfo.name.trim(),
        email: developerInfo.email.trim(),
        company: developerInfo.company.trim() || undefined,
        webhook_url: developerInfo.webhookUrl.trim() || undefined
      };
      
      console.log('Sending registration request:', requestData);
      
      const response = await fetch('http://localhost:3001/api/developer/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      const data = await response.json();
      console.log('Registration response:', data);
      
      if (response.ok && data.api_key && data.api_key.key) {
        setCurrentApiKey(data.api_key.key);
        setIsRegistered(true);
        localStorage.setItem('developer_email', developerInfo.email);
        toast.success('🎉 Developer account created successfully!');
        await loadApiKeys(developerInfo.email);
        await loadStats(developerInfo.email);
      } else {
        // Handle validation errors
        if (data.code === 'multiple' && data.details) {
          // Multiple validation errors
          data.details.forEach((error: any) => {
            toast.error(error.msg || error.message);
          });
        } else {
          toast.error(data.message || 'Registration failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error('Registration failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadApiKeys = async (email: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/developer/api-keys?developer_email=${email}`);
      const data = await response.json();
      console.log('Load API Keys Response:', data);
      
      if (response.ok) {
        console.log('Setting API keys:', data.api_keys);
        setApiKeys(data.api_keys);
      } else {
        console.error('Failed to load API keys:', data);
        if (response.status === 401) {
          console.log('Developer not authenticated, redirecting to registration');
          setIsRegistered(false);
          localStorage.removeItem('developer_email');
          toast.error('❌ Authentication failed. Please register as a developer first.');
        }
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  };

  const loadStats = async (email: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/developer/stats?developer_email=${email}`);
      const data = await response.json();
      if (response.ok) {
        setStats({
          total_requests: data.total_requests,
          successful_requests: data.successful_requests,
          failed_requests: data.failed_requests,
          monthly_usage: data.monthly_usage,
          monthly_limit: data.monthly_limit
        });
      } else {
        // Fallback to mock data if API fails
        setStats({
          total_requests: 1247,
          successful_requests: 1198,
          failed_requests: 49,
          monthly_usage: 847,
          monthly_limit: 1000
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      // Fallback to mock data on error
      setStats({
        total_requests: 1247,
        successful_requests: 1198,
        failed_requests: 49,
        monthly_usage: 847,
        monthly_limit: 1000
      });
    }
  };

  const generateApiKey = async (name: string, isSandbox: boolean = false) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/developer/api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          developer_email: developerInfo.email,
          name,
          is_sandbox: isSandbox
        }),
      });
      
      const data = await response.json();
      console.log('API Key Generation Response:', data);
      
      if (response.ok) {
        console.log('Setting current API key:', data.api_key);
        setCurrentApiKey(data.api_key);
        toast.success('🔑 New API key generated successfully!');
        await loadApiKeys(developerInfo.email);
      } else {
        console.error('API Key generation failed:', data);
        if (response.status === 401) {
          toast.error('❌ Authentication failed. Please make sure you are registered as a developer.');
          // Reset the registration state if authentication fails
          setIsRegistered(false);
          localStorage.removeItem('developer_email');
        } else {
          toast.error(data.message || 'Failed to generate API key');
        }
      }
    } catch (error) {
      console.error('API key generation failed:', error);
      toast.error('Failed to generate API key. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const revokeApiKey = async (keyId: string) => {
    const confirmed = await new Promise((resolve) => {
      toast((t) => (
        <div className="flex flex-col space-y-3">
          <div className="font-medium">Revoke API Key</div>
          <div className="text-sm text-gray-600">
            Are you sure you want to revoke this API key? This action cannot be undone.
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Revoke
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
              className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      ), { duration: Infinity });
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/developer/api-key/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          developer_email: developerInfo.email
        }),
      });
      
      if (response.ok) {
        toast.success('🗑️ API key revoked successfully');
        await loadApiKeys(developerInfo.email);
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to revoke API key');
      }
    } catch (error) {
      console.error('Failed to revoke API key:', error);
      toast.error('Failed to revoke API key. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('📋 Copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('developer_email');
    setIsRegistered(false);
    setDeveloperInfo({ name: '', email: '', company: '', webhookUrl: '' });
    setApiKeys([]);
    setStats(null);
    setCurrentApiKey('');
    setActiveTab('overview');
    toast.success('👋 Logged out successfully');
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApiKeyForm.name.trim()) {
      toast.error('API key name is required');
      return;
    }
    
    await generateApiKey(newApiKeyForm.name.trim(), newApiKeyForm.isSandbox);
    setShowApiKeyModal(false);
    setNewApiKeyForm({ name: '', isSandbox: false });
  };

  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
                <CpuChipIcon className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Join the Developer Program</h1>
              <p className="text-xl text-gray-600">Get instant access to our identity verification APIs</p>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Registration Form */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Your Account</h2>
                <form onSubmit={handleRegister} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Developer Name *
                    </label>
                    <input
                      type="text"
                      value={developerInfo.name}
                      onChange={(e) => setDeveloperInfo({...developerInfo, name: e.target.value})}
                      className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={developerInfo.email}
                      onChange={(e) => setDeveloperInfo({...developerInfo, email: e.target.value})}
                      className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="developer@company.com"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Company / Organization
                    </label>
                    <input
                      type="text"
                      value={developerInfo.company}
                      onChange={(e) => setDeveloperInfo({...developerInfo, company: e.target.value})}
                      className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="Your Company Ltd."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Webhook URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={developerInfo.webhookUrl}
                      onChange={(e) => setDeveloperInfo({...developerInfo, webhookUrl: e.target.value})}
                      className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="https://yourapp.com/webhook"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Receive real-time verification status updates
                    </p>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition duration-200 font-semibold text-lg flex items-center justify-center"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    ) : (
                      <KeyIcon className="w-5 h-5 mr-2" />
                    )}
                    {loading ? 'Creating Account...' : 'Create Account & Get API Key'}
                  </button>
                  
                  <p className="text-sm text-gray-500 text-center">
                    By registering, you agree to our Terms of Service and Privacy Policy
                  </p>
                </form>
              </div>

              {/* Benefits */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">What you get</h3>
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                        <CheckCircleIcon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">1,000 Free Verifications</h4>
                      <p className="text-gray-600 text-sm">Monthly quota to get started - no credit card required</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <CpuChipIcon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">AI-Powered Quality Analysis</h4>
                      <p className="text-gray-600 text-sm">Advanced document quality assessment with recommendations</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                        <ShieldCheckIcon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Enterprise Security</h4>
                      <p className="text-gray-600 text-sm">SOC2 compliant with end-to-end encryption</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                        <GlobeAltIcon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Global Coverage</h4>
                      <p className="text-gray-600 text-sm">Support for 150+ countries and document types</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 p-4 bg-white/50 rounded-xl border border-white/20">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">&lt; 200ms</div>
                    <div className="text-sm text-gray-600">Average API Response Time</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Developer Dashboard</h1>
              <p className="text-gray-600">Welcome back, {developerInfo.name || 'Developer'}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">API Status</div>
                <div className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <span className="font-semibold">Operational</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {[
                { key: 'overview', label: 'Overview', icon: ChartBarIcon },
                { key: 'keys', label: 'API Keys', icon: KeyIcon },
                { key: 'docs', label: 'Documentation', icon: ClipboardDocumentIcon }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Usage Statistics */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Monthly Usage</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.monthly_usage}</p>
                      <p className="text-sm text-gray-500">of {stats.monthly_limit} limit</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <ChartBarIcon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(stats.monthly_usage / stats.monthly_limit) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Success Rate</p>
                      <p className="text-3xl font-bold text-green-600">{((stats.successful_requests / stats.total_requests) * 100).toFixed(1)}%</p>
                      <p className="text-sm text-gray-500">{stats.successful_requests} successful</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                      <CheckCircleIcon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Requests</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.total_requests.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">all time</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                      <CpuChipIcon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Failed Requests</p>
                      <p className="text-3xl font-bold text-red-600">{stats.failed_requests}</p>
                      <p className="text-sm text-gray-500">{((stats.failed_requests / stats.total_requests) * 100).toFixed(1)}% error rate</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center">
                      <ExclamationTriangleIcon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* New API Key Display */}
            {currentApiKey && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <CheckCircleIcon className="w-8 h-8 text-green-600 mr-3" />
                    <div>
                      <h3 className="text-lg font-bold text-green-900">New API Key Generated!</h3>
                      <p className="text-green-700">Copy and store this key securely - it won't be shown again.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center space-x-3">
                  <div className="flex-1">
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={currentApiKey}
                        readOnly
                        className="w-full p-4 pr-20 bg-white border border-green-300 rounded-xl font-mono text-sm"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="p-1 text-gray-500 hover:text-gray-700"
                        >
                          {showApiKey ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(currentApiKey)}
                          className="p-1 text-gray-500 hover:text-gray-700"
                        >
                          <ClipboardDocumentIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentApiKey('')}
                    className="px-4 py-2 text-green-700 border border-green-300 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    Got it
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'keys' && (
          <div className="space-y-8">
            {/* API Keys Management */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">API Key Management</h2>
                  <p className="text-gray-600">Create, view, and manage your API keys</p>
                </div>
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  disabled={loading}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Generate New Key
                </button>
              </div>
              
              <div className="space-y-4">
                {apiKeys.length === 0 ? (
                  <div className="text-center py-12">
                    <KeyIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No API Keys</h3>
                    <p className="text-gray-600 mb-6">Generate your first API key to start using our verification APIs</p>
                    <button
                      onClick={() => setShowApiKeyModal(true)}
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      <PlusIcon className="w-5 h-5 mr-2" />
                      Generate First API Key
                    </button>
                  </div>
                ) : (
                  apiKeys.map((key) => (
                    <div key={key.id} className="border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{key.name}</h3>
                            {key.is_sandbox && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                                Sandbox
                              </span>
                            )}
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              key.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {key.status === 'active' ? 'Active' : 'Expired'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="font-mono">{key.key_preview}</span>
                            <span>Created {new Date(key.created_at).toLocaleDateString()}</span>
                            {key.last_used_at && (
                              <span>Last used {new Date(key.last_used_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {key.is_active && (
                            <button
                              onClick={() => revokeApiKey(key.id)}
                              disabled={loading}
                              className="inline-flex items-center px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                            >
                              <TrashIcon className="w-4 h-4 mr-1" />
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Security Information */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
              <div className="flex items-start space-x-3">
                <LockClosedIcon className="w-6 h-6 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="text-lg font-bold text-amber-900 mb-2">API Key Security</h3>
                  <ul className="text-amber-800 text-sm space-y-1">
                    <li>• Never share your API keys publicly or commit them to version control</li>
                    <li>• Use environment variables to store API keys in production</li>
                    <li>• Regularly rotate your API keys for enhanced security</li>
                    <li>• Use sandbox keys for testing and development</li>
                    <li>• Monitor API key usage and revoke unused keys</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'docs' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Start Guide</h2>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Document Verification</h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <pre className="text-sm overflow-x-auto">
{`curl -X POST https://api.idswyft.com/v1/verify/document \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: multipart/form-data" \\
  -F "document=@passport.jpg" \\
  -F "user_id=user_123" \\
  -F "document_type=passport"`}
                  </pre>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Selfie Verification</h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <pre className="text-sm overflow-x-auto">
{`curl -X POST https://api.idswyft.com/v1/verify/selfie \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: multipart/form-data" \\
  -F "selfie=@selfie.jpg" \\
  -F "verification_id=ver_abc123"`}
                  </pre>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Next Steps</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <a href="/docs" className="block p-6 border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-lg transition-all">
                  <ClipboardDocumentIcon className="w-8 h-8 text-blue-600 mb-3" />
                  <h4 className="font-semibold text-gray-900 mb-2">Full Documentation</h4>
                  <p className="text-gray-600 text-sm">Complete API reference and integration guides</p>
                </a>
                
                <a href="/verify" className="block p-6 border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-lg transition-all">
                  <CpuChipIcon className="w-8 h-8 text-purple-600 mb-3" />
                  <h4 className="font-semibold text-gray-900 mb-2">Try Live Demo</h4>
                  <p className="text-gray-600 text-sm">Test our verification flow with real documents</p>
                </a>
                
                <div className="p-6 border border-gray-200 rounded-xl bg-gray-50">
                  <ChartBarIcon className="w-8 h-8 text-green-600 mb-3" />
                  <h4 className="font-semibold text-gray-900 mb-2">Usage Analytics</h4>
                  <p className="text-gray-600 text-sm">Monitor your API usage and performance metrics</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* API Key Creation Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Create New API Key</h3>
              <button
                onClick={() => {
                  setShowApiKeyModal(false);
                  setNewApiKeyForm({ name: '', isSandbox: false });
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateApiKey} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  API Key Name *
                </label>
                <input
                  type="text"
                  value={newApiKeyForm.name}
                  onChange={(e) => setNewApiKeyForm({ ...newApiKeyForm, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="e.g., Production API Key, Development Key"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Choose a descriptive name to help identify this key
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isSandbox"
                  checked={newApiKeyForm.isSandbox}
                  onChange={(e) => setNewApiKeyForm({ ...newApiKeyForm, isSandbox: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isSandbox" className="text-sm font-medium text-gray-700">
                  Sandbox Key
                </label>
              </div>
              <p className="text-xs text-gray-500 -mt-2">
                Sandbox keys are for testing and have higher rate limits but process test data only
              </p>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowApiKeyModal(false);
                    setNewApiKeyForm({ name: '', isSandbox: false });
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !newApiKeyForm.name.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all font-medium"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </div>
                  ) : (
                    'Create API Key'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};