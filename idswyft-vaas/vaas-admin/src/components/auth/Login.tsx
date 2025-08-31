import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { LoginRequest } from '../../types.js';

export default function Login() {
  const { login, isAuthenticated, loading, error } = useAuth();
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
    organization_slug: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await login(formData);
    } catch (err) {
      // Error is handled by the auth context
      console.error('Login failed:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-900 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-600" />
            </div>
            <span className="text-2xl font-bold text-white">Idswyft VaaS</span>
          </div>
          
          <div className="mt-12">
            <h1 className="text-4xl font-bold text-white mb-4">
              Enterprise Identity Verification Platform
            </h1>
            <p className="text-xl text-primary-100">
              Secure, scalable, and compliant identity verification solutions for your business.
            </p>
          </div>
        </div>

        <div className="space-y-4 text-primary-100">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-primary-300 rounded-full"></div>
            <span>Multi-tenant organization management</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-primary-300 rounded-full"></div>
            <span>Real-time verification monitoring</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-primary-300 rounded-full"></div>
            <span>Comprehensive webhook system</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-primary-300 rounded-full"></div>
            <span>Advanced analytics and reporting</span>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="lg:hidden flex items-center justify-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">Idswyft VaaS</span>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-600 mt-2">Sign in to your admin dashboard</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="form-label">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`form-input ${validationErrors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="admin@company.com"
                value={formData.email}
                onChange={handleChange}
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className={`form-input pr-10 ${validationErrors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="organization_slug" className="form-label">
                Organization (Optional)
              </label>
              <input
                id="organization_slug"
                name="organization_slug"
                type="text"
                autoComplete="organization"
                className="form-input"
                placeholder="your-company-slug"
                value={formData.organization_slug}
                onChange={handleChange}
              />
              <p className="mt-1 text-sm text-gray-500">
                Leave blank if you belong to only one organization
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary py-3 text-base"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Need help?</span>
              </div>
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              Contact your organization administrator or{' '}
              <a href="mailto:support@idswyft.app" className="text-primary-600 hover:text-primary-500">
                support@idswyft.app
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}