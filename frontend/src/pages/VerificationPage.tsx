import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { API_BASE_URL, shouldUseSandbox } from '../config/api';
import { BackOfIdUpload } from '../components/BackOfIdUpload';


interface Document {
  id: string;
  file_name: string;
  file_path: string;
  document_type: string;
  ocr_data?: {
    document_number?: string;
    full_name?: string;
    date_of_birth?: string;
    expiry_date?: string;
    nationality?: string;
    place_of_birth?: string;
  };
}

interface VerificationRequest {
  id: string;
  status: 'pending' | 'processing' | 'verified' | 'failed' | 'manual_review';
  documents: Document[];
  selfie_id?: string;
  created_at: string;
  updated_at: string;
}

const VerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlApiKey = searchParams.get('api_key');
  const token = searchParams.get('token');
  const urlStep = searchParams.get('step');
  const urlVerificationId = searchParams.get('verification_id');
  
  const [currentStep, setCurrentStep] = useState(urlStep ? parseInt(urlStep) : 1);
  const [verificationRequest, setVerificationRequest] = useState<VerificationRequest | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [backOfIdUploaded, setBackOfIdUploaded] = useState(false);
  const [documentType, setDocumentType] = useState<string>('');
  
  // Demo form fields
  const [apiKey, setApiKey] = useState(urlApiKey || '');
  const [userId, setUserId] = useState('');

  // Auto-generate user ID on component mount
  useEffect(() => {
    if (!userId) {
      const newUserId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      setUserId(newUserId);
    }
  }, []); // Only run once on mount

  // Load verification results when coming from live capture
  useEffect(() => {
    if (urlVerificationId && apiKey && currentStep === 5) {
      loadVerificationResults(urlVerificationId);
    }
  }, [urlVerificationId, apiKey, currentStep]);

  const loadVerificationResults = async (verificationId: string) => {
    try {
      const url = new URL(`${API_BASE_URL}/api/verify/results/${verificationId}`);
      if (shouldUseSandbox()) {
        url.searchParams.append('sandbox', 'true');
      }
      
      const response = await fetch(url.toString(), {
        headers: {
          'X-API-Key': apiKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVerificationRequest(data);
        setVerificationId(verificationId);
      }
    } catch (error) {
      console.error('Failed to load verification results:', error);
    }
  };

  // No automatic API key injection - let users enter it manually

  // Start verification session
  const startVerification = async () => {
    // Validate inputs
    if (!apiKey.trim()) {
      toast.error('Please enter your API key');
      return;
    }
    
    if (!userId.trim()) {
      toast.error('Please enter a user ID');
      return;
    }


    setIsLoading(true);
    try {
      const useSandbox = shouldUseSandbox();
      const requestBody = {
        user_id: userId,
        ...(useSandbox && { sandbox: true })
      };

      console.log('🔧 Start Verification Debug:');
      console.log('🔧 Sandbox mode:', useSandbox);
      console.log('🔧 API Key (first 10):', apiKey?.substring(0, 10));
      console.log('🔧 Request body:', requestBody);

      const response = await fetch(`${API_BASE_URL}/api/verify/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('🔧 Start verification response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('🔧 Start verification error response:', errorData);
        throw new Error(errorData.error || errorData.message || 'Failed to start verification');
      }

      const data = await response.json();
      setVerificationId(data.verification_id);
      setCurrentStep(2);
      toast.success('Verification session started');
    } catch (error) {
      console.error('Failed to start verification:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start verification');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, or PDF file');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
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

  // Upload document
  const uploadDocument = async () => {
    if (!selectedFile || !verificationId) {
      toast.error('Please select a file first');
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('verification_id', verificationId);
      formData.append('document_type', documentType || 'national_id');
      
      const useSandbox = shouldUseSandbox();
      
      // Build URL with sandbox query parameter if needed
      const url = new URL(`${API_BASE_URL}/api/verify/document`);
      if (useSandbox) {
        url.searchParams.append('sandbox', 'true');
      }

      console.log('🔧 Document Upload Debug:');
      console.log('🔧 Sandbox mode:', useSandbox);
      console.log('🔧 API Key (first 10):', apiKey?.substring(0, 10));
      console.log('🔧 Verification ID:', verificationId);
      console.log('🔧 Upload URL:', url.toString());
      console.log('🔧 FormData entries:', Array.from(formData.entries()).map(([key, value]) => 
        key === 'document' ? [key, `${value.constructor.name} (${value.size} bytes)`] : [key, value]
      ));

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
        },
        body: formData,
      });

      console.log('🔧 Upload response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('🔧 Upload error response:', errorData);
        throw new Error(errorData.error || errorData.message || 'Failed to upload document');
      }

      const data = await response.json();
      // Document upload successful, start polling for OCR results
      setCurrentStep(3);
      toast.success('Document uploaded successfully');
      
      // Start polling for OCR results
      pollForOCRResults();
    } catch (error) {
      console.error('Failed to upload document:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload document');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  // Poll for OCR results
  const pollForOCRResults = () => {
    const pollInterval = setInterval(async () => {
      try {
        const url = new URL(`${API_BASE_URL}/api/verify/results/${verificationId}`);
        if (shouldUseSandbox()) {
          url.searchParams.append('sandbox', 'true');
        }
        
        const response = await fetch(url.toString(), {
          headers: {
            'X-API-Key': apiKey,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setVerificationRequest(data);
          
          // Check if OCR data is available
          if (data.ocr_data && Object.keys(data.ocr_data).length > 0) {
            clearInterval(pollInterval);
            setCurrentStep(4);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);

    // Clear interval after 30 seconds
    setTimeout(() => clearInterval(pollInterval), 30000);
  };

  // Handle live capture
  const handleLiveCapture = async () => {
    if (!apiKey || !verificationId) {
      toast.error('Please start verification session and upload document first');
      return;
    }

    // Redirect to dedicated live capture page (better for mobile UX)
    const liveCaptureUrl = `/live-capture?api_key=${apiKey}&verification_id=${verificationId}&token=${apiKey}`;
    window.location.href = liveCaptureUrl;
  };

  // Skip live capture - just proceed to results
  const skipLiveCapture = async () => {
    try {
      // Get results from the verification
      const url = new URL(`${API_BASE_URL}/api/verify/results/${verificationId}`);
      if (shouldUseSandbox()) {
        url.searchParams.append('sandbox', 'true');
      }
      
      const response = await fetch(url.toString(), {
        headers: {
          'X-API-Key': apiKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get verification results');
      }

      const data = await response.json();
      setVerificationRequest(data);
      setCurrentStep(5);
      toast.success('Verification completed without live capture');
    } catch (error) {
      console.error('Failed to get verification results:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to get verification results');
    }
  };

  // Render progress indicator
  const renderProgressIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        {[1, 2, 3, 4, 5].map((step) => (
          <div
            key={step}
            className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-semibold text-sm ${
              step <= currentStep
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            {step}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs sm:text-sm text-gray-600">
        <span>Start</span>
        <span>Upload</span>
        <span>Process</span>
        <span>Verify</span>
        <span>Complete</span>
      </div>
    </div>
  );

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="py-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-center">Start Identity Verification</h2>
            <p className="text-gray-600 mb-8 text-center">
              Enter your API key and user ID to start the verification process.
            </p>
            
            <div className="space-y-6 max-w-md mx-auto">
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="text"
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk_test_your_api_key_here"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Get your API key from the <a href="/developer" className="text-blue-600 hover:underline">Developer page</a>
                </p>
              </div>
              
              <div>
                <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
                  User ID
                </label>
                <input
                  type="text"
                  id="userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Auto-generated UUID"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Unique identifier for this verification session
                </p>
              </div>
              
              <button
                onClick={startVerification}
                disabled={isLoading || !apiKey.trim() || !userId.trim()}
                className="w-full bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Starting...' : 'Start Verification'}
              </button>
            </div>
          </div>
        );

      case 2:
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
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
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
                  onClick={uploadDocument}
                  disabled={isLoading || !documentType}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Uploading...' : 'Upload Document'}
                </button>
              )}
              
              {selectedFile && !documentType && (
                <p className="text-red-600 text-sm text-center">
                  Please select a document type before uploading.
                </p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="text-center py-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">Processing Document</h2>
            <div className="flex justify-center mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-gray-600">
              We're extracting information from your document. This may take a few moments...
            </p>
          </div>
        );

      case 4:
        const ocrData = verificationRequest?.ocr_data;
        
        return (
          <div className="py-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center">Document Information</h2>
            
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
                  {ocrData.date_of_birth && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date of Birth:</span>
                      <span className="font-medium">{ocrData.date_of_birth}</span>
                    </div>
                  )}
                  {ocrData.expiry_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expiry Date:</span>
                      <span className="font-medium">{ocrData.expiry_date}</span>
                    </div>
                  )}
                  {ocrData.nationality && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nationality:</span>
                      <span className="font-medium">{ocrData.nationality}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
                <p className="text-yellow-800">
                  Document information could not be extracted automatically.
                </p>
              </div>
            )}

            {/* Back-of-ID Upload Section */}
            {!backOfIdUploaded && (
              <div className="mb-8">
                <BackOfIdUpload
                  verificationId={verificationId!}
                  documentType={documentType || 'national_id'}
                  apiKey={apiKey}
                  onUploadComplete={(result) => {
                    console.log('Back-of-ID upload completed:', result);
                    setBackOfIdUploaded(true);
                    toast.success('Back-of-ID uploaded successfully!');
                  }}
                  onUploadError={(error) => {
                    console.error('Back-of-ID upload error:', error);
                    toast.error(error);
                  }}
                />
              </div>
            )}

            {backOfIdUploaded && (
              <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-green-800">
                  <span className="text-lg">✅</span>
                  <span className="font-medium">Enhanced Verification Complete</span>
                </div>
                <p className="mt-1 text-green-700 text-sm">
                  Back-of-ID successfully processed with barcode/QR scanning and cross-validation.
                </p>
              </div>
            )}

            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Take a Selfie</h3>
              <p className="text-gray-600 mb-6">
                Now we need to verify that you're the person in the document.
              </p>
              
              <div className="space-y-4">
                <button
                  onClick={handleLiveCapture}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Take Selfie
                </button>
                
                <button
                  onClick={skipLiveCapture}
                  className="w-full bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                >
                  Skip Selfie (Complete Verification)
                </button>
              </div>
            </div>
          </div>
        );

      case 5:
        const status = verificationRequest?.status;
        const statusColor = status === 'verified' ? 'green' : status === 'failed' ? 'red' : 'yellow';
        const statusIcon = status === 'verified' ? '✓' : status === 'failed' ? '✗' : '⚠';
        
        return (
          <div className="text-center py-8">
            <div className={`w-16 h-16 mx-auto mb-6 rounded-full bg-${statusColor}-100 flex items-center justify-center`}>
              <span className={`text-2xl text-${statusColor}-600`}>{statusIcon}</span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-bold mb-4">
              Verification {status === 'verified' ? 'Complete' : status === 'failed' ? 'Failed' : 'Under Review'}
            </h2>
            
            <p className="text-gray-600 mb-6">
              {status === 'verified' && 'Your identity has been successfully verified.'}
              {status === 'failed' && 'Verification failed. Please try again with clearer documents.'}
              {status === 'manual_review' && 'Your verification is under manual review. You will be notified of the result.'}
            </p>

            {verificationRequest && verificationRequest.verification_id && (
              <div className="bg-gray-50 p-4 rounded-lg text-left max-w-md mx-auto">
                <h3 className="font-semibold mb-2">Verification Details:</h3>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>ID:</span>
                    <span className="font-mono text-xs">{verificationRequest.verification_id?.slice(0, 8) || 'N/A'}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="capitalize">{verificationRequest.status || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{verificationRequest.created_at ? new Date(verificationRequest.created_at).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
                
                {/* Raw JSON Display */}
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Raw API Response:</h4>
                  <div className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto">
                    <pre>{JSON.stringify(verificationRequest, null, 2)}</pre>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                // Clear URL parameters and reset state for new verification
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.delete('verification_id');
                newUrl.searchParams.delete('step');
                newUrl.searchParams.set('step', '1');
                window.location.href = newUrl.toString();
              }}
              className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start New Verification
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Demo Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Demo Mode
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                This is a demonstration of the verification flow. Get your API key from the <a href="/developer" className="underline font-medium">Developer page</a> to test the integration.
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
          {renderProgressIndicator()}
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
};

export { VerificationPage };
export default VerificationPage;