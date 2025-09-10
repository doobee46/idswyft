import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Upload, 
  Camera, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  User, 
  Loader,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Clock
} from 'lucide-react';
import { VerificationSession } from '../types';
import customerPortalAPI from '../services/api';
import verificationAPI from '../services/verificationApi';
import { useOrganization } from '../contexts/OrganizationContext';
import BrandedHeader from './BrandedHeader';
import LiveCaptureComponent from './LiveCaptureComponent';


interface VerificationFlowProps {
  sessionToken: string;
}

type VerificationStep = 'welcome' | 'document-upload' | 'document-processing' | 'identity-verification' | 'complete' | 'error';

const VerificationFlow: React.FC<VerificationFlowProps> = ({ sessionToken }) => {
  const [session, setSession] = useState<VerificationSession | null>(null);
  const [currentStep, setCurrentStep] = useState<VerificationStep>('welcome');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documents, setDocuments] = useState<{
    front?: File;
    back?: File;
    selfie?: File;
  }>({});
  const [documentType, setDocumentType] = useState<string>('');
  const [ocrData, setOcrData] = useState<any>(null);
  const [backOfIdUploaded, setBackOfIdUploaded] = useState(false);
  const [showLiveCapture, setShowLiveCapture] = useState(false);
  const [finalStatus, setFinalStatus] = useState<'verified' | 'manual_review' | 'pending' | 'failed' | null>(null);
  const [sessionTerminated, setSessionTerminated] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [showFailureFeedback, setShowFailureFeedback] = useState(false);

  // Organization context for branding
  const { setBranding, setOrganizationName } = useOrganization();

  // File input refs
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSession();
  }, [sessionToken]);

  // Auto-terminate session when verification completes
  useEffect(() => {
    if (currentStep === 'complete' && finalStatus && !sessionTerminated) {
      setTimeout(() => {
        terminateSession();
      }, 5000); // Wait 5 seconds before terminating to show results
    }
  }, [currentStep, finalStatus, sessionTerminated]);

  const loadSession = async () => {
    try {
      setLoading(true);
      const sessionData = await customerPortalAPI.getVerificationSession(sessionToken);
      setSession(sessionData);
      
      // Apply organization branding
      if (sessionData.organization?.branding) {
        setBranding(sessionData.organization.branding);
      }
      setOrganizationName(sessionData.organization?.name || 'Unknown Organization');
      
      // Determine starting step based on session status
      if (sessionData.status === 'expired' || sessionData.status === 'terminated') {
        setCurrentStep('error');
        setError(sessionData.status === 'terminated' 
          ? 'This verification session has been completed and is no longer active.'
          : 'This verification session has expired. Please request a new verification link.');
        setSessionTerminated(true);
      } else if (sessionData.status === 'completed') {
        setCurrentStep('complete');
      } else if (sessionData.status === 'processing') {
        setCurrentStep('document-processing');
      }
    } catch (error: any) {
      console.error('Failed to load session:', error);
      let userMessage = 'Failed to load verification session. Please try again.';
      
      if (error.response?.status === 404) {
        userMessage = 'Verification session not found. Please check your link or request a new one.';
      } else if (error.response?.status === 410) {
        // Check for specific expiration/termination codes
        const errorCode = error.response?.data?.error?.code;
        if (errorCode === 'SESSION_EXPIRED') {
          userMessage = 'This verification session has expired. Please request a new verification link.';
        } else if (errorCode === 'SESSION_TERMINATED') {
          userMessage = error.response.data.error.message || 'This verification has been completed successfully. The session link is now inactive for security.';
          setSessionTerminated(true);
        } else {
          userMessage = 'This verification session has expired. Please request a new verification link.';
        }
      } else if (error.message.includes('No API key configured')) {
        userMessage = 'Verification service is not properly configured. Please contact support.';
      } else if (error.message.includes('Invalid API key')) {
        userMessage = 'Verification service configuration error. Please contact support.';
      } else if (error.message.includes('network') || error.message.includes('Network')) {
        userMessage = 'Network connection issue. Please check your internet and try again.';
      }
      
      setError(userMessage);
      setCurrentStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (file: File) => {
    if (!session || !documentType) return;

    try {
      setUploadProgress(0);
      
      // Start verification session if not already started
      let currentVerificationId = verificationId;
      if (!currentVerificationId) {
        console.log('Starting new verification session...');
        currentVerificationId = await verificationAPI.startVerification(session);
        setVerificationId(currentVerificationId);
        console.log('Started verification session:', currentVerificationId);
      }

      // Upload document to real verification API
      console.log('Uploading document to verification API...');
      await verificationAPI.uploadDocument(
        session,
        currentVerificationId,
        file,
        documentType,
        (progress) => setUploadProgress(progress)
      );

      setDocuments(prev => ({ ...prev, front: file }));
      setCurrentStep('document-processing');
      
      // Start polling for OCR results from real API
      pollForOCRResults(currentVerificationId);
      
      setUploadProgress(0);
    } catch (error: any) {
      console.error('Failed to upload document:', error);
      let userMessage = 'Failed to upload document. Please try again.';
      
      if (error.message.includes('No API key configured')) {
        userMessage = error.message;
      } else if (error.message.includes('Invalid API key')) {
        userMessage = error.message;
      } else if (error.message.includes('too large')) {
        userMessage = 'The document file is too large. Please use a smaller image (max 10MB).';
      } else if (error.message.includes('network') || error.message.includes('Network')) {
        userMessage = 'Network connection issue. Please check your internet and try again.';
      }
      
      setError(userMessage);
      setUploadProgress(0);
    }
  };

  const handleBackOfIdUpload = async (file: File) => {
    if (!session || !verificationId) return;

    try {
      await verificationAPI.uploadBackOfId(
        session,
        verificationId,
        file,
        documentType,
        (progress) => setUploadProgress(progress)
      );

      setDocuments(prev => ({ ...prev, back: file }));
      setBackOfIdUploaded(true);
      setUploadProgress(0);
    } catch (error: any) {
      console.error('Failed to upload back of ID:', error);
      setError(error.message || 'Failed to upload back of ID. Please try again.');
      setUploadProgress(0);
    }
  };

  const handleSelfieCapture = async (imageData: string) => {
    if (!session || !verificationId) return;

    try {
      setUploadProgress(0);
      await verificationAPI.captureLiveSelfie(
        session,
        verificationId,
        imageData,
        (progress) => setUploadProgress(progress)
      );

      // Hide live capture interface
      setShowLiveCapture(false);
      await submitVerification();
      setUploadProgress(0);
    } catch (error: any) {
      console.error('Failed to upload selfie:', error);
      setError(error.message || 'Failed to capture selfie. Please try again.');
      setUploadProgress(0);
      setShowLiveCapture(false);
    }
  };

  const pollForOCRResults = (verificationId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const results = await verificationAPI.getResults(session!, verificationId);
        
        // Check if OCR processing is complete
        if (results.ocr_data && Object.keys(results.ocr_data).length > 0) {
          clearInterval(pollInterval);
          setOcrData(results.ocr_data);
          setCurrentStep('identity-verification');
        } else if (results.status === 'completed' || results.status === 'failed') {
          // If verification completed but no OCR data, still proceed
          clearInterval(pollInterval);
          setOcrData({
            full_name: 'Document processed',
            document_number: 'Ready for identity verification'
          });
          setCurrentStep('identity-verification');
        }
      } catch (error) {
        console.error('OCR polling error:', error);
      }
    }, 3000); // Poll every 3 seconds

    // Clear interval after 60 seconds
    setTimeout(() => clearInterval(pollInterval), 60000);
  };

  const submitVerification = async () => {
    if (!verificationId) {
      setError('No verification session found. Please try again.');
      setCurrentStep('error');
      return;
    }

    try {
      setCurrentStep('document-processing');
      
      // The verification is automatically processed after all uploads
      // Start polling for final results
      pollVerificationStatus(verificationId);
    } catch (error: any) {
      console.error('Failed to submit verification:', error);
      setError('Failed to process verification. Please try again.');
      setCurrentStep('error');
    }
  };

  const pollVerificationStatus = async (verificationId: string) => {
    const maxAttempts = 20; // ~3 minutes max with 10s intervals
    let attempts = 0;
    
    const poll = async () => {
      try {
        const results = await verificationAPI.getResults(session!, verificationId);
        const status = results.status;
        
        console.log('Polling verification status:', status, 'attempt:', attempts + 1);
        
        // Check for failure reason during polling
        if (results.failure_reason && !showFailureFeedback) {
          setFailureReason(results.failure_reason);
          setShowFailureFeedback(true);
        }
        
        // Handle verification status directly from backend
        if (status === 'verified') {
          setFinalStatus('verified');
          setCurrentStep('complete');
        } else if (status === 'completed') {
          // Legacy support: determine final status based on results if still using 'completed'
          if (results.confidence_score && results.confidence_score >= 0.8) {
            setFinalStatus('verified');
          } else if (results.confidence_score && results.confidence_score >= 0.6) {
            setFinalStatus('manual_review');
          } else {
            setFinalStatus('pending');
          }
          setCurrentStep('complete');
        } else if (status === 'failed') {
          if (results.failure_reason) {
            setFailureReason(results.failure_reason);
          }
          setFinalStatus('failed');
          setCurrentStep('complete');
        } else if (status === 'manual_review') {
          setFinalStatus('manual_review');
          setCurrentStep('complete');
        } else if (attempts < maxAttempts && (status === 'processing' || status === 'pending')) {
          attempts++;
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else {
          // Timeout - treat as pending for manual review
          setFinalStatus('pending');
          setCurrentStep('complete');
        }
      } catch (error) {
        console.error('Failed to check verification status:', error);
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 10000);
        } else {
          setError('Failed to check verification status. Please contact support.');
          setCurrentStep('error');
        }
      }
    };
    
    // Start polling immediately
    poll();
  };

  const terminateSession = async () => {
    try {
      console.log('Terminating session:', sessionToken);
      await customerPortalAPI.terminateVerificationSession(sessionToken);
      setSessionTerminated(true);
      
      // Show termination message and disable all interactions
      setCurrentStep('error');
      setError('This verification has been completed successfully. The session link is now inactive for security.');
    } catch (error) {
      console.error('Failed to terminate session:', error);
      // Even if termination fails on the server, mark as terminated locally
      setSessionTerminated(true);
    }
  };

  const renderProgressBar = () => {
    const steps = ['welcome', 'document-upload', 'document-processing', 'identity-verification', 'complete'];
    const stepLabels = ['Start', 'Upload', 'Process', 'Verify', 'Complete'];
    
    const currentIndex = steps.indexOf(currentStep);
    const progress = currentIndex >= 0 ? ((currentIndex + 1) / steps.length) * 100 : 0;

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-semibold text-sm ${
                step <= currentIndex + 1
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs sm:text-sm text-gray-600">
          {stepLabels.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading verification session...</p>
        </div>
      </div>
    );
  }

  if (currentStep === 'error' || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <div className="card p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Verification Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Branded Header */}
        <BrandedHeader className="mb-6" />

        {/* Progress Bar */}
        {renderProgressBar()}

        {/* Step Content */}
        <div className="card p-6">
          {currentStep === 'welcome' && (
            <WelcomeStep 
              session={session} 
              onNext={() => setCurrentStep('document-upload')} 
            />
          )}
          
          {currentStep === 'document-upload' && (
            <DocumentUploadStep
              session={session}
              documentType={documentType}
              setDocumentType={setDocumentType}
              onFileSelect={handleDocumentUpload}
              uploadProgress={uploadProgress}
              inputRef={frontInputRef}
            />
          )}

          {currentStep === 'document-processing' && (
            <>
              <DocumentProcessingStep />
              {showFailureFeedback && failureReason && (
                <FailureFeedbackAlert 
                  failureReason={failureReason}
                  onDismiss={() => setShowFailureFeedback(false)}
                  onRetry={() => {
                    setShowFailureFeedback(false);
                    setFailureReason(null);
                    setCurrentStep('document-upload');
                  }}
                />
              )}
            </>
          )}

          {currentStep === 'identity-verification' && (
            <>
              {!showLiveCapture && (
                <>
                  <IdentityVerificationStep
                    session={session}
                    ocrData={ocrData}
                    backOfIdUploaded={backOfIdUploaded}
                    showLiveCapture={showLiveCapture}
                    onBackOfIdUpload={handleBackOfIdUpload}
                    onStartLiveCapture={() => setShowLiveCapture(true)}
                    uploadProgress={uploadProgress}
                  />
                  {showFailureFeedback && failureReason && (
                    <FailureFeedbackAlert 
                      failureReason={failureReason}
                      onDismiss={() => setShowFailureFeedback(false)}
                      onRetry={() => {
                        setShowFailureFeedback(false);
                        setFailureReason(null);
                        setCurrentStep('document-upload');
                      }}
                    />
                  )}
                </>
              )}
              
              {showLiveCapture && (
                <LiveCaptureComponent
                  onCapture={handleSelfieCapture}
                  onCancel={() => setShowLiveCapture(false)}
                  isLoading={uploadProgress > 0}
                />
              )}
            </>
          )}

          {currentStep === 'complete' && (
            <CompleteStep finalStatus={finalStatus} session={session} />
          )}
        </div>
      </div>
    </div>
  );
};

