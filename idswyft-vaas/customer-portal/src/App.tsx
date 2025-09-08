import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useSearchParams } from 'react-router-dom';
import VerificationFlow from './components/VerificationFlow';
import VerificationStatus from './components/VerificationStatus';
import ErrorBoundary from './components/ErrorBoundary';
import { OrganizationProvider } from './contexts/OrganizationContext';
import './index.css';

function VerificationPage() {
  const [searchParams] = useSearchParams();
  const sessionToken = searchParams.get('session');
  
  if (!sessionToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Verification Link</h1>
          <p className="text-gray-600">
            The verification link appears to be invalid or expired.
            Please request a new verification link from the organization.
          </p>
        </div>
      </div>
    );
  }

  return <VerificationFlow sessionToken={sessionToken} />;
}

function VerificationPageWithToken() {
  const { token } = useParams<{ token: string }>();
  
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Verification Link</h1>
          <p className="text-gray-600">
            The verification link appears to be invalid or expired.
            Please request a new verification link from the organization.
          </p>
        </div>
      </div>
    );
  }

  return <VerificationFlow sessionToken={token} />;
}

function StatusPage() {
  const [searchParams] = useSearchParams();
  const sessionToken = searchParams.get('session');
  
  if (!sessionToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Status Link</h1>
          <p className="text-gray-600">
            The status link appears to be invalid.
            Please check your verification email or contact support.
          </p>
        </div>
      </div>
    );
  }

  return <VerificationStatus sessionToken={sessionToken} />;
}

function App() {
  return (
    <ErrorBoundary>
      <OrganizationProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Main verification flow - supports both query params and path params */}
              <Route path="/verify" element={<VerificationPage />} />
              <Route path="/verify/:token" element={<VerificationPageWithToken />} />
              
              {/* Verification status page */}
              <Route path="/status" element={<StatusPage />} />
              
              {/* Default/fallback route */}
              <Route path="*" element={
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <div className="text-center max-w-md">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                      Identity Verification Portal
                    </h1>
                    <p className="text-gray-600 mb-6">
                      This is a secure portal for identity verification. 
                      To begin verification, you'll need a verification link provided by the requesting organization.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>Need help?</strong> If you believe you should have access to this verification portal, 
                        please contact the organization that requested your verification.
                      </p>
                    </div>
                  </div>
                </div>
              } />
            </Routes>
          </div>
        </Router>
      </OrganizationProvider>
    </ErrorBoundary>
  );
}

export default App;
