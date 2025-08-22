import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../config/api';

export interface VerificationProps {
  apiKey: string;
  userId: string;
  onComplete?: (result: VerificationResult) => void;
  onRedirect?: (url: string) => void;
  redirectUrl?: string;
  className?: string;
  theme?: 'light' | 'dark';
  allowedDocumentTypes?: ('passport' | 'drivers_license' | 'national_id')[];
}

export interface VerificationResult {
  verification_id: string;
  status: 'verified' | 'failed' | 'manual_review';
  user_id: string;
  confidence_score?: number;
  face_match_score?: number;
  liveness_score?: number;
}

interface Document {
  id: string;
  file_name: string;
  document_type: string;
  ocr_data?: {
    document_number?: string;
    full_name?: string;
    date_of_birth?: string;
    expiry_date?: string;
    nationality?: string;
  };
}

interface VerificationRequest {
  verification_id: string;
  status: 'pending' | 'processing' | 'verified' | 'failed' | 'manual_review';
  documents: Document[];
  live_capture_completed: boolean;
  face_match_score?: number;
  liveness_score?: number;
  confidence_score?: number;
}

const EndUserVerification: React.FC<VerificationProps> = ({
  apiKey,
  userId,
  onComplete,
  onRedirect,
  redirectUrl,
  className = '',
  theme = 'light',
  allowedDocumentTypes = ['passport', 'drivers_license', 'national_id']
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [verificationRequest, setVerificationRequest] = useState<VerificationRequest | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<string>('national_id');

  const themeClasses = {
    light: {
      bg: 'bg-white',
      cardBg: 'bg-white',
      text: 'text-gray-900',
      textSecondary: 'text-gray-600',
      border: 'border-gray-200',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      input: 'border-gray-300 focus:border-blue-500'
    },
    dark: {
      bg: 'bg-gray-900',
      cardBg: 'bg-gray-800',
      text: 'text-white',
      textSecondary: 'text-gray-300',
      border: 'border-gray-700',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      input: 'border-gray-600 focus:border-blue-400 bg-gray-700'
    }
  };

  const styles = themeClasses[theme];

  // Initialize verification
  const startVerification = async () => {
    if (!apiKey || !userId) {
      toast.error('Missing required parameters');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/verify/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ user_id: userId }),
      });

      if (response.ok) {
        const data = await response.json();
        setVerificationId(data.verification_id);
        setCurrentStep(2);
        toast.success('Verification started successfully');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to start verification');
      }
    } catch (error) {
      console.error('Error starting verification:', error);
      toast.error('Failed to start verification');
    } finally {
      setIsLoading(false);
    }
  };

  // Upload document
  const uploadDocument = async () => {
    if (!selectedFile || !verificationId) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('verification_id', verificationId);
      formData.append('document_type', documentType);
      formData.append('document', selectedFile);

      const response = await fetch(`${API_BASE_URL}/api/verify/document`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Document uploaded successfully');
        setCurrentStep(3);
        
        // Start polling for OCR completion
        pollVerificationStatus();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for verification status
  const pollVerificationStatus = async () => {
    if (!verificationId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/verify/results/${verificationId}`, {
        headers: {
          'X-API-Key': apiKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVerificationRequest(data);

        // Check if OCR is complete and we can proceed to live capture
        if (data.documents && data.documents.length > 0 && data.documents[0].ocr_data) {
          setCurrentStep(4); // Move to live capture
        } else if (data.status === 'processing') {
          // Continue polling
          setTimeout(pollVerificationStatus, 2000);
        }
      }
    } catch (error) {
      console.error('Error polling verification status:', error);
    }
  };

  // Complete live capture (redirect to live capture page)
  const startLiveCapture = () => {
    const liveCaptureUrl = `/live-capture?api_key=${apiKey}&verification_id=${verificationId}&user_id=${userId}`;
    window.location.href = liveCaptureUrl;
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  // Check for completion on mount (if coming back from live capture)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const verifyId = urlParams.get('verification_id');

    if (status && verifyId) {
      setVerificationId(verifyId);
      if (status === 'completed') {
        loadFinalResults(verifyId);
      }
    } else {
      // Auto-start verification
      startVerification();
    }
  }, []);

  // Load final results
  const loadFinalResults = async (verifyId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/verify/results/${verifyId}`, {
        headers: {
          'X-API-Key': apiKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVerificationRequest(data);
        setCurrentStep(5);

        // Call completion callback
        if (onComplete) {
          onComplete({
            verification_id: data.verification_id,
            status: data.status,
            user_id: data.user_id,
            confidence_score: data.confidence_score,
            face_match_score: data.face_match_score,
            liveness_score: data.liveness_score
          });
        }

        // Handle redirect after 3 seconds
        if (redirectUrl || onRedirect) {
          setTimeout(() => {
            if (onRedirect) {
              onRedirect(redirectUrl || '/');
            } else if (redirectUrl) {
              window.location.href = redirectUrl;
            }
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Error loading final results:', error);
    }
  };

  // Progress indicator
  const renderProgressIndicator = () => {
    const steps = [
      { step: 1, label: 'Initialize' },
      { step: 2, label: 'Document' },
      { step: 3, label: 'Processing' },
      { step: 4, label: 'Live Capture' },
      { step: 5, label: 'Complete' }
    ];

    return (
      <div className="mb-8">
        {/* Progress bar */}
        <div className="relative">
          <div className={`h-2 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div 
              className="h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            />
          </div>
          
          {/* Step indicators */}
          <div className="flex justify-between absolute -top-2 w-full">
            {steps.map((step) => (
              <div key={step.step} className="relative">
                <div className={`w-6 h-6 rounded-full border-2 transition-all duration-300 ${
                  currentStep >= step.step
                    ? 'bg-blue-500 border-blue-500'
                    : theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600' 
                    : 'bg-white border-gray-300'
                }`}>
                  {currentStep > step.step && (
                    <svg className="w-4 h-4 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {currentStep === step.step && (
                    <div className="w-2 h-2 bg-white rounded-full absolute top-1 left-1 animate-pulse" />
                  )}
                </div>
                
                {/* Step label - only show for current step */}
                {currentStep === step.step && (
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                      {step.label}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Step counter */}
        <div className="text-center mt-12">
          <span className={`text-sm ${styles.textSecondary}`}>
            Step {currentStep} of {steps.length}
          </span>
        </div>
      </div>
    );
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className={`text-2xl font-semibold mb-3 ${styles.text}`}>Starting Verification</h2>
            <p className={`${styles.textSecondary} text-base leading-relaxed`}>
              Please wait while we initialize your verification session...
            </p>
          </div>
        );

      case 2:
        return (
          <div className="py-4">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className={`text-2xl font-semibold mb-3 ${styles.text}`}>Upload Document</h2>
              <p className={`${styles.textSecondary} text-base leading-relaxed`}>
                Please upload a clear photo of your government-issued ID
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className={`block text-sm font-medium mb-3 ${styles.text}`}>
                  Document Type
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border ${styles.input} ${styles.text} focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                >
                  {allowedDocumentTypes.includes('national_id') && (
                    <option value="national_id">National ID</option>
                  )}
                  {allowedDocumentTypes.includes('passport') && (
                    <option value="passport">Passport</option>
                  )}
                  {allowedDocumentTypes.includes('drivers_license') && (
                    <option value="drivers_license">Driver's License</option>
                  )}
                </select>
              </div>

              <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all hover:border-blue-400 ${styles.border}`}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="document-upload"
                />
                <label htmlFor="document-upload" className="cursor-pointer block">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Document preview"
                      className="max-h-48 mx-auto rounded-xl shadow-lg"
                    />
                  ) : (
                    <div className="py-4">
                      <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <p className={`${styles.text} font-medium mb-2`}>Click to upload document</p>
                      <p className={`${styles.textSecondary} text-sm`}>
                        JPG, PNG up to 10MB
                      </p>
                    </div>
                  )}
                </label>
              </div>

              {selectedFile && (
                <button
                  onClick={uploadDocument}
                  disabled={isLoading}
                  className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </span>
                  ) : (
                    'Upload Document'
                  )}
                </button>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="text-center">
            <h2 className={`text-xl font-semibold mb-4 ${styles.text}`}>Processing Document</h2>
            <p className={`${styles.textSecondary} mb-6`}>
              We're analyzing your document. This may take a few moments...
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className={`text-sm ${styles.textSecondary}`}>
              Please don't close this window
            </p>
          </div>
        );

      case 4:
        return (
          <div className="text-center max-w-md mx-auto">
            <h2 className={`text-xl font-semibold mb-4 ${styles.text}`}>Live Photo Capture</h2>
            <p className={`${styles.textSecondary} mb-6`}>
              Now we need to take a live photo to verify your identity
            </p>
            <div className="text-6xl mb-6">📸</div>
            <button
              onClick={startLiveCapture}
              className={`w-full py-3 px-4 rounded-lg font-medium ${styles.button}`}
            >
              Start Live Capture
            </button>
          </div>
        );

      case 5:
        const status = verificationRequest?.status;
        const isVerified = status === 'verified';
        const isFailed = status === 'failed';
        const isManualReview = status === 'manual_review';

        return (
          <div className="text-center max-w-md mx-auto">
            <div className={`text-6xl mb-4 ${
              isVerified ? 'text-green-600' : 
              isFailed ? 'text-red-600' : 
              'text-yellow-600'
            }`}>
              {isVerified ? '✅' : isFailed ? '❌' : '⏳'}
            </div>
            
            <h2 className={`text-xl font-semibold mb-4 ${styles.text}`}>
              {isVerified && 'Verification Successful!'}
              {isFailed && 'Verification Failed'}
              {isManualReview && 'Under Review'}
            </h2>
            
            <p className={`${styles.textSecondary} mb-6`}>
              {isVerified && 'Your identity has been successfully verified.'}
              {isFailed && 'We were unable to verify your identity. Please try again with clearer documents.'}
              {isManualReview && 'Your verification is under manual review. You will be notified of the result.'}
            </p>

            {verificationRequest && (
              <div className={`${styles.cardBg} p-4 rounded-lg text-left ${styles.border} border`}>
                <h3 className={`font-semibold mb-2 ${styles.text}`}>Verification Details:</h3>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className={styles.textSecondary}>Status:</span>
                    <span className={`capitalize ${styles.text}`}>{status}</span>
                  </div>
                  {verificationRequest.face_match_score && (
                    <div className="flex justify-between">
                      <span className={styles.textSecondary}>Face Match:</span>
                      <span className={styles.text}>{Math.round(verificationRequest.face_match_score * 100)}%</span>
                    </div>
                  )}
                  {verificationRequest.liveness_score && (
                    <div className="flex justify-between">
                      <span className={styles.textSecondary}>Liveness:</span>
                      <span className={styles.text}>{Math.round(verificationRequest.liveness_score * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(redirectUrl || onRedirect) && (
              <p className={`text-sm ${styles.textSecondary} mt-4`}>
                Redirecting in 3 seconds...
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} ${className} flex items-center justify-center p-4`}>
      <div className="w-full max-w-lg">
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-xl border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
          <div className="p-8">
            {renderProgressIndicator()}
            {renderStepContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EndUserVerification;