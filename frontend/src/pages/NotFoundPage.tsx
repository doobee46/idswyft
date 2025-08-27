import React from 'react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="text-6xl font-bold text-gray-400 mb-4">404</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h1>
          <p className="text-gray-600 mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          <div className="space-y-3">
            <a
              href="/"
              className="block w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition duration-200"
            >
              Go to Home
            </a>
            
            <div className="text-sm text-gray-500">
              Or try one of these pages:
            </div>
            
            <div className="flex flex-col space-y-2 text-sm">
              <a href="/developer" className="text-blue-600 hover:text-blue-800">
                Developer Portal
              </a>
              <a href="/demo" className="text-blue-600 hover:text-blue-800">
                Interactive Demo
              </a>
              <a href="/docs" className="text-blue-600 hover:text-blue-800">
                API Documentation
              </a>
              <a href="/admin/login" className="text-blue-600 hover:text-blue-800">
                Admin Login
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};