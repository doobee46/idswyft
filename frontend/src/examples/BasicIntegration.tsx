import React, { useState } from 'react';
import EndUserVerification from '../components/verification/EndUserVerification';

/**
 * Basic Integration Example
 * 
 * This shows how developers can integrate the verification component
 * into their existing React applications.
 */
const BasicIntegrationExample: React.FC = () => {
  const [showVerification, setShowVerification] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  
  // Your API configuration
  const API_KEY = process.env.REACT_APP_IDSWYFT_API_KEY || 'your-api-key';
  const currentUser = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com'
  };

  const handleStartVerification = () => {
    setShowVerification(true);
    setVerificationResult(null);
  };

  const handleVerificationComplete = (result: any) => {
    console.log('Verification completed:', result);
    setVerificationResult(result);
    
    // Example: Update user status in your backend
    updateUserVerificationStatus(result);
    
    // Example: Redirect to dashboard after 3 seconds
    setTimeout(() => {
      setShowVerification(false);
      // Navigate to dashboard or next step
    }, 3000);
  };

  const updateUserVerificationStatus = async (result: any) => {
    try {
      // Example API call to your backend
      const response = await fetch('/api/users/update-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: result.user_id,
          verificationId: result.verification_id,
          status: result.status,
          scores: {
            confidence: result.confidence_score,
            faceMatch: result.face_match_score,
            liveness: result.liveness_score
          }
        })
      });
      
      if (response.ok) {
        console.log('User verification status updated successfully');
      }
    } catch (error) {
      console.error('Failed to update user verification status:', error);
    }
  };

  if (showVerification) {
    return (
      <EndUserVerification
        apiKey={API_KEY}
        userId={currentUser.id}
        theme="light"
        onComplete={handleVerificationComplete}
        allowedDocumentTypes={['passport', 'drivers_license', 'national_id']}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">🛡️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Identity Verification Required
          </h2>
          <p className="text-gray-600 mb-6">
            Hi {currentUser.name}, we need to verify your identity to continue.
            This process takes just a few minutes.
          </p>
          
          <div className="space-y-4">
            <div className="text-left">
              <h3 className="font-medium text-gray-900 mb-2">What you'll need:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Government-issued ID (passport, driver's license, or national ID)</li>
                <li>• Camera access for live photo capture</li>
                <li>• 2-3 minutes of your time</li>
              </ul>
            </div>
            
            <button
              onClick={handleStartVerification}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Start Verification
            </button>
            
            <p className="text-xs text-gray-500">
              Your personal information is encrypted and securely processed.
            </p>
          </div>
        </div>
        
        {verificationResult && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-medium text-green-900 mb-1">Verification Complete!</h3>
            <p className="text-sm text-green-700">
              Status: {verificationResult.status}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BasicIntegrationExample;