// Individual Step Components (Demo-style)
const WelcomeStep: React.FC<{ session: VerificationSession; onNext: () => void }> = ({ session, onNext }) => {
  const welcomeMessage = session.organization?.branding?.welcome_message || 
    "We need to verify your identity to proceed. This process is secure and typically takes just a few minutes.";

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Shield className="w-8 h-8 text-primary-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Identity Verification</h2>
      <p className="text-gray-600 mb-6">
        {welcomeMessage}
      </p>
    
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
        <h3 className="font-medium text-blue-900 mb-2">What you'll need:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Government-issued photo ID (passport, driver's license, etc.)</li>
          {session.verification_settings.require_back_of_id && <li>• Both front and back of your ID</li>}
          <li>• A clear photo of yourself (selfie)</li>
          {session.verification_settings.require_liveness && <li>• Device with camera for liveness detection</li>}
        </ul>
      </div>
    
      <button onClick={onNext} className="btn btn-primary w-full">
        Start Verification
        <ArrowRight className="w-4 h-4 ml-2" />
      </button>
    </div>
  );
};

const DocumentUploadStep: React.FC<{
  session: VerificationSession;
  documentType: string;
  setDocumentType: (type: string) => void;
  onFileSelect: (file: File) => void;
  uploadProgress: number;
  inputRef: React.RefObject<HTMLInputElement>;
}> = ({ session, documentType, setDocumentType, onFileSelect, uploadProgress, inputRef }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a JPEG, PNG, or PDF file');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !documentType) {
      alert(documentType ? 'Please select a file first' : 'Please select a document type');
      return;
    }
    onFileSelect(selectedFile);
  };

  return (
    <div className="py-8">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-center">Upload Your ID Document</h2>
      <p className="text-gray-600 mb-6 text-center">
        Please upload a clear photo of your government-issued ID (passport, driver's license, or national ID).
      </p>

      <div className="space-y-6">
        {/* Document Type Selection */}
        <div className="max-w-md mx-auto">
          <label htmlFor="document-type" className="block text-sm font-medium text-gray-700 mb-2">
            Document Type
          </label>
          <select
            id="document-type"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <option value="">Select document type</option>
            <option value="national_id">National ID</option>
            <option value="drivers_license">Driver's License</option>
            <option value="passport">Passport</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="document-upload"
          />
          <label
            htmlFor="document-upload"
            className="cursor-pointer block"
          >
            <div className="text-gray-400 mb-4">
              <Upload className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-600">
              Click to upload or drag and drop
            </p>
            <p className="text-sm text-gray-400 mt-2">
              JPEG, PNG or PDF (max 10MB)
            </p>
          </label>
        </div>

        {selectedFile && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            {previewUrl && (
              <div className="mt-4">
                <img
                  src={previewUrl}
                  alt="Document preview"
                  className="w-full h-48 object-contain bg-white rounded border"
                />
              </div>
            )}
          </div>
        )}

        {selectedFile && (
          <button
            onClick={handleUpload}
            disabled={uploadProgress > 0 || !documentType}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploadProgress > 0 ? 'Uploading...' : 'Upload Document'}
          </button>
        )}
        
        {selectedFile && !documentType && (
          <p className="text-red-600 text-sm text-center">
            Please select a document type before uploading.
          </p>
        )}

        {uploadProgress > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DocumentProcessingStep: React.FC = () => (
  <div className="text-center py-8">
    <h2 className="text-xl sm:text-2xl font-bold mb-4">Processing Document</h2>
    <div className="flex justify-center mb-6">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
    <p className="text-gray-600">
      We're extracting information from your document using OCR and PDF417 barcode scanning. This may take a few moments...
    </p>
  </div>
);

const IdentityVerificationStep: React.FC<{
  session: VerificationSession;
  ocrData: any;
  backOfIdUploaded: boolean;
  showLiveCapture: boolean;
  onBackOfIdUpload: (file: File) => void;
  onStartLiveCapture: () => void;
  uploadProgress: number;
}> = ({ 
  session, 
  ocrData, 
  backOfIdUploaded, 
  showLiveCapture, 
  onBackOfIdUpload, 
  onStartLiveCapture,
  uploadProgress 
}) => {
  const backInputRef = useRef<HTMLInputElement>(null);

  const handleBackOfIdSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onBackOfIdUpload(file);
    }
  };

  return (
    <div className="py-8">
      <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center">Document Information & Verification</h2>
      
      {ocrData && Object.keys(ocrData).length > 0 ? (
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h3 className="font-semibold mb-4">Extracted Information:</h3>
          <div className="space-y-2 text-sm">
            {ocrData.full_name && (
              <div className="flex justify-between">
                <span className="text-gray-600">Full Name:</span>
                <span className="font-medium">{ocrData.full_name}</span>
              </div>
            )}
            {ocrData.document_number && (
              <div className="flex justify-between">
                <span className="text-gray-600">Document Number:</span>
                <span className="font-medium">{ocrData.document_number}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
          <p className="text-yellow-800">
            Document information processed successfully.
          </p>
        </div>
      )}

      {/* Back-of-ID Upload Section */}
      {!backOfIdUploaded && session.verification_settings.require_back_of_id && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Upload Back of ID</h3>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              ref={backInputRef}
              type="file"
              accept="image/*"
              onChange={handleBackOfIdSelect}
              className="hidden"
              id="back-upload"
            />
            <label htmlFor="back-upload" className="cursor-pointer block">
              <FileText className="w-8 h-8 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Click to upload back of ID</p>
              <p className="text-sm text-gray-400">For enhanced verification</p>
            </label>
          </div>
        </div>
      )}

      {backOfIdUploaded && (
        <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-green-800">
            <CheckCircle className="w-5 w-5" />
            <span className="font-medium">Enhanced Verification Complete</span>
          </div>
          <p className="mt-1 text-green-700 text-sm">
            Back-of-ID successfully processed with PDF417 barcode scanning, QR code detection, and cross-validation against front-of-ID data.
          </p>
        </div>
      )}

      {/* Live Capture or Selfie Upload - Only show after back-of-ID is uploaded */}
      {backOfIdUploaded && (
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4">Identity Verification</h3>
          <p className="text-gray-600 mb-6">
            Now we need to verify that you're the person in the document using live capture with liveness detection.
          </p>
          
          <div className="space-y-4">
            <button
              onClick={onStartLiveCapture}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Camera className="h-5 w-5" />
              <span>Start Live Capture with Liveness Detection</span>
            </button>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
              <div className="flex items-center space-x-2 text-yellow-800">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="font-medium">Liveness Detection Required</span>
              </div>
              <p className="mt-1 text-yellow-700">
                Live capture with liveness detection is mandatory for enterprise verification security. This ensures you are a real person and not a photo or video.
              </p>
            </div>
          </div>
        </div>
      )}

      {uploadProgress > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Processing...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Instructions when back-of-ID is not uploaded yet */}
      {!backOfIdUploaded && (
        <div className="text-center bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="text-blue-600 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Next Step: Upload Back-of-ID</h3>
          <p className="text-blue-700 text-sm">
            Please upload the back of your ID above for enhanced verification with PDF417 barcode scanning before proceeding to live capture with liveness detection.
          </p>
        </div>
      )}
    </div>
  );
};

