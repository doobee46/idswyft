import React, { useState, useEffect, useRef } from 'react';
import { VerificationSession } from '../../types';
import customerPortalAPI from '../../services/api';
import verificationAPI from '../../services/verificationApi';
import { useOrganization } from '../../contexts/OrganizationContext';
import BrandedHeader from '../BrandedHeader';
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
  RefreshCw,
  ChevronRight,
  Clock,
  Zap,
  Star,
  Eye,
  ImageIcon,
  Lock
} from 'lucide-react';

interface ModernVerificationSystemProps {
  sessionToken: string;
}

interface VerificationStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'upcoming' | 'current' | 'processing' | 'completed' | 'failed';
  canInteract: boolean;
}

export const ModernVerificationSystem: React.FC<ModernVerificationSystemProps> = ({ sessionToken }) => {
  const [session, setSession] = useState<VerificationSession | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [documents, setDocuments] = useState<{
    front?: File;
    back?: File;
    selfie?: File;
  }>({});
  const [documentType, setDocumentType] = useState<string>('drivers_license');
  const [ocrData, setOcrData] = useState<any>(null);
  const [backOfIdUploaded, setBackOfIdUploaded] = useState(false);
  const [finalStatus, setFinalStatus] = useState<'pending' | 'processing' | 'completed' | 'verified' | 'failed' | 'manual_review' | null>(null);
  const [verificationResults, setVerificationResults] = useState<any>(null);
  const { branding, organizationName, setBranding, setOrganizationName } = useOrganization();

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // Initialize session and verification engine
  useEffect(() => {
    const initializeSession = async () => {
      try {
        console.log('🚀 Initializing verification session...');
        setLoading(true);

        // Get session data
        const sessionData = await customerPortalAPI.getVerificationSession(sessionToken);
        console.log('✅ Session data retrieved:', sessionData);
        setSession(sessionData);

        // Apply organization branding
        if (sessionData.organization?.branding) {
          setBranding(sessionData.organization.branding);
        }
        if (sessionData.organization?.name) {
          setOrganizationName(sessionData.organization.name);
        }

        // Ready to start verification
        console.log('✅ Verification system ready');

        setLoading(false);
      } catch (error) {
        console.error('❌ Failed to initialize session:', error);
        setError(`Failed to initialize verification: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setLoading(false);
      }
    };

    if (sessionToken) {
      initializeSession();
    }
  }, [sessionToken]);

  const updateCurrentStep = (step: number) => {
    setCurrentStep(step);
  };

  const simulateUploadProgress = (key: string, duration: number = 2000) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);

      setUploadProgress(prev => ({ ...prev, [key]: progress }));

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setUploadProgress(prev => ({ ...prev, [key]: 0 }));
        }, 500);
      }
    }, 50);
  };

  const handleFileUpload = async (file: File, type: 'front' | 'back') => {
    if (!session) return;

    setUploading(true);
    setError(null);
    simulateUploadProgress(type, 3000);

    try {
      console.log(`📄 Uploading ${type} document...`);
      setDocuments(prev => ({ ...prev, [type]: file }));

      if (type === 'front') {
        // Start verification and upload front document
        let currentVerificationId = verificationId;
        if (!currentVerificationId) {
          currentVerificationId = await verificationAPI.startVerification(session);
          setVerificationId(currentVerificationId);
        }

        await verificationAPI.uploadDocument(session, currentVerificationId, file, documentType);
        console.log('✅ Front document uploaded successfully');
        setCurrentStep(2); // Move to processing step

        // Poll for OCR completion
        pollForOCRCompletion(currentVerificationId);
      } else {
        // Upload back document
        if (!verificationId) throw new Error('Front document must be uploaded first');
        await verificationAPI.uploadBackOfId(session, verificationId, file, documentType);
        console.log('✅ Back document uploaded successfully');
        setBackOfIdUploaded(true);
        setCurrentStep(4); // Move to live capture
      }
    } catch (error) {
      console.error(`❌ ${type} document upload failed:`, error);
      setError(`Failed to upload ${type} document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleLiveCaptureUpload = async (imageData: string) => {
    if (!session || !verificationId) return;

    setUploading(true);
    setError(null);
    simulateUploadProgress('live', 2000);

    try {
      console.log('📸 Uploading live capture...');

      // Convert data URL to File
      const dataURItoBlob = (dataURI: string) => {
        const byteString = atob(dataURI.split(',')[1]);
        const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mimeString });
      };

      const blob = dataURItoBlob(imageData);
      const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });

      await verificationAPI.captureSelfie(session, verificationId, file);
      console.log('✅ Live capture uploaded successfully');
      setCurrentStep(5); // Move to final step

      // Poll for final results
      pollForFinalResults(verificationId);
    } catch (error) {
      console.error('❌ Live capture upload failed:', error);
      setError(`Failed to upload live capture: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const pollForOCRCompletion = async (vId: string) => {
    const maxAttempts = 30;
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        console.log(`🔄 Polling OCR completion (attempt ${attempts}/${maxAttempts})`);

        const results = await verificationAPI.getResults(session!, vId);

        if (results.ocr_data && Object.keys(results.ocr_data).length > 0) {
          console.log('✅ OCR completed successfully');
          setOcrData(results.ocr_data);
          setCurrentStep(3); // Move to back document upload
          return;
        }

        if (results.status === 'failed') {
          console.log('❌ Verification failed during OCR');
          setFinalStatus('failed');
          setVerificationResults(results);
          setCurrentStep(5);
          return;
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 3000); // Poll every 3 seconds
        } else {
          setError('Document processing is taking longer than expected. Please try again.');
        }
      } catch (error) {
        console.error('OCR polling error:', error);
        if (attempts < 3) {
          setTimeout(poll, 5000);
        } else {
          setError('Failed to check processing status. Please try again.');
        }
      }
    };

    poll();
  };

  const pollForFinalResults = async (vId: string) => {
    const maxAttempts = 24;
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        console.log(`🔄 Polling final results (attempt ${attempts}/${maxAttempts})`);

        const results = await verificationAPI.getResults(session!, vId);

        if (results.status === 'verified' || results.status === 'failed' || results.status === 'manual_review') {
          console.log(`✅ Final results received: ${results.status}`);
          setFinalStatus(results.status);
          setVerificationResults(results);
          return;
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          setError('Verification is taking longer than expected. Please contact support.');
        }
      } catch (error) {
        console.error('Final results polling error:', error);
        if (attempts < 3) {
          setTimeout(poll, 5000);
        } else {
          setError('Failed to get verification results. Please contact support.');
        }
      }
    };

    poll();
  };

  const handleDragOver = (e: React.DragEvent, type: string) => {
    e.preventDefault();
    setDragOver(type);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
  };

  const handleDrop = (e: React.DragEvent, type: 'front' | 'back') => {
    e.preventDefault();
    setDragOver(null);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0], type);
    }
  };

  const getSteps = (): VerificationStep[] => {
    const canUploadFront = currentStep === 1;
    const canUploadBack = currentStep === 3 && ocrData;
    const canLiveCapture = currentStep === 4 && backOfIdUploaded;
    const isComplete = currentStep === 5 && finalStatus;

    return [
      {
        id: 1,
        title: 'Upload Front ID',
        description: 'Upload the front side of your government-issued ID',
        icon: <FileText className="w-5 h-5" />,
        status: currentStep > 1 ? 'completed' : (currentStep === 1 ? 'current' : 'upcoming'),
        canInteract: canUploadFront
      },
      {
        id: 2,
        title: 'Upload Back ID',
        description: 'Upload the back side of your ID document',
        icon: <ImageIcon className="w-5 h-5" />,
        status: currentStep > 2 ? 'completed' : (currentStep === 2 ? 'current' : 'upcoming'),
        canInteract: canUploadBack
      },
      {
        id: 3,
        title: 'Document Validation',
        description: 'We validate and cross-check your documents',
        icon: <Shield className="w-5 h-5" />,
        status: currentStep > 3 ? 'completed' : (currentStep === 3 ? 'processing' : 'upcoming'),
        canInteract: false
      },
      {
        id: 4,
        title: 'Live Selfie',
        description: 'Take a selfie to verify your identity',
        icon: <Camera className="w-5 h-5" />,
        status: currentStep > 4 ? 'completed' : (currentStep === 4 ? 'current' : 'upcoming'),
        canInteract: canLiveCapture
      },
      {
        id: 5,
        title: 'Verification Complete',
        description: 'Your identity has been successfully verified',
        icon: <CheckCircle className="w-5 h-5" />,
        status: isComplete ? 'completed' : 'upcoming',
        canInteract: false
      }
    ];
  };

  const getStepStatusIcon = (step: VerificationStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'current':
        return <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full"></div>
        </div>;
      case 'processing':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <div className="w-5 h-5 bg-slate-300 rounded-full"></div>;
    }
  };

  if (loading) {
    return (
      <div className="portal-bg">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="verification-card-glass animate-fade-in max-w-md">
            <div className="icon-container-primary mx-auto mb-6">
              <Loader className="w-6 h-6 animate-spin" />
            </div>
            <h3 className="text-2xl font-semibold gradient-text mb-3">Initializing Verification</h3>
            <p className="text-slate-600 mb-4">Setting up your secure verification session...</p>
            <div className="progress-bar">
              <div className="progress-bar-fill w-1/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="portal-bg">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="verification-card-glass animate-fade-in max-w-md">
            <div className="icon-container-error mx-auto mb-6">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-semibold text-slate-800 mb-3">Verification Error</h3>
            <p className="text-slate-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const steps = getSteps();
  const currentStepData = steps.find(s => s.id === currentStep);

  return (
    <div className="portal-bg min-h-screen">
      <BrandedHeader />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Section */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="icon-container-primary mx-auto mb-6">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-4">Identity Verification</h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Complete your secure identity verification in just a few simple steps.
            Your privacy and security are our top priorities.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="verification-step-glass animate-slide-in-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-800">
                Step {currentStep} of {steps.length}
              </h2>
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <Clock className="w-4 h-4" />
                <span>~2 minutes remaining</span>
              </div>
            </div>

            <div className="progress-bar mb-8">
              <div
                className="progress-bar-fill transition-all duration-1000"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              ></div>
            </div>

            {/* Step List */}
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center p-4 rounded-2xl transition-all duration-300 ${
                    step.status === 'current'
                      ? 'bg-blue-50/80 border-2 border-blue-200/50'
                      : step.status === 'completed'
                      ? 'bg-green-50/80 border border-green-200/50'
                      : 'bg-white/50 border border-slate-200/50'
                  } ${step.status === 'current' ? 'animate-scale-in' : ''}`}
                >
                  <div className="flex-shrink-0 mr-4">
                    {getStepStatusIcon(step)}
                  </div>

                  <div className="flex-grow">
                    <h3 className={`font-semibold ${
                      step.status === 'current' ? 'text-blue-800' :
                      step.status === 'completed' ? 'text-green-800' : 'text-slate-700'
                    }`}>
                      {step.title}
                    </h3>
                    <p className="text-sm text-slate-600">{step.description}</p>
                  </div>

                  {step.status === 'current' && (
                    <ChevronRight className="w-5 h-5 text-blue-500" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Current Step Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Main Action Panel */}
          <div className="space-y-6">
            {currentStepData && (
              <div className="card animate-slide-in-up">
                <div className="flex items-center mb-6">
                  <div className="icon-container-primary mr-4">
                    {currentStepData.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-800">{currentStepData.title}</h3>
                    <p className="text-slate-600">{currentStepData.description}</p>
                  </div>
                </div>

                {/* Front Document Upload */}
                {currentStep === 1 && (
                  <div>
                    <div
                      className={`file-upload-zone ${dragOver === 'front' ? 'dragover' : ''} ${uploading ? 'opacity-75' : ''}`}
                      onDragOver={(e) => handleDragOver(e, 'front')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'front')}
                      onClick={() => frontInputRef.current?.click()}
                    >
                      <input
                        ref={frontInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'front');
                        }}
                        disabled={uploading}
                      />

                      <div className="text-center">
                        <Upload className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-slate-800 mb-2">
                          Upload Front of ID
                        </h4>
                        <p className="text-slate-600 mb-4">
                          Drag and drop your file here or click to browse
                        </p>
                        <p className="text-sm text-slate-500">
                          Supports: JPEG, PNG (Max 10MB)
                        </p>
                      </div>

                      {uploadProgress.front > 0 && (
                        <div className="mt-4">
                          <div className="progress-bar">
                            <div
                              className="progress-bar-fill"
                              style={{ width: `${uploadProgress.front}%` }}
                            ></div>
                          </div>
                          <p className="text-sm text-blue-600 mt-2 text-center">
                            Uploading... {Math.round(uploadProgress.front)}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Back Document Upload */}
                {currentStep === 2 && (
                  <div>
                    <div
                      className={`file-upload-zone ${dragOver === 'back' ? 'dragover' : ''} ${uploading ? 'opacity-75' : ''}`}
                      onDragOver={(e) => handleDragOver(e, 'back')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'back')}
                      onClick={() => backInputRef.current?.click()}
                    >
                      <input
                        ref={backInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'back');
                        }}
                        disabled={uploading}
                      />

                      <div className="text-center">
                        <ImageIcon className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-slate-800 mb-2">
                          Upload Back of ID
                        </h4>
                        <p className="text-slate-600 mb-4">
                          Drag and drop your file here or click to browse
                        </p>
                        <p className="text-sm text-slate-500">
                          Supports: JPEG, PNG (Max 10MB)
                        </p>
                      </div>

                      {uploadProgress.back > 0 && (
                        <div className="mt-4">
                          <div className="progress-bar">
                            <div
                              className="progress-bar-fill"
                              style={{ width: `${uploadProgress.back}%` }}
                            ></div>
                          </div>
                          <p className="text-sm text-blue-600 mt-2 text-center">
                            Uploading... {Math.round(uploadProgress.back)}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Document Validation */}
                {currentStep === 3 && (
                  <div className="text-center py-8">
                    <div className="icon-container-primary mx-auto mb-6">
                      <Zap className="w-6 h-6 animate-pulse" />
                    </div>
                    <h4 className="text-xl font-semibold text-slate-800 mb-3">
                      Validating Documents
                    </h4>
                    <p className="text-slate-600 mb-6">
                      Our AI is analyzing and cross-validating your documents...
                    </p>
                    <div className="progress-bar">
                      <div className="progress-bar-fill w-3/4"></div>
                    </div>
                  </div>
                )}

                {/* Live Capture */}
                {currentStep === 4 && (
                  <div className="text-center">
                    <div className="icon-container-primary mx-auto mb-6">
                      <Camera className="w-6 h-6" />
                    </div>
                    <h4 className="text-xl font-semibold text-slate-800 mb-3">
                      Take a Live Selfie
                    </h4>
                    <p className="text-slate-600 mb-6">
                      Position your face in the center and ensure good lighting
                    </p>

                    <button
                      onClick={() => {
                        // Simulate camera capture
                        const canvas = document.createElement('canvas');
                        canvas.width = 640;
                        canvas.height = 480;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                          ctx.fillStyle = '#f0f0f0';
                          ctx.fillRect(0, 0, canvas.width, canvas.height);
                          ctx.fillStyle = '#666';
                          ctx.font = '20px Arial';
                          ctx.textAlign = 'center';
                          ctx.fillText('Sample Selfie', canvas.width / 2, canvas.height / 2);
                          handleLiveCaptureUpload(canvas.toDataURL());
                        }
                      }}
                      disabled={uploading}
                      className="btn btn-primary px-8 py-4 text-lg hover-lift"
                    >
                      {uploading ? (
                        <>
                          <Loader className="w-5 h-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Camera className="w-5 h-5 mr-2" />
                          Take Selfie
                        </>
                      )}
                    </button>

                    {uploadProgress.live > 0 && (
                      <div className="mt-6">
                        <div className="progress-bar">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${uploadProgress.live}%` }}
                          ></div>
                        </div>
                        <p className="text-sm text-blue-600 mt-2">
                          Processing... {Math.round(uploadProgress.live)}%
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Completion */}
                {currentStep === 5 && finalStatus && (
                  <div className="text-center py-8">
                    {finalStatus === 'verified' && (
                      <>
                        <div className="icon-container-success mx-auto mb-6">
                          <CheckCircle className="w-8 h-8" />
                        </div>
                        <h4 className="text-2xl font-semibold text-green-800 mb-3">
                          Verification Complete!
                        </h4>
                        <p className="text-green-700 mb-6">
                          Your identity has been successfully verified.
                        </p>
                        <div className="flex items-center justify-center space-x-1 text-yellow-500">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-5 h-5 fill-current" />
                          ))}
                        </div>
                      </>
                    )}

                    {finalStatus === 'failed' && (
                      <>
                        <div className="icon-container-error mx-auto mb-6">
                          <AlertCircle className="w-8 h-8" />
                        </div>
                        <h4 className="text-2xl font-semibold text-red-800 mb-3">
                          Verification Failed
                        </h4>
                        <p className="text-red-700 mb-6">
                          {verificationResults?.failure_reason || 'Unable to verify your identity with the provided documents.'}
                        </p>
                        <button
                          onClick={() => window.location.reload()}
                          className="btn btn-primary"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Try Again
                        </button>
                      </>
                    )}

                    {finalStatus === 'manual_review' && (
                      <>
                        <div className="icon-container-warning mx-auto mb-6">
                          <Eye className="w-8 h-8" />
                        </div>
                        <h4 className="text-2xl font-semibold text-yellow-800 mb-3">
                          Manual Review Required
                        </h4>
                        <p className="text-yellow-700 mb-6">
                          Your documents are being reviewed by our team. You'll receive an update within 24 hours.
                        </p>
                        <div className="info-card-glass">
                          <p className="text-sm text-blue-800">
                            <Lock className="w-4 h-4 inline mr-2" />
                            Your information is secure and will be handled with complete confidentiality.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            {/* Security Info */}
            <div className="card-glass animate-slide-in-up">
              <div className="flex items-center mb-4">
                <Lock className="w-6 h-6 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold text-slate-800">Secure & Private</h3>
              </div>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>256-bit SSL encryption</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>GDPR compliant data handling</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Automatic data deletion after verification</span>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="card-glass animate-slide-in-up">
              <div className="flex items-center mb-4">
                <User className="w-6 h-6 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold text-slate-800">Tips for Success</h3>
              </div>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Ensure your ID is clearly visible and not blurry</span>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Use good lighting and avoid shadows</span>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Keep your documents flat and fully in frame</span>
                </div>
              </div>
            </div>

            {/* Status Display */}
            {session && (
              <div className="card-glass animate-slide-in-up">
                <div className="flex items-center mb-4">
                  <Zap className="w-6 h-6 text-blue-600 mr-3" />
                  <h3 className="text-lg font-semibold text-slate-800">Current Status</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Session ID</span>
                    <span className="text-sm font-mono text-slate-800">
                      {verificationId?.slice(-8) || session.id?.slice(-8) || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Status</span>
                    <span className={`status-${finalStatus === 'verified' ? 'verified' :
                      finalStatus === 'failed' ? 'failed' :
                      finalStatus === 'manual_review' ? 'pending' : 'processing'}`}>
                      {finalStatus ?
                        (finalStatus === 'verified' ? 'Verification Complete' :
                         finalStatus === 'failed' ? 'Verification Failed' :
                         finalStatus === 'manual_review' ? 'Manual Review' : 'Processing') :
                        'In Progress'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-8">
            <div className="card bg-red-50/80 border-red-200/50 animate-fade-in">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-red-800 mb-1">Verification Error</h4>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};