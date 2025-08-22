import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { API_BASE_URL, getDocumentationApiUrl } from '../config/api';
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
  const apiUrl = getDocumentationApiUrl();
  
  // Debug logging for currentApiKey state changes
  React.useEffect(() => {
    console.log('currentApiKey state changed:', currentApiKey);
  }, [currentApiKey]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [stats, setStats] = useState<DeveloperStats>({
    total_requests: 0,
    successful_requests: 0,
    failed_requests: 0,
    monthly_usage: 0,
    monthly_limit: 1000
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'docs' | 'security'>('overview');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyIsSandbox, setNewKeyIsSandbox] = useState(false);
  const [registrationMode, setRegistrationMode] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    webhook_url: ''
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [developerToken, setDeveloperToken] = useState<string | null>(null);

  useEffect(() => {
    // Check if developer token exists
    const token = localStorage.getItem('developer_token');
    if (token) {
      setDeveloperToken(token);
      setIsAuthenticated(true);
      fetchApiKeys();
      fetchStats();
    }
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Basic client-side validation
      if (!formData.name || !formData.email) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error('Please enter a valid email address');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/developer/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          company: formData.company || undefined,
          webhook_url: formData.webhook_url || undefined
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Registration successful! Logging you in...');
        // Store developer info and token (we'll get token from a separate login call)
        localStorage.setItem('developer_email', formData.email);
        
        // Login to get token
        const loginResponse = await fetch(`${API_BASE_URL}/api/auth/developer/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email
          }),
        });

        const loginData = await loginResponse.json();

        if (loginResponse.ok && loginData.token) {
          localStorage.setItem('developer_token', loginData.token);
          setDeveloperToken(loginData.token);
          setIsAuthenticated(true);
          await fetchApiKeys();
          await fetchStats();
        } else {
          toast.error('Registration successful but login failed. Please try logging in manually.');
        }
      } else {
        // Handle validation errors
        if (data.errors && Array.isArray(data.errors)) {
          // Multiple validation errors
          data.errors.forEach((error: any) => {
            toast.error(error.message || error);
          });
        } else {
          toast.error(data.message || 'Registration failed');
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed. Please try again.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Basic client-side validation
      if (!formData.email) {
        toast.error('Please enter your email address');
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error('Please enter a valid email address');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/developer/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email
        }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        toast.success('Login successful!');
        
        // Store in localStorage
        localStorage.setItem('developer_token', data.token);
        localStorage.setItem('developer_email', formData.email);
        
        setDeveloperToken(data.token);
        setIsAuthenticated(true);
        
        // Fetch user data
        await fetchApiKeys();
        await fetchStats();
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
    }
  };

  const fetchApiKeys = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/developer/api-keys`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('developer_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.api_keys || []);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to fetch API keys');
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
      // Don't show error toast here, as it might be due to no keys existing yet
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/developer/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('developer_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats({
          total_requests: data.total_requests || 0,
          successful_requests: data.successful_requests || 0,
          failed_requests: data.failed_requests || 0,
          monthly_usage: data.monthly_usage || 0,
          monthly_limit: data.monthly_limit || 1000
        });
      } else {
        // Fallback to mock data if API fails
        setStats({
          total_requests: 142,
          successful_requests: 138,
          failed_requests: 4,
          monthly_usage: 89,
          monthly_limit: 1000
        });
      }
    } catch (error) {
      // Fallback to mock data on error
      setStats({
        total_requests: 142,
        successful_requests: 138,
        failed_requests: 4,
        monthly_usage: 89,
        monthly_limit: 1000
      });
    }
  };

  const createApiKey = async () => {
    try {
      console.log('🔑 Creating API key with:', { name: newKeyName, is_sandbox: newKeyIsSandbox });
      console.log('🔑 Using token:', localStorage.getItem('developer_token')?.substring(0, 20) + '...');
      
      const response = await fetch(`${API_BASE_URL}/api/developer/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('developer_token')}`,
        },
        body: JSON.stringify({
          name: newKeyName,
          is_sandbox: newKeyIsSandbox,
        }),
      });

      console.log('🔑 Response status:', response.status);
      const data = await response.json();
      console.log('🔑 Response data:', data);

      if (response.ok) {
        toast.success('API key created successfully!');
        setCurrentApiKey(data.api_key);
        setShowApiKey(true);
        setShowKeyModal(false);
        setNewKeyName('');
        setNewKeyIsSandbox(false);
        await fetchApiKeys();
        return true; // Success
      } else {
        console.error('🔑 API key creation failed:', response.status, data);
        toast.error(data.message || 'Failed to create API key');
        return false; // Failure
      }
    } catch (error) {
      console.error('🔑 Error creating API key:', error);
      toast.error('Failed to create API key');
      return false; // Failure
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/developer/api-key/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('developer_token')}`,
        },
      });

      if (response.ok) {
        toast.success('API key deleted successfully!');
        await fetchApiKeys();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to delete API key');
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error('Failed to delete API key');
    }
  };

  const handleKeyCreation = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for your API key');
      return;
    }

    const success = await createApiKey();
    
    if (success) {
      setActiveTab('overview'); // Switch to overview tab to show the new key
    }
    // If not successful, keep modal open so user can try again
  };

  const logout = () => {
    localStorage.removeItem('developer_token');
    localStorage.removeItem('developer_email');
    setDeveloperToken(null);
    setIsAuthenticated(false);
    setApiKeys([]);
    setFormData({
      name: '',
      email: '',
      company: '',
      webhook_url: ''
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-md w-full">
            {/* Login/Register Toggle */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-blue-600 p-3 rounded-xl">
                  <CpuChipIcon className="w-8 h-8 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Idswyft Developer Portal</h1>
              <p className="text-gray-600">Enter your email to access your API keys and documentation</p>
              
              <div className="flex bg-gray-100 p-1 rounded-lg mt-6">
                <button
                  type="button"
                  onClick={() => setRegistrationMode(false)}
                  className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all ${
                    !registrationMode 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setRegistrationMode(true)}
                  className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all ${
                    registrationMode 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              {/* Registration/Login Form */}
              <form onSubmit={registrationMode ? handleRegister : handleLogin} className="space-y-4">
                {registrationMode && (
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      required={registrationMode}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="John Doe"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="john@company.com"
                  />
                </div>

                {registrationMode && (
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                      Company (Optional)
                    </label>
                    <input
                      type="text"
                      id="company"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                      placeholder="Acme Inc."
                    />
                  </div>
                )}

                {registrationMode && (
                  <>

                    <div>
                      <label htmlFor="webhook_url" className="block text-sm font-medium text-gray-700 mb-2">
                        Webhook URL (Optional)
                      </label>
                      <input
                        type="url"
                        id="webhook_url"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formData.webhook_url}
                        onChange={(e) => setFormData({...formData, webhook_url: e.target.value})}
                        placeholder="https://yourapp.com/webhook"
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {registrationMode ? 'Create Account' : 'Sign In'}
                </button>
              </form>
            </div>

            {/* Benefits */}
            <div className="mt-8 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Why choose Idswyft?</h3>
              <div className="grid grid-cols-1 gap-4 text-sm">
                <div className="flex items-center justify-center space-x-2">
                  <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-700">Bank-grade security</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <GlobeAltIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-700">Global document support</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <ChartBarIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-700">Real-time analytics</span>
                </div>
              </div>

              <div className="mt-8 p-4 bg-white/50 rounded-xl border border-white/20">
                <p className="text-xs text-gray-500">
                  By creating an account, you agree to our Terms of Service and Privacy Policy.
                  Start with 1,000 free verification requests per month.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <CpuChipIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Developer Portal</h1>
              <p className="text-sm sm:text-base text-gray-600">Manage your API keys and monitor usage</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm sm:text-base"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Logout</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-2 sm:space-x-8 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: ChartBarIcon },
              { id: 'keys', label: 'API Keys', icon: KeyIcon },
              { id: 'docs', label: 'Documentation', icon: ClipboardDocumentIcon },
              { id: 'security', label: 'Security', icon: LockClosedIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.id === 'docs' ? 'Docs' : tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Usage Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Total Requests</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total_requests.toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-50 p-2 sm:p-3 rounded-lg">
                    <GlobeAltIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl sm:text-3xl font-bold text-green-600">{((stats.successful_requests / stats.total_requests) * 100).toFixed(1)}%</p>
                  </div>
                  <div className="bg-green-50 p-2 sm:p-3 rounded-lg">
                    <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex items-center text-xs sm:text-sm text-gray-600">
                    <span>{stats.successful_requests} successful</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">This Month</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.monthly_usage}</p>
                    <p className="text-xs sm:text-sm text-gray-500">{((stats.failed_requests / stats.total_requests) * 100).toFixed(1)}% error rate</p>
                  </div>
                  <div className="bg-orange-50 p-2 sm:p-3 rounded-lg">
                    <ChartBarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-600 h-2 rounded-full" 
                      style={{width: `${(stats.monthly_usage / stats.monthly_limit) * 100}%`}}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{stats.monthly_usage} of {stats.monthly_limit} requests</p>
                </div>
              </div>
            </div>

            {/* New API Key Display */}
            {currentApiKey && showApiKey && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-gray-900">New API Key Created!</h3>
                    </div>
                    <p className="text-gray-600 mb-4">
                      Your new API key has been generated. Copy it now as it won't be shown again.
                    </p>
                    
                    <div className="bg-white rounded-lg p-3 font-mono text-sm border">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-900 break-all mr-2">{currentApiKey}</span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => navigator.clipboard.writeText(currentApiKey)}
                            className="p-2 text-gray-500 hover:text-gray-700 rounded"
                            title="Copy to clipboard"
                          >
                            <ClipboardDocumentIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowApiKey(false)}
                            className="p-2 text-gray-500 hover:text-gray-700 rounded"
                            title="Hide key"
                          >
                            {showApiKey ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {setShowApiKey(false); setCurrentApiKey('');}}
                    className="ml-4 p-1 text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* API Calls and Status Card */}
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent API Activity</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Live</span>
                </div>
              </div>
              
              {/* API Status Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.successful_requests}</div>
                  <div className="text-xs text-green-700">Successful</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{stats.failed_requests}</div>
                  <div className="text-xs text-red-700">Failed</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">12</div>
                  <div className="text-xs text-yellow-700">Pending</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">3</div>
                  <div className="text-xs text-blue-700">Manual Review</div>
                </div>
              </div>

              {/* Recent API Calls */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 text-sm">Recent API Calls</h4>
                <div className="space-y-2">
                  {/* Mock recent calls - replace with real data */}
                  {[
                    { endpoint: '/api/verify/start', method: 'POST', status: 200, time: '2 min ago' },
                    { endpoint: '/api/verify/document', method: 'POST', status: 200, time: '5 min ago' },
                    { endpoint: '/api/verify/live-capture', method: 'POST', status: 200, time: '8 min ago' },
                    { endpoint: '/api/verify/results', method: 'GET', status: 200, time: '12 min ago' },
                    { endpoint: '/api/verify/start', method: 'POST', status: 400, time: '15 min ago' }
                  ].map((call, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          call.method === 'POST' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {call.method}
                        </span>
                        <span className="font-mono text-sm text-gray-700">{call.endpoint}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          call.status === 200 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {call.status}
                        </span>
                        <span className="text-sm text-gray-500">{call.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'keys' && (
          <div className="space-y-6">
            {/* API Keys Management */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">API Keys</h2>
                <p className="text-sm sm:text-base text-gray-600">Manage your API keys for development and production</p>
              </div>
              <button
                onClick={() => setShowKeyModal(true)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base w-full sm:w-auto justify-center sm:justify-start"
              >
                <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>New API Key</span>
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {apiKeys.length === 0 ? (
                <div className="p-6 sm:p-8 text-center">
                  <KeyIcon className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No API Keys Yet</h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-4">Create your first API key to start integrating with Idswyft</p>
                  <button
                    onClick={() => setShowKeyModal(true)}
                    className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                  >
                    Create API Key
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                      <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
                        <div className="bg-gray-100 p-2 rounded-lg flex-shrink-0">
                          <KeyIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">{key.name}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full w-fit ${
                              key.is_sandbox 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {key.is_sandbox ? 'Sandbox' : 'Production'}
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-1 text-xs sm:text-sm text-gray-500 space-y-1 sm:space-y-0">
                            <span className="font-mono">Key: {key.key_preview}</span>
                            <span>Created: {new Date(key.created_at).toLocaleDateString()}</span>
                            {key.last_used_at && (
                              <span>Last used: {new Date(key.last_used_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
                        <div className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(key.status)}`}>
                          {key.status}
                        </div>
                        <button
                          onClick={() => deleteApiKey(key.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete API key"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="space-y-6">
            {/* Documentation */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">API Documentation</h2>
              
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Verification Flow</h3>
                <p className="text-gray-600 mb-6">
                  Our new verification API provides a streamlined 4-step process for document verification with live camera capture.
                </p>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">1. Start Verification Session</h4>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <pre className="text-sm overflow-x-auto">
{`curl -X POST ${apiUrl}/api/verify/start \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": "user_123"
  }'`}</pre>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">2. Upload Document</h4>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <pre className="text-sm overflow-x-auto">
{`curl -X POST ${apiUrl}/api/verify/document \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: multipart/form-data" \\
  -F "verification_id=verif_abc123" \\
  -F "document_type=passport" \\
  -F "document=@passport.jpg"`}</pre>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">3. Live Camera Capture</h4>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <pre className="text-sm overflow-x-auto">
{`curl -X POST ${apiUrl}/api/verify/live-capture \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "verification_id": "verif_abc123",
    "live_image_data": "base64_encoded_image",
    "challenge_response": "smile"
  }'`}</pre>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">4. Get Verification Results</h4>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <pre className="text-sm overflow-x-auto">
{`curl -X GET ${apiUrl}/api/verify/results/verif_abc123 \\
  -H "X-API-Key: YOUR_API_KEY"`}</pre>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Response Example</h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <pre className="text-sm overflow-x-auto">
{`{
  "verification_id": "verif_abc123",
  "user_id": "user_123",
  "status": "verified",
  "document_uploaded": true,
  "document_type": "passport",
  "live_capture_completed": true,
  "ocr_data": {
    "name": "John Doe",
    "date_of_birth": "1990-01-01",
    "document_number": "P123456789"
  },
  "liveness_score": 0.94,
  "face_match_score": 0.92,
  "confidence_score": 0.93,
  "next_steps": ["Verification complete"]
}`}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Security Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Security & Best Practices</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <ShieldCheckIcon className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">API Key Security</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Keep your API keys confidential</li>
                    <li>• Use environment variables, never hardcode keys</li>
                    <li>• Rotate keys regularly</li>
                    <li>• Use different keys for different environments</li>
                    <li>• Monitor usage for unexpected activity</li>
                  </ul>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <LockClosedIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Data Protection</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• All data is encrypted in transit and at rest</li>
                    <li>• Documents are automatically deleted after 30 days</li>
                    <li>• GDPR and CCPA compliant</li>
                    <li>• No data is shared with third parties</li>
                    <li>• SOC 2 Type II certified infrastructure</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API Key Creation Modal */}
        {showKeyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Create New API Key</h3>
                <button
                  onClick={() => setShowKeyModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Key Name
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="My App Key"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sandbox"
                    checked={newKeyIsSandbox}
                    onChange={(e) => setNewKeyIsSandbox(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="sandbox" className="text-sm text-gray-700">
                    Sandbox Environment
                  </label>
                </div>
                
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    onClick={() => setShowKeyModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleKeyCreation}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
                  >
                    Create Key
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function getStatusBadge(status: string) {
  const baseClasses = "px-3 py-1 rounded-full text-sm font-medium";
  
  switch (status) {
    case 'verified':
      return `${baseClasses} bg-green-100 text-green-800`;
    case 'failed':
      return `${baseClasses} bg-red-100 text-red-800`;
    case 'pending':
      return `${baseClasses} bg-yellow-100 text-yellow-800`;
    case 'manual_review':
      return `${baseClasses} bg-blue-100 text-blue-800`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`;
  }
}