// Removed ProcessingStep - using DocumentProcessingStep instead

const CompleteStep: React.FC<{ finalStatus: string | null; session: VerificationSession }> = ({ finalStatus, session }) => {
  const getStatusDisplay = () => {
    switch (finalStatus) {
      case 'verified':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-600',
          bgColor: 'bg-green-100',
          title: 'Verification Successful',
          message: session.organization?.branding?.success_message || 
            "Your identity has been successfully verified. You can now close this window.",
          statusColor: 'bg-green-50 border-green-200',
          statusText: 'text-green-800'
        };
      case 'manual_review':
        return {
          icon: Clock,
          iconColor: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          title: 'Manual Review Required',
          message: 'Your verification is under review. You will be notified of the results within 24-48 hours.',
          statusColor: 'bg-yellow-50 border-yellow-200',
          statusText: 'text-yellow-800'
        };
      case 'failed':
        return {
          icon: AlertCircle,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-100',
          title: 'Verification Unsuccessful',
          message: 'We were unable to verify your identity with the provided documents. Please ensure your documents are clear, valid, and match each other. You may contact support if you need assistance.',
          statusColor: 'bg-red-50 border-red-200',
          statusText: 'text-red-800'
        };
      case 'pending':
      default:
        return {
          icon: Clock,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-100',
          title: 'Verification Pending',
          message: 'Your verification is being processed. You will receive an update soon.',
          statusColor: 'bg-blue-50 border-blue-200',
          statusText: 'text-blue-800'
        };
    }
  };

  const statusDisplay = getStatusDisplay();
  const IconComponent = statusDisplay.icon;

  return (
    <div className="text-center">
      <div className={`w-16 h-16 ${statusDisplay.bgColor} rounded-full flex items-center justify-center mx-auto mb-6`}>
        <IconComponent className={`w-8 h-8 ${statusDisplay.iconColor}`} />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{statusDisplay.title}</h2>
      <p className="text-gray-600 mb-6">
        {statusDisplay.message}
      </p>
      <div className={`${statusDisplay.statusColor} border rounded-lg p-4`}>
        <p className={`text-sm ${statusDisplay.statusText}`}>
          {finalStatus === 'verified' ? (
            session.organization?.branding?.company_name ? 
              `${session.organization.branding.company_name} has been notified of your successful verification.` :
              "The requesting organization has been notified of your successful verification."
          ) : (
            "We'll keep you updated on the progress of your verification."
          )}
        </p>
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            <strong>Security Notice:</strong> This verification link will automatically become inactive after 5 seconds for security purposes. You may safely close this window.
          </p>
        </div>
      </div>
    </div>
  );
};

