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
  EyeOff
} from 'lucide-react';
import axios from 'axios';

interface VerificationSession {
  id: string;
  status: 'pending' | 'document_uploaded' | 'processing' | 'completed' | 'failed' | 'expired';
  organization_name: string;
  organization_branding?: {
    company_name: string;
    logo_url?: string;
    primary_color?: string;
    welcome_message: string;
  };
  settings: {
    require_liveness: boolean;
    require_back_of_id: boolean;
  };
  expires_at: string;
}

interface VerificationFlowProps {
  sessionToken: string;
}

type VerificationStep = 'welcome' | 'document-front' | 'document-back' | 'selfie' | 'liveness' | 'processing' | 'complete' | 'error';

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
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/verifications/session/${sessionToken}`);
      
      if (response.data.success) {
        setSession(response.data.data);
      } else {
        throw new Error(response.data.error?.message || 'Failed to load session');
      }
      
      // Determine starting step based on session status
      const sessionData = response.data.data;
      if (sessionData.status === 'expired') {
        setCurrentStep('error');
        setError('This verification session has expired. Please request a new verification link.');
      } else if (sessionData.status === 'completed') {
        setCurrentStep('complete');
      } else if (sessionData.status === 'processing') {
        setCurrentStep('processing');
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

  const handleFileUpload = async (type: 'front' | 'back' | 'selfie', file: File) => {
    if (!session) return;

    try {
      setUploadProgress(0);
      const formData = new FormData();
      formData.append('document', file);
      formData.append('type', type);

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/public/sessions/${sessionToken}/documents`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(progress);
            }
          },
        }
      );

      setDocuments(prev => ({ ...prev, [type]: file }));
      
      // Move to next step
      if (type === 'front') {
        if (session.settings.require_back_of_id) {
          setCurrentStep('document-back');
        } else {
          setCurrentStep('selfie');
        }
      } else if (type === 'back') {
        setCurrentStep('selfie');
      } else if (type === 'selfie') {
        if (session.settings.require_liveness) {
          setCurrentStep('liveness');
        } else {
          await submitVerification();
        }
      }
      
      setUploadProgress(0);
    } catch (error: any) {
      console.error('Failed to upload document:', error);
      setError('Failed to upload document. Please try again.');
      setUploadProgress(0);
    }
  };

  const submitVerification = async () => {
    try {
      setCurrentStep('processing');
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/public/sessions/${sessionToken}/submit`
      );
      
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
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/public/sessions/${sessionToken}/status`
        );
        
        const status = response.data.status;
        
        if (status === 'completed' || status === 'verified') {
          setCurrentStep('complete');
        } else if (status === 'failed') {
          setError('Verification failed. Please try again or contact support.');
          setCurrentStep('error');
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else {
          setError('Verification is taking longer than expected. Please check back later.');
          setCurrentStep('error');
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
    const steps = ['welcome', 'document-front'];
    if (session?.settings.require_back_of_id) steps.push('document-back');
    steps.push('selfie');
    if (session?.settings.require_liveness) steps.push('liveness');
    steps.push('processing', 'complete');

    const currentIndex = steps.indexOf(currentStep);
    const progress = currentIndex >= 0 ? ((currentIndex + 1) / steps.length) * 100 : 0;

    return (
      <div className="mb-8">
        <div className="progress-bar">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>Start</span>
          <span>Upload Documents</span>
          <span>Selfie</span>
          <span>Complete</span>
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

  const brandingStyles = session.organization_branding?.primary_color 
    ? { '--primary-color': session.organization_branding.primary_color } as React.CSSProperties
    : {};

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" style={brandingStyles}>
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          {session.organization_branding?.logo_url ? (
            <img
              src={session.organization_branding.logo_url}
              alt={session.organization_branding.company_name}
              className="h-12 mx-auto mb-4"
            />
          ) : (
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">
            {session.organization_branding?.company_name || session.organization_name}
          </h1>
          <p className="text-gray-600 text-sm">Identity Verification</p>
        </div>

        {/* Progress Bar */}
        {currentStep !== 'welcome' && currentStep !== 'complete' && renderProgressBar()}

        {/* Step Content */}
        <div className="card p-6">
          {currentStep === 'welcome' && (
            <WelcomeStep 
              session={session} 
              onNext={() => setCurrentStep('document-front')} 
            />
          )}
          
          {currentStep === 'document-front' && (
            <DocumentStep
              type="front"
              title="Upload Your ID (Front)"
              description="Please upload the front of your government-issued ID"
              onFileSelect={(file) => handleFileUpload('front', file)}
              uploadProgress={uploadProgress}
              inputRef={frontInputRef}
            />
          )}

          {currentStep === 'document-back' && (
            <DocumentStep
              type="back"
              title="Upload Your ID (Back)"
              description="Please upload the back of your government-issued ID"
              onFileSelect={(file) => handleFileUpload('back', file)}
              uploadProgress={uploadProgress}
              inputRef={backInputRef}
              onBack={() => setCurrentStep('document-front')}
            />
          )}

          {currentStep === 'selfie' && (
            <SelfieStep
              onFileSelect={(file) => handleFileUpload('selfie', file)}
              uploadProgress={uploadProgress}
              inputRef={selfieInputRef}
              onBack={() => setCurrentStep(session.settings.require_back_of_id ? 'document-back' : 'document-front')}
              requiresLiveness={session.settings.require_liveness}
            />
          )}

          {currentStep === 'liveness' && (
            <LivenessStep
              onComplete={() => submitVerification()}
              onBack={() => setCurrentStep('selfie')}
            />
          )}

          {currentStep === 'processing' && (
            <ProcessingStep />
          )}

          {currentStep === 'complete' && (
            <CompleteStep session={session} />
          )}
        </div>
      </div>
    </div>
  );
};

// Individual Step Components
const WelcomeStep: React.FC<{ session: VerificationSession; onNext: () => void }> = ({ session, onNext }) => (
  <div className="text-center">
    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <Shield className="w-8 h-8 text-primary-600" />
    </div>
    <h2 className="text-xl font-semibold text-gray-900 mb-4">Welcome to Identity Verification</h2>
    <p className="text-gray-600 mb-6">
      {session.organization_branding?.welcome_message || 
        "We need to verify your identity to proceed. This process is secure and typically takes just a few minutes."}
    </p>
    
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
      <h3 className="font-medium text-blue-900 mb-2">What you'll need:</h3>
      <ul className="text-sm text-blue-800 space-y-1">
        <li>• Government-issued photo ID (passport, driver's license, etc.)</li>
        {session.settings.require_back_of_id && <li>• Both front and back of your ID</li>}
        <li>• A clear photo of yourself (selfie)</li>
        {session.settings.require_liveness && <li>• Device with camera for liveness detection</li>}
      </ul>
    </div>
    
    <button onClick={onNext} className="btn btn-primary w-full">
      Begin Verification
      <ArrowRight className="w-4 h-4 ml-2" />
    </button>
  </div>
);

const DocumentStep: React.FC<{
  type: 'front' | 'back';
  title: string;
  description: string;
  onFileSelect: (file: File) => void;
  uploadProgress: number;
  inputRef: React.RefObject<HTMLInputElement>;
  onBack?: () => void;
}> = ({ type, title, description, onFileSelect, uploadProgress, inputRef, onBack }) => {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    if (imageFile) {
      onFileSelect(imageFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <FileText className="w-12 h-12 text-primary-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600">{description}</p>
      </div>

      <div
        className={`file-upload-zone ${dragOver ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-2">
          Drag and drop your ID here, or click to select
        </p>
        <p className="text-sm text-gray-500">
          Supported formats: JPG, PNG, PDF (max 10MB)
        </p>
        
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

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

      {onBack && (
        <div className="mt-6">
          <button onClick={onBack} className="btn btn-secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
        </div>
      )}
    </div>
  );
};

const SelfieStep: React.FC<{
  onFileSelect: (file: File) => void;
  uploadProgress: number;
  inputRef: React.RefObject<HTMLInputElement>;
  onBack: () => void;
  requiresLiveness: boolean;
}> = ({ onFileSelect, uploadProgress, inputRef, onBack, requiresLiveness }) => {
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <Camera className="w-12 h-12 text-primary-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Take a Selfie</h2>
        <p className="text-gray-600">
          Please take a clear photo of yourself for identity verification
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-yellow-900 mb-2">Tips for a good selfie:</h3>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Look directly at the camera</li>
          <li>• Ensure good lighting on your face</li>
          <li>• Remove sunglasses or hats</li>
          <li>• Keep a neutral expression</li>
        </ul>
      </div>

      <div
        className="file-upload-zone"
        onClick={() => inputRef.current?.click()}
      >
        <User className="w-8 h-8 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-2">
          Click to take or upload a selfie
        </p>
        <p className="text-sm text-gray-500">
          Supported formats: JPG, PNG
        </p>
        
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

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

      <div className="mt-6">
        <button onClick={onBack} className="btn btn-secondary">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
      </div>
    </div>
  );
};

const LivenessStep: React.FC<{
  onComplete: () => void;
  onBack: () => void;
}> = ({ onComplete, onBack }) => (
  <div className="text-center">
    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <Eye className="w-6 h-6 text-green-600" />
    </div>
    <h2 className="text-xl font-semibold text-gray-900 mb-4">Liveness Check</h2>
    <p className="text-gray-600 mb-6">
      For additional security, we need to verify that you're a real person. 
      Please follow the on-screen instructions.
    </p>
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
      <p className="text-sm text-green-800">
        This step helps prevent fraud and ensures account security.
      </p>
    </div>
    <div className="space-y-3">
      <button onClick={onComplete} className="btn btn-primary w-full">
        Start Liveness Check
      </button>
      <button onClick={onBack} className="btn btn-secondary w-full">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </button>
    </div>
  </div>
);

const ProcessingStep: React.FC = () => (
  <div className="text-center">
    <div className="w-16 h-16 mx-auto mb-6">
      <Loader className="w-16 h-16 text-primary-600 animate-spin" />
    </div>
    <h2 className="text-xl font-semibold text-gray-900 mb-4">Processing Verification</h2>
    <p className="text-gray-600 mb-6">
      We're verifying your documents and identity. This usually takes 1-2 minutes.
    </p>
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <p className="text-sm text-blue-800">
        Please keep this page open. You'll be notified when verification is complete.
      </p>
    </div>
  </div>
);

const CompleteStep: React.FC<{ session: VerificationSession }> = ({ session }) => (
  <div className="text-center">
    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <CheckCircle className="w-8 h-8 text-green-600" />
    </div>
    <h2 className="text-xl font-semibold text-gray-900 mb-4">Verification Complete!</h2>
    <p className="text-gray-600 mb-6">
      {(session.organization_branding as any)?.success_message || 
        "Your identity has been successfully verified. You can now close this window."}
    </p>
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <p className="text-sm text-green-800">
        The requesting organization has been notified of your successful verification.
      </p>
    </div>
  </div>
);

export default VerificationFlow;