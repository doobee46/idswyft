import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import EndUserVerification from '../components/verification/EndUserVerification';

/**
 * Production-ready verification page for end users
 * This is what developers would embed in their applications
 */
const UserVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get parameters from URL (how developers would pass them)
  const apiKey = searchParams.get('api_key') || process.env.REACT_APP_IDSWYFT_API_KEY || '';
  const userId = searchParams.get('user_id') || '';
  const redirectUrl = searchParams.get('redirect_url') || '';
  const theme = (searchParams.get('theme') as 'light' | 'dark') || 'light';
  const showBackButton = searchParams.get('show_back') !== 'false';

  // Handle verification completion
  const handleVerificationComplete = (result: any) => {
    console.log('Verification completed:', result);
    
    // Example: Send result to parent application
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'VERIFICATION_COMPLETE',
        result
      }, '*');
    }
  };

  // Handle custom redirect
  const handleRedirect = (url: string) => {
    console.log('Redirecting to:', url);
    
    // Example: Custom redirect logic
    setTimeout(() => {
      window.location.href = url;
    }, 1500);
  };

  // Handle back button
  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      window.close();
    }
  };

  // Validation
  if (!apiKey || !userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Custom Back Button */}
        {showBackButton && (
          <div className="absolute top-6 left-6 z-10">
            <button
              onClick={handleGoBack}
              className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm text-gray-700 rounded-xl shadow-lg border border-white/20 hover:bg-white/90 hover:shadow-xl transition-all duration-200 group"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
              Back
            </button>
          </div>
        )}
        
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="max-w-md w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Missing Required Parameters
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              This verification page requires an API key and user ID to function properly.
            </p>
            <div className="bg-gray-50/80 rounded-xl p-4 text-sm text-gray-600 space-y-3">
              <div>
                <p className="font-medium text-gray-900 mb-2">Required URL parameters:</p>
                <ul className="space-y-1 text-left">
                  <li className="flex items-center"><code className="bg-white px-2 py-1 rounded text-xs font-mono">api_key</code><span className="ml-2">Your API key</span></li>
                  <li className="flex items-center"><code className="bg-white px-2 py-1 rounded text-xs font-mono">user_id</code><span className="ml-2">User identifier</span></li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-2">Optional parameters:</p>
                <ul className="space-y-1 text-left">
                  <li className="flex items-center"><code className="bg-white px-2 py-1 rounded text-xs font-mono">redirect_url</code><span className="ml-2">Redirect destination</span></li>
                  <li className="flex items-center"><code className="bg-white px-2 py-1 rounded text-xs font-mono">theme</code><span className="ml-2">light or dark</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Custom Back Button */}
      {showBackButton && (
        <div className="absolute top-6 left-6 z-50">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm text-gray-700 rounded-xl shadow-lg border border-white/20 hover:bg-white/90 hover:shadow-xl transition-all duration-200 group"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
        </div>
      )}
      
      {/* Verification Component */}
      <EndUserVerification
        apiKey={apiKey}
        userId={userId}
        redirectUrl={redirectUrl}
        theme={theme}
        onComplete={handleVerificationComplete}
        onRedirect={handleRedirect}
        allowedDocumentTypes={['passport', 'drivers_license', 'national_id']}
      />
    </div>
  );
};

export default UserVerificationPage;