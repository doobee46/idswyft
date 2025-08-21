import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

interface QualityAnalysis {
  overall_quality: 'excellent' | 'good' | 'fair' | 'poor';
  issues: string[];
  recommendations: string[];
  quality_scores: {
    blur_score: number;
    brightness: number;
    contrast: number;
    resolution: {
      width: number;
      height: number;
      isHighRes: boolean;
    };
    file_size: {
      bytes: number;
      isReasonableSize: boolean;
    };
  };
}

interface VerificationResult {
  verification_id: string;
  status: string;
  user_id: string;
  message: string;
  quality_analysis?: QualityAnalysis;
}

export const VerificationPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [userId, setUserId] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [documentUploaded, setDocumentUploaded] = useState(false);
  const [selfieUploaded, setSelfieUploaded] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate user ID on component mount
  useEffect(() => {
    if (!userId) {
      setUserId(generateUUID());
    }
  }, []);

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Step 1: Start verification session
  const startVerificationSession = async () => {
    if (!apiKey) {
      alert('Please enter API key first');
      return;
    }

    // Ensure we have a user ID (generate one if somehow missing)
    const currentUserId = userId || generateUUID();
    if (currentUserId !== userId) {
      setUserId(currentUserId);
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/verify/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          user_id: currentUserId
        }),
      });
      
      const data = await response.json();
      if (data.verification_id) {
        setVerificationId(data.verification_id);
        setCurrentStep(2);
        setVerificationResult(data);
      } else {
        alert('Failed to start verification session');
      }
    } catch (error) {
      console.error('Failed to start verification:', error);
      alert('Failed to start verification session');
    } finally {
      setLoading(false);
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleFilePreview = (file: File, setPreview: (url: string) => void) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocumentFileChange = (file: File | null) => {
    setDocumentFile(file);
    if (file) {
      handleFilePreview(file, setDocumentPreview);
      setDocumentUploaded(true);
      if (currentStep === 1) setCurrentStep(2);
    } else {
      setDocumentPreview(null);
      setDocumentUploaded(false);
    }
  };

  const handleSelfieFileChange = (file: File | null) => {
    setSelfieFile(file);
    if (file) {
      handleFilePreview(file, setSelfiePreview);
      setSelfieUploaded(true);
    } else {
      setSelfiePreview(null);
      setSelfieUploaded(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDocumentDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleDocumentFileChange(files[0]);
    }
  };

  const handleSelfieDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleSelfieFileChange(files[0]);
    }
  };

  const handleDocumentVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !verificationId || !documentFile) {
      alert('Please start verification session first and provide document file');
      return;
    }
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('document', documentFile);
      formData.append('verification_id', verificationId);
      formData.append('document_type', 'passport');
      
      const response = await fetch(`${API_BASE_URL}/api/verify/document`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
        },
        body: formData,
      });
      
      const data = await response.json();
      setDocumentUploaded(true);
      setCurrentStep(3);
      
      // Fetch updated results
      await getVerificationResults();
    } catch (error) {
      console.error('Document upload failed:', error);
      alert('Document upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelfieVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !verificationResult?.verification_id || !selfieFile) {
      alert('Please complete document verification first and provide selfie file');
      return;
    }
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('selfie', selfieFile);
      formData.append('verification_id', verificationResult.verification_id);
      
      const response = await fetch(`${API_BASE_URL}/api/verify/selfie`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
        },
        body: formData,
      });
      
      const data = await response.json();
      setVerificationResult(data);
    } catch (error) {
      console.error('Selfie verification failed:', error);
      setVerificationResult({
        verification_id: 'error',
        status: 'failed',
        user_id: userId,
        message: 'Selfie verification request failed'
      });
    } finally {
      setLoading(false);
    }
  };

  // Get complete verification results
  const getVerificationResults = async () => {
    if (!apiKey || !verificationId) {
      alert('Please start verification session first');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/verify/results/${verificationId}`, {
        headers: {
          'X-API-Key': apiKey,
        },
      });
      
      const data = await response.json();
      setVerificationResult(data);
    } catch (error) {
      console.error('Failed to get verification results:', error);
    }
  };

  const checkVerificationStatus = async () => {
    // Use the new results endpoint instead of legacy status
    await getVerificationResults();
  };

  const handleLiveCapture = async () => {
    if (!apiKey || !verificationId) {
      alert('Please start verification session and upload document first');
      return;
    }

    setLoading(true);
    try {
      // Generate live capture token
      const response = await fetch(`${API_BASE_URL}/api/verify/generate-live-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          verification_id: verificationId
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Redirect to live capture page with token
        const liveCaptureUrl = `/live-capture?token=${data.token}&verification_id=${verificationId}&api_key=${apiKey}`;
        window.location.href = liveCaptureUrl;
      } else {
        console.error('Live capture token generation failed:', data);
        alert(data.message || 'Failed to start live capture. Please try again.');
      }
    } catch (error) {
      console.error('Live capture initialization failed:', error);
      alert('Failed to start live capture. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Identity Verification</h1>
          <p className="text-xl text-gray-600">Secure, AI-powered document verification in just a few steps</p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step <= currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step}
                </div>
                <div className={`ml-2 text-sm font-medium ${
                  step <= currentStep ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {step === 1 && 'Setup'}
                  {step === 2 && 'Document'}
                  {step === 3 && 'Selfie'}
                  {step === 4 && 'Complete'}
                </div>
                {step < 4 && (
                  <div className={`ml-4 w-16 h-0.5 ${
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-8">
              
              {/* Step 1: API Configuration */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <div className="inline-flex p-3 bg-blue-100 rounded-full mb-4">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m-2-2l-2.5-2.5a2 2 0 00-2.83 0l-9.17 9.17a2 2 0 000 2.83L3 19l4-1 10.5-10.5z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Start New Verification</h2>
                    <p className="text-gray-600">Enter your API credentials and start a verification session</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key *
                      </label>
                      <input
                        type="text"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your API key"
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Get your API key from the <a href="/developer" className="text-blue-600 underline">Developer Portal</a>
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        User ID (Auto-generated)
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={userId}
                          readOnly
                          className="flex-1 p-4 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setUserId(generateUUID())}
                          className="px-6 py-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                          title="Generate new user ID"
                        >
                          🔄
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        In real applications, this would come from your user authentication system
                      </p>
                    </div>
                    
                    <button
                      onClick={startVerificationSession}
                      disabled={!apiKey || loading}
                      className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200 font-semibold flex items-center justify-center"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      ) : null}
                      Start Verification Session
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Document Upload */}
              {currentStep >= 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <div className="inline-flex p-3 bg-green-100 rounded-full mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Document</h2>
                    <p className="text-gray-600">Upload a clear photo of your ID, passport, or driver's license</p>
                  </div>

                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDocumentDrop}
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                      dragOver 
                        ? 'border-blue-500 bg-blue-50' 
                        : documentUploaded 
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {documentPreview ? (
                      <div className="space-y-4">
                        <div className="relative inline-block">
                          <img 
                            src={documentPreview} 
                            alt="Document preview" 
                            className="max-w-sm max-h-48 rounded-lg shadow-md mx-auto"
                          />
                          <button
                            onClick={() => handleDocumentFileChange(null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                        <p className="text-sm text-green-600 font-medium">
                          ✓ Document uploaded successfully
                        </p>
                        <button
                          onClick={() => documentInputRef.current?.click()}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Choose a different file
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-lg font-medium text-gray-700 mb-1">
                            Drag and drop your document here
                          </p>
                          <p className="text-sm text-gray-500 mb-4">
                            or click to browse files
                          </p>
                          <button
                            onClick={() => documentInputRef.current?.click()}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
                          >
                            Choose File
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">
                          Supported: JPG, PNG, PDF • Max 10MB
                        </p>
                      </div>
                    )}
                    
                    <input
                      ref={documentInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleDocumentFileChange(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </div>

                  {documentUploaded && (
                    <div className="flex justify-between">
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleDocumentVerification}
                        disabled={loading || !documentFile}
                        className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-semibold flex items-center"
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </>
                        ) : (
                          'Verify Document'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Selfie Upload */}
              {currentStep >= 3 && verificationResult && (
                <div className="space-y-6 mt-8 pt-8 border-t">
                  <div className="text-center mb-6">
                    <div className="inline-flex p-3 bg-purple-100 rounded-full mb-4">
                      <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Take a Selfie</h2>
                    <p className="text-gray-600">Take a clear selfie for face matching verification</p>
                  </div>

                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleSelfieDrop}
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                      dragOver 
                        ? 'border-purple-500 bg-purple-50' 
                        : selfieUploaded 
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {selfiePreview ? (
                      <div className="space-y-4">
                        <div className="relative inline-block">
                          <img 
                            src={selfiePreview} 
                            alt="Selfie preview" 
                            className="w-32 h-32 rounded-full object-cover shadow-md mx-auto"
                          />
                          <button
                            onClick={() => handleSelfieFileChange(null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                        <p className="text-sm text-green-600 font-medium">
                          ✓ Selfie uploaded successfully
                        </p>
                        <button
                          onClick={() => selfieInputRef.current?.click()}
                          className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                        >
                          Take a new selfie
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-lg font-medium text-gray-700 mb-1">
                            Upload your selfie
                          </p>
                          <p className="text-sm text-gray-500 mb-4">
                            Make sure your face is clearly visible
                          </p>
                          <button
                            onClick={() => selfieInputRef.current?.click()}
                            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-medium"
                          >
                            Choose Photo
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">
                          Supported: JPG, PNG • Max 10MB
                        </p>
                      </div>
                    )}
                    
                    <input
                      ref={selfieInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleSelfieFileChange(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </div>

                  {selfieUploaded && (
                    <div className="space-y-3">
                      <button
                        onClick={handleSelfieVerification}
                        disabled={loading || !selfieFile}
                        className="w-full bg-purple-600 text-white py-4 px-6 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition font-semibold flex items-center justify-center"
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </>
                        ) : (
                          'Verify Selfie'
                        )}
                      </button>
                      
                      <div className="text-center">
                        <div className="text-sm text-gray-500 mb-2">or</div>
                        <button
                          onClick={handleLiveCapture}
                          disabled={loading}
                          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:bg-gray-400 transition font-semibold flex items-center justify-center"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Use Live Camera Verification
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {!selfieUploaded && verificationResult && (
                    <div className="space-y-4">
                      <div className="text-center">
                        <button
                          onClick={handleLiveCapture}
                          disabled={loading}
                          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:bg-gray-400 transition font-semibold flex items-center justify-center"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Skip Upload - Use Live Camera
                        </button>
                        <p className="text-xs text-gray-500 mt-2">
                          More secure with liveness detection
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={getVerificationResults}
                  disabled={!apiKey || !verificationId}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 transition duration-200 font-medium text-sm"
                >
                  Refresh Results
                </button>
                <button
                  onClick={() => {
                    setCurrentStep(1);
                    setVerificationResult(null);
                    setDocumentFile(null);
                    setSelfieFile(null);
                    setDocumentPreview(null);
                    setSelfiePreview(null);
                    setDocumentUploaded(false);
                    setSelfieUploaded(false);
                  }}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition duration-200 font-medium text-sm"
                >
                  Start Over
                </button>
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">📋 Verification Tips</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Ensure good lighting for clear photos
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Hold documents flat and avoid glare
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Make sure all text is readable
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Face the camera directly for selfies
                </li>
              </ul>
            </div>

            {/* AI Quality Indicator */}
            {verificationResult?.quality_analysis && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🤖 AI Quality Check</h3>
                <div className="text-center">
                  <div className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold ${getQualityColor(verificationResult.quality_analysis.overall_quality)}`}>
                    {verificationResult.quality_analysis.overall_quality.toUpperCase()}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Document quality assessment
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Check */}
        <div className="mt-8 text-center space-x-4">
          <button
            onClick={getVerificationResults}
            disabled={!apiKey || !verificationId}
            className="bg-blue-600 text-white py-3 px-8 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition duration-200 font-semibold"
          >
            📊 Get Complete Results
          </button>
          <button
            onClick={checkVerificationStatus}
            disabled={!apiKey || !verificationId}
            className="bg-indigo-600 text-white py-3 px-8 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition duration-200 font-semibold"
          >
            🔄 Refresh Results
          </button>
        </div>

        {/* Results */}
        {verificationResult && (
          <div className="mt-8">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                <h3 className="text-2xl font-bold mb-2">🎉 Verification Results</h3>
                <p className="text-blue-100">Here's what our AI found</p>
                {verificationId && (
                  <p className="text-blue-200 text-sm mt-2">
                    Session ID: {verificationId}
                  </p>
                )}
              </div>
              
              <div className="p-6 space-y-6">
                {/* Verification Status */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      verificationResult.status === 'verified' ? 'bg-green-500' :
                      verificationResult.status === 'failed' ? 'bg-red-500' :
                      verificationResult.status === 'pending' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`}></div>
                    <span className="font-medium text-gray-900">Status:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold uppercase tracking-wide ${
                      verificationResult.status === 'verified' ? 'bg-green-100 text-green-800' :
                      verificationResult.status === 'failed' ? 'bg-red-100 text-red-800' :
                      verificationResult.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {verificationResult.status}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500 font-mono">{verificationResult.verification_id}</span>
                </div>

                {/* AI Quality Analysis */}
                {verificationResult.quality_analysis && (
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-xl font-bold text-gray-900">🤖 AI Quality Analysis</h4>
                      <div className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide ${getQualityColor(verificationResult.quality_analysis.overall_quality)}`}>
                        {verificationResult.quality_analysis.overall_quality}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Quality Metrics */}
                      <div className="bg-white rounded-lg p-4">
                        <h5 className="font-semibold text-gray-900 mb-3">📊 Quality Metrics</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Sharpness:</span>
                            <span className="font-mono font-semibold">{verificationResult.quality_analysis.quality_scores.blur_score.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Brightness:</span>
                            <span className="font-mono font-semibold">{verificationResult.quality_analysis.quality_scores.brightness.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Contrast:</span>
                            <span className="font-mono font-semibold">{verificationResult.quality_analysis.quality_scores.contrast.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Image Properties */}
                      <div className="bg-white rounded-lg p-4">
                        <h5 className="font-semibold text-gray-900 mb-3">📐 Image Properties</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Resolution:</span>
                            <div className="flex items-center">
                              <span className="font-mono font-semibold">
                                {verificationResult.quality_analysis.quality_scores.resolution.width} × {verificationResult.quality_analysis.quality_scores.resolution.height}
                              </span>
                              {verificationResult.quality_analysis.quality_scores.resolution.isHighRes && 
                                <span className="ml-2 text-green-600 font-semibold">✓</span>
                              }
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">File Size:</span>
                            <div className="flex items-center">
                              <span className="font-mono font-semibold">
                                {(verificationResult.quality_analysis.quality_scores.file_size.bytes / 1024).toFixed(0)} KB
                              </span>
                              {verificationResult.quality_analysis.quality_scores.file_size.isReasonableSize && 
                                <span className="ml-2 text-green-600 font-semibold">✓</span>
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Issues and Recommendations */}
                    {(verificationResult.quality_analysis.issues.length > 0 || verificationResult.quality_analysis.recommendations.length > 0) && (
                      <div className="grid md:grid-cols-2 gap-4 mt-6">
                        {verificationResult.quality_analysis.issues.length > 0 && (
                          <div className="bg-red-50 rounded-lg p-4">
                            <h5 className="font-semibold text-red-800 mb-3">⚠️ Issues Detected</h5>
                            <ul className="text-sm space-y-2">
                              {verificationResult.quality_analysis.issues.map((issue, index) => (
                                <li key={index} className="text-red-700 flex items-start gap-2">
                                  <span className="text-red-500 mt-0.5 font-bold">•</span>
                                  {issue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {verificationResult.quality_analysis.recommendations.length > 0 && (
                          <div className="bg-blue-50 rounded-lg p-4">
                            <h5 className="font-semibold text-blue-800 mb-3">💡 Recommendations</h5>
                            <ul className="text-sm space-y-2">
                              {verificationResult.quality_analysis.recommendations.map((rec, index) => (
                                <li key={index} className="text-blue-700 flex items-start gap-2">
                                  <span className="text-blue-500 mt-0.5 font-bold">•</span>
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Raw Data Toggle */}
                <div className="text-center">
                  <button
                    onClick={() => setShowRawData(!showRawData)}
                    className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                  >
                    {showRawData ? 'Hide' : 'Show'} Raw Data
                  </button>
                  {showRawData && (
                    <div className="mt-4 bg-gray-900 text-green-400 p-4 rounded-lg text-left">
                      <pre className="text-xs overflow-auto">{JSON.stringify(verificationResult, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-8 bg-blue-50 p-4 rounded-md">
          <h3 className="font-semibold text-blue-900 mb-2">How it Works</h3>
          <ol className="text-blue-800 text-sm space-y-1 list-decimal list-inside">
            <li>Enter your API key (get one from the <a href="/developer" className="underline">Developer Portal</a>)</li>
            <li>Generate a unique user ID or enter your own UUID</li>
            <li>Upload a document file and click "Verify Document" - our AI will analyze image quality</li>
            <li>Upload a selfie file and click "Verify Selfie" (requires completed document verification)</li>
            <li>Check the verification status to see final results and AI quality analysis</li>
          </ol>
          <div className="mt-3 p-3 bg-white rounded border-l-4 border-blue-400">
            <p className="text-blue-800 text-sm">
              <strong>🤖 AI Quality Analysis:</strong> Our system automatically analyzes document images for sharpness, brightness, resolution, and other quality factors to provide instant feedback and recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};