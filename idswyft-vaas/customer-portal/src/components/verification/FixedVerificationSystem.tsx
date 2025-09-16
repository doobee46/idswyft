// Fixed verification system with enhanced camera handling
import React, { useState, useEffect } from 'react';
import { VerificationStep, VerificationStatus, VerificationState } from '../../types/verification';
import { VerificationSession } from '../../types';
import { VerificationStateManager } from './VerificationStateManager';
import { VerificationController } from './VerificationController';
import { VerificationStepComponent } from './VerificationStepComponentFixed';
import customerPortalAPI from '../../services/api';
import { useOrganization } from '../../contexts/OrganizationContext';
import BrandedHeader from '../BrandedHeader';

interface FixedVerificationSystemProps {
  sessionToken: string;
}

export const FixedVerificationSystem: React.FC<FixedVerificationSystemProps> = ({ sessionToken }) => {
  const [session, setSession] = useState<VerificationSession | null>(null);
  const [stateManager] = useState(() => new VerificationStateManager(sessionToken));
  const [controller] = useState(() => new VerificationController(stateManager));
  const [verificationState, setVerificationState] = useState<VerificationState>(stateManager.getState());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Organization branding context
  const { setBranding, setOrganizationName } = useOrganization();

  // Initialize session and verification
  useEffect(() => {
    const initializeSession = async () => {
      try {
        console.log('🔄 Initializing verification session with fixed camera handling...');
        setLoading(true);
        setError(null);

        // Get session details
        const sessionData = await customerPortalAPI.getVerificationSession(sessionToken);
        setSession(sessionData);
        controller.setSession(sessionData);

        // Apply organization branding
        if (sessionData.organization) {
          setOrganizationName(sessionData.organization.name);
          if (sessionData.organization.branding) {
            setBranding(sessionData.organization.branding);
          }
        }

        console.log('✅ Session initialized:', sessionData);

        // Start verification flow
        await controller.startVerification();

      } catch (err) {
        console.error('❌ Session initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize verification session');
      } finally {
        setLoading(false);
      }
    };

    if (sessionToken) {
      initializeSession();
    }
  }, [sessionToken]);

  // Subscribe to verification state changes
  useEffect(() => {
    const unsubscribe = stateManager.subscribe((newState) => {
      console.log('🔄 Verification state updated:', newState);
      setVerificationState(newState);
    });

    return unsubscribe;
  }, [stateManager]);

  // Handle front document upload
  const handleFrontDocumentUpload = async (file: File, documentType: string) => {
    console.log('📄 Uploading front document:', { filename: file.name, type: documentType });
    try {
      await controller.uploadDocument('front', file, documentType);
    } catch (error) {
      console.error('Front document upload failed:', error);
      setError('Failed to upload front document. Please try again.');
      throw error;
    }
  };

  // Handle back document upload
  const handleBackDocumentUpload = async (file: File, documentType: string) => {
    console.log('📄 Uploading back document:', { filename: file.name, type: documentType });
    try {
      await controller.uploadDocument('back', file, documentType);
    } catch (error) {
      console.error('Back document upload failed:', error);
      setError('Failed to upload back document. Please try again.');
      throw error;
    }
  };

  // Handle live capture with enhanced error handling
  const handleLiveCapture = async (imageData: string) => {
    console.log('📸 Processing live capture...');
    try {
      await controller.performLiveCapture(imageData);
    } catch (error) {
      console.error('Live capture failed:', error);
      setError('Failed to process live capture. Please try again.');
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <BrandedHeader />
        <div className="max-w-2xl mx-auto p-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Initializing verification...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-gray-50">
        <BrandedHeader />
        <div className="max-w-2xl mx-auto p-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center py-12">
              <div className="text-red-600 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Verification Error</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <BrandedHeader />
      <div className="max-w-2xl mx-auto p-4">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-sm text-red-600 underline hover:text-red-500"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        <VerificationStepComponent
          state={verificationState}
          session={session}
          onFrontDocumentUpload={handleFrontDocumentUpload}
          onBackDocumentUpload={handleBackDocumentUpload}
          onLiveCapture={handleLiveCapture}
        />

        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 bg-gray-100 rounded-lg p-4 text-xs text-gray-600">
            <details>
              <summary className="cursor-pointer font-medium">Debug Info</summary>
              <div className="mt-2 space-y-1">
                <div>Current Step: {verificationState.currentStep}</div>
                <div>Status: {verificationState.status}</div>
                <div>Session ID: {session?.sessionId}</div>
                <div>Organization: {session?.organization?.name}</div>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default FixedVerificationSystem;