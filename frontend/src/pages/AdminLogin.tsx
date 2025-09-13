import React, { useState } from 'react';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { API_BASE_URL } from '../config/api';

export const AdminLogin: React.FC = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        // Store the token and redirect to admin dashboard
        localStorage.setItem('adminToken', data.token);
        window.location.href = '/admin';
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      setError('Login request failed. Please try again.');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="text-center">
            <div className="flex flex-col items-center mb-6">
              <img 
                src="https://bqrhaxpjlvyjekrwggqx.supabase.co/storage/v1/object/public/assets/logo_new.png" 
                alt="Idswyft" 
                className="w-[140px] h-[30px] mb-4"
                onError={(e) => {
                  // Fallback to icon and text if image fails to load
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="hidden items-center mb-4">
                <img 
                  src="https://bqrhaxpjlvyjekrwggqx.supabase.co/storage/v1/object/public/assets/logo_new.png"
                  alt="Idswyft"
                  className="w-[140px] h-[30px]"
                />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Admin Login</h2>
            </div>
            <p className="text-gray-600">Access the Idswyft admin dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="admin@idswyft.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition duration-200"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Development Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="font-semibold text-gray-900 mb-2">Development Access</h3>
            <p className="text-sm text-gray-600 mb-2">
              For testing purposes, you can use:
            </p>
            <div className="text-sm text-gray-700">
              <p><strong>Email:</strong> admin@idswyft.com</p>
              <p><strong>Password:</strong> admin123</p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a href="/" className="text-sm text-blue-600 hover:text-blue-800">
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};