// Real-time failure feedback component for in-flow notifications
interface FailureFeedbackAlertProps {
  failureReason: string;
  onDismiss: () => void;
  onRetry: () => void;
}

const FailureFeedbackAlert: React.FC<FailureFeedbackAlertProps> = ({ 
  failureReason, 
  onDismiss, 
  onRetry 
}) => {
  // Convert technical failure reason to user-friendly message
  const getUserFriendlyMessage = (reason: string) => {
    const lowerReason = reason.toLowerCase();
    
    if (lowerReason.includes('document') && lowerReason.includes('match')) {
      return {
        title: 'Document Validation Issue',
        message: 'The front and back of your ID document don\'t appear to match. Please ensure you\'re uploading both sides of the same document.',
        suggestion: 'Try uploading clearer photos of both sides of your ID.'
      };
    }
    
    if (lowerReason.includes('photo') || lowerReason.includes('face')) {
      return {
        title: 'Photo Quality Issue',
        message: 'We had trouble verifying the photo on your ID document.',
        suggestion: 'Please ensure the photo on your ID is clear and visible, then try again.'
      };
    }
    
    if (lowerReason.includes('quality') || lowerReason.includes('blurry') || lowerReason.includes('unclear')) {
      return {
        title: 'Document Quality Issue',
        message: 'Your document image may be too blurry or unclear for verification.',
        suggestion: 'Please take a clearer photo with good lighting and try again.'
      };
    }
    
    if (lowerReason.includes('expired') || lowerReason.includes('invalid')) {
      return {
        title: 'Document Validity Issue',
        message: 'There may be an issue with your document\'s validity or expiration.',
        suggestion: 'Please check that your ID is current and valid, then try again.'
      };
    }
    
    // Generic fallback
    return {
      title: 'Verification Issue',
      message: 'We encountered an issue while verifying your documents.',
      suggestion: 'Please ensure your documents are clear, valid, and properly aligned, then try again.'
    };
  };

  const feedback = getUserFriendlyMessage(failureReason);

  return (
    <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 animate-fade-in">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
        </div>
        <div className="flex-1">
          <h4 className="text-red-900 font-medium text-sm mb-1">{feedback.title}</h4>
          <p className="text-red-800 text-sm mb-2">{feedback.message}</p>
          <p className="text-red-700 text-sm mb-3">
            <strong>Suggestion:</strong> {feedback.suggestion}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={onRetry}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Upload New Documents
            </button>
            <button
              onClick={onDismiss}
              className="flex-1 bg-white text-red-700 border border-red-300 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Continue Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationFlow;