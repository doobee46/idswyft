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
import { useOrganization } from '../contexts/OrganizationContext';
import BrandedHeader from './BrandedHeader';


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
  const [finalStatus, setFinalStatus] = useState<'verified' | 'manual_review' | 'pending' | null>(null);

  // Organization context for branding
  const { setBranding, setOrganizationName } = useOrganization();

  // File input refs
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSession();
  }, [sessionToken]);

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
      if (sessionData.status === 'expired') {
        setCurrentStep('error');
        setError('This verification session has expired. Please request a new verification link.');
      } else if (sessionData.status === 'completed') {
        setCurrentStep('complete');
      } else if (sessionData.status === 'processing') {
        setCurrentStep('document-processing');
      }
    } catch (error: any) {
      console.error('Failed to load session:', error);
      if (error.response?.status === 404) {
        setError('Verification session not found. Please check your link or request a new one.');
      } else {
        setError('Failed to load verification session. Please try again.');
      }
      setCurrentStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (file: File) => {
    if (!session || !documentType) return;

    try {
      setUploadProgress(0);
      
      await customerPortalAPI.uploadDocument(
        sessionToken,
        file,
        'front',
        (progress) => setUploadProgress(progress)
      );

      setDocuments(prev => ({ ...prev, front: file }));
      setCurrentStep('document-processing');
      
      // Start polling for OCR results
      pollForOCRResults();
      
      setUploadProgress(0);
    } catch (error: any) {
      console.error('Failed to upload document:', error);
      setError('Failed to upload document. Please try again.');
      setUploadProgress(0);
    }
  };

  const handleBackOfIdUpload = async (file: File) => {
    try {
      await customerPortalAPI.uploadDocument(
        sessionToken,
        file,
        'back',
        (progress) => setUploadProgress(progress)
      );

      setDocuments(prev => ({ ...prev, back: file }));
      setBackOfIdUploaded(true);
      setUploadProgress(0);
    } catch (error: any) {
      console.error('Failed to upload back of ID:', error);
      setError('Failed to upload back of ID. Please try again.');
      setUploadProgress(0);
    }
  };

  const handleSelfieCapture = async (file: File) => {
    try {
      await customerPortalAPI.uploadDocument(
        sessionToken,
        file,
        'selfie',
        (progress) => setUploadProgress(progress)
      );

      setDocuments(prev => ({ ...prev, selfie: file }));
      await submitVerification();
      setUploadProgress(0);
    } catch (error: any) {
      console.error('Failed to upload selfie:', error);
      setError('Failed to capture selfie. Please try again.');
      setUploadProgress(0);
    }
  };

  const pollForOCRResults = () => {
    const pollInterval = setInterval(async () => {
      try {
        const statusResponse = await customerPortalAPI.getVerificationStatus(sessionToken);
        
        // Check if OCR processing is complete (mock OCR data for now)
        if (statusResponse.documents_uploaded > 0) {
          clearInterval(pollInterval);
          // Set mock OCR data - in production this would come from the API
          setOcrData({
            document_number: 'Processing complete',
            full_name: 'Document processed successfully'
          });
          setCurrentStep('identity-verification');
        }
      } catch (error) {
        console.error('OCR polling error:', error);
      }
    }, 2000);

    // Clear interval after 30 seconds
    setTimeout(() => clearInterval(pollInterval), 30000);
  };

  const submitVerification = async () => {
    try {
      setCurrentStep('document-processing');
      await customerPortalAPI.submitVerification(sessionToken);
      
      // Poll for completion
      pollVerificationStatus();
    } catch (error: any) {
      console.error('Failed to submit verification:', error);
      setError('Failed to submit verification. Please try again.');
      setCurrentStep('error');
    }
  };

  const pollVerificationStatus = async () => {
    const maxAttempts = 30; // 5 minutes max
    let attempts = 0;
    
    const poll = async () => {
      try {
        const statusResponse = await customerPortalAPI.getVerificationStatus(sessionToken);
        const status = statusResponse.status;
        
        if (status === 'completed' || status === 'verified') {
          setFinalStatus('verified');
          setCurrentStep('complete');
        } else if (status === 'failed') {
          setFinalStatus('pending');
          setCurrentStep('complete');
        } else if (status === 'manual_review') {
          setFinalStatus('manual_review');
          setCurrentStep('complete');
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else {
          setFinalStatus('pending');
          setCurrentStep('complete');
        }
      } catch (error) {
        console.error('Failed to check status:', error);
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 10000);
        } else {
          setError('Failed to check verification status. Please contact support.');
          setCurrentStep('error');
        }
      }
    };
    
    poll();
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
            <DocumentProcessingStep />
          )}

          {currentStep === 'identity-verification' && (
            <IdentityVerificationStep
              session={session}
              ocrData={ocrData}
              backOfIdUploaded={backOfIdUploaded}
              showLiveCapture={showLiveCapture}
              onBackOfIdUpload={handleBackOfIdUpload}
              onStartLiveCapture={() => setShowLiveCapture(true)}
              onSelfieCapture={handleSelfieCapture}
              onSkipLiveCapture={() => submitVerification()}
              uploadProgress={uploadProgress}
            />
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
      We're extracting information from your document using OCR. This may take a few moments...
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
  onSelfieCapture: (file: File) => void;
  onSkipLiveCapture: () => void;
  uploadProgress: number;
}> = ({ 
  session, 
  ocrData, 
  backOfIdUploaded, 
  showLiveCapture, 
  onBackOfIdUpload, 
  onStartLiveCapture,
  onSelfieCapture,
  onSkipLiveCapture,
  uploadProgress 
}) => {
  const backInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const handleBackOfIdSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onBackOfIdUpload(file);
    }
  };

  const handleSelfieSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelfieCapture(file);
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
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Enhanced Verification Complete</span>
          </div>
          <p className="mt-1 text-green-700 text-sm">
            Back-of-ID successfully processed.
          </p>
        </div>
      )}

      {/* Live Capture or Selfie Upload */}
      {(!session.verification_settings.require_back_of_id || backOfIdUploaded) && (
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4">Identity Verification</h3>
          <p className="text-gray-600 mb-6">
            Now we need to verify that you're the person in the document.
          </p>
          
          <div className="space-y-4">
            {session.verification_settings.require_liveness ? (
              <>
                <button
                  onClick={onStartLiveCapture}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Camera className="h-5 w-5" />
                  <span>Start Live Capture</span>
                </button>
                
                <button
                  onClick={onSkipLiveCapture}
                  className="w-full bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                >
                  Skip Live Capture (Complete Verification)
                </button>
              </>
            ) : (
              <div>
                <button
                  onClick={() => selfieInputRef.current?.click()}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <User className="h-5 w-5" />
                  <span>Take Selfie</span>
                </button>
                <input
                  ref={selfieInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleSelfieSelect}
                  className="hidden"
                />
              </div>
            )}
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
      </div>
    </div>
  );
};

export default VerificationFlow;