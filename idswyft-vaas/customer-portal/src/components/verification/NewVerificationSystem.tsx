// New clean verification system component
import React, { useState, useEffect } from 'react';
import { VerificationStep, VerificationStatus, VerificationState } from '../../types/verification';
import { VerificationSession } from '../../types';
import { VerificationStateManager } from './VerificationStateManager';
import { VerificationController } from './VerificationController';
import { VerificationStepComponent } from './VerificationStepComponent';
import customerPortalAPI from '../../services/api';

interface NewVerificationSystemProps {
  sessionToken: string;
}

export const NewVerificationSystem: React.FC<NewVerificationSystemProps> = ({ sessionToken }) => {
  const [session, setSession] = useState<VerificationSession | null>(null);
  const [stateManager] = useState(() => new VerificationStateManager(sessionToken));
  const [controller] = useState(() => new VerificationController(stateManager));
  const [verificationState, setVerificationState] = useState<VerificationState>(stateManager.getState());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize session and verification
  useEffect(() => {
    const initializeSession = async () => {
      try {
        console.log('🔄 Initializing verification session...');
        setLoading(true);
        setError(null);

        // Get session details
        const sessionData = await customerPortalAPI.getVerificationSession(sessionToken);
        setSession(sessionData);
        controller.setSession(sessionData);

        console.log('✅ Session initialized:', sessionData);

        // Start verification flow
        await controller.startVerification();

      } catch (err) {
        console.error('❌ Session initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize session');
      } finally {
        setLoading(false);
      }
    };

    initializeSession();
  }, [sessionToken, controller]);

  // Listen to state changes
  useEffect(() => {
    const handleStateUpdate = (newState: VerificationState) => {
      setVerificationState(newState);
      console.log('📊 State updated:', newState.currentStep, newState.status);
    };

    stateManager.addListener(handleStateUpdate);

    return () => {
      stateManager.removeListener(handleStateUpdate);
    };
  }, [stateManager]);

  // Handle file uploads
  const handleFrontDocumentUpload = async (file: File, documentType: string) => {
    try {
      await controller.uploadFrontDocument(file, documentType);
    } catch (err) {
      console.error('Front document upload failed:', err);
    }
  };

  const handleBackDocumentUpload = async (file: File, documentType: string) => {
    try {
      await controller.uploadBackDocument(file, documentType);
    } catch (err) {
      console.error('Back document upload failed:', err);
    }
  };

  const handleLiveCapture = async (imageData: string) => {
    try {
      await controller.captureLiveSelfie(imageData);
    } catch (err) {
      console.error('Live capture failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing verification session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Initialization Error</h3>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Identity Verification</h1>
        <p className="text-gray-600">Complete the verification process to continue</p>

        {/* Progress indicator */}
        <div className="mt-4">
          <div className="flex items-center space-x-2 text-sm">
            <span className="font-medium">Step:</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
              {verificationState.currentStep.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
            <span className="font-medium">Status:</span>
            <span className={`px-2 py-1 rounded ${
              verificationState.status === VerificationStatus.VERIFIED ? 'bg-green-100 text-green-800' :
              verificationState.status === VerificationStatus.FAILED ? 'bg-red-100 text-red-800' :
              verificationState.status === VerificationStatus.PROCESSING ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {verificationState.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </div>
        </div>
      </div>

      {/* Error display */}
      {verificationState.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="text-red-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Verification Error</h3>
              <p className="text-sm text-red-700 mt-1">{verificationState.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main verification step component */}
      <VerificationStepComponent
        state={verificationState}
        session={session}
        onFrontDocumentUpload={handleFrontDocumentUpload}
        onBackDocumentUpload={handleBackDocumentUpload}
        onLiveCapture={handleLiveCapture}
      />

      {/* Debug info (development only) */}
      {import.meta.env.DEV && (
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Debug Info</h3>
          <pre className="text-xs text-gray-600 whitespace-pre-wrap">
            {JSON.stringify(verificationState, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};