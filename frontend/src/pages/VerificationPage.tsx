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
  ocr_data?: {
    name?: string;
    date_of_birth?: string;
    document_number?: string;
    expiration_date?: string;
    issuing_authority?: string;
    nationality?: string;
    address?: string;
    raw_text?: string;
    confidence_scores?: Record<string, number>;
  };
  face_match_score?: number;
  liveness_score?: number;
  confidence_score?: number;
  live_capture_completed?: boolean;
  manual_review_reason?: string;
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
  const [cameraSupported, setCameraSupported] = useState(true);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate user ID on component mount
  useEffect(() => {
    if (!userId) {
      setUserId(generateUUID());
    }
  }, []);

  // Check device capabilities on mount
  useEffect(() => {
    // Detect mobile device
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    setIsMobileDevice(isMobile);

    // Check camera support
    const checkCameraSupport = async () => {
      try {
        // Check HTTPS requirement
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
          console.warn('Camera requires HTTPS or localhost');
          setCameraSupported(false);
          return;
        }

        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraSupported(false);
          return;
        }

        // Check if we can enumerate devices (optional, for better UX)
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          console.log('Available devices:', devices.map(d => ({kind: d.kind, label: d.label})));
          
          const videoInputs = devices.filter(device => device.kind === 'videoinput');
          console.log('Video input devices found:', videoInputs.length);
          
          if (videoInputs.length === 0) {
            console.warn('No video input devices found during enumeration');
            // Don't disable camera yet - enumeration might fail due to permissions
          }
        } catch (err) {
          console.warn('Could not enumerate devices (this is normal before permission grant):', err);
          // Don't disable camera - enumeration often fails before permissions are granted
        }
      } catch (error) {
        console.error('Camera support check failed:', error);
        setCameraSupported(false);
      }
    };

    checkCameraSupport();
  }, []);

  // Helper function for mobile camera troubleshooting
  const logUserAgentInfo = () => {
    console.log('User Agent Info:', {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isMobile: isMobileDevice,
      cameraSupported: cameraSupported,
      isHTTPS: location.protocol === 'https:',
      hasMediaDevices: !!navigator.mediaDevices,
      hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    });
  };

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
      toast.error('Please enter API key first');
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
          user_id: currentUserId,
          sandbox: true // Enable sandbox mode for testing
        }),
      });
      
      const data = await response.json();
      if (data.verification_id) {
        setVerificationId(data.verification_id);
        setCurrentStep(2);
        setVerificationResult(data);
      } else {
        toast.error('Failed to start verification session');
      }
    } catch (error) {
      console.error('Failed to start verification:', error);
      toast.error('Failed to start verification session');
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
      toast.error('Please start verification session first and provide document file');
      return;
    }
    
    setLoading(true);
    setCurrentStep(3); // Move to "Processing Document" step
    
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
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Document upload failed: ${errorData.message || response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Document upload response:', data);
      setDocumentUploaded(true);
      
      // Simulate document processing time and poll for results
      console.log('Starting document verification polling...');
      await pollForDocumentVerification();
      
    } catch (error) {
      console.error('Document upload failed:', error);
      toast.error('Document upload failed. Please try again.');
      setCurrentStep(2); // Go back to document upload
    } finally {
      setLoading(false);
    }
  };

  // Poll for document verification completion
  const pollForDocumentVerification = async () => {
    const maxAttempts = 60; // 60 seconds max for real processing
    let attempts = 0;
    
    const pollInterval = setInterval(async () => {
      attempts++;
      
      try {
        // Get verification results directly instead of relying on state
        const response = await fetch(`${API_BASE_URL}/api/verify/results/${verificationId}`, {
          headers: {
            'X-API-Key': apiKey,
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Polling verification results:', data);
        
        // Update state with fresh data
        setVerificationResult(data);
        
        // Check if document processing is actually complete using fresh data
        const hasOcrData = data.ocr_data && Object.keys(data.ocr_data).length > 0;
        const isProcessed = data.status !== 'pending';
        
        console.log('Document processing check:', {
          status: data.status,
          hasOcrData,
          isProcessed,
          attempts,
          ocrDataKeys: data.ocr_data ? Object.keys(data.ocr_data) : null
        });
        
        if (isProcessed) {
          console.log('Document processing complete, moving to camera step');
          clearInterval(pollInterval);
          setCurrentStep(4); // Move to live capture selection
          return;
        }
        
        // Also proceed if we've been polling for more than 10 seconds (allows for OCR processing time)
        if (attempts >= 10) {
          console.log('Proceeding to camera step after 10 seconds of polling (OCR may still be processing)');
          clearInterval(pollInterval);
          setCurrentStep(4);
          return;
        }
        
        // Timeout after max attempts
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          console.warn('Document processing polling timed out');
          setCurrentStep(4); // Move forward anyway, user can check status
        }
      } catch (error) {
        console.error('Error polling verification results:', error);
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setCurrentStep(4);
        }
      }
    }, 1000); // Poll every second
  };

  const handleSelfieVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !verificationResult?.verification_id || !selfieFile) {
      toast.error('Please complete document verification first and provide selfie file');
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
      toast.error('Please start verification session first');
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
      toast.error('Please start verification session and upload document first');
      return;
    }

    setLoading(true);
    
    // Re-check device capabilities after user interaction
    console.log('Re-checking camera capabilities after user interaction...');
    logUserAgentInfo();
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      console.log('Camera devices after permission check:', videoInputs.map(d => ({
        deviceId: d.deviceId, 
        label: d.label || 'Unlabeled camera',
        kind: d.kind
      })));
      
      if (videoInputs.length === 0) {
        console.error('No video input devices found after user interaction');
        toast.error('No camera detected. Please check if your device has a camera and it\'s not being used by another app.');
        setLoading(false);
        return;
      }
    } catch (enumError) {
      console.warn('Could not re-enumerate devices:', enumError);
    }
    
    try {
      // Step 1: Access user's camera with mobile-optimized constraints
      let stream;
      
      try {
        console.log('Attempting camera access with ideal constraints...');
        
        // Try with ideal constraints first
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { min: 640, ideal: 1280, max: 1920 }, 
            height: { min: 480, ideal: 720, max: 1080 },
            facingMode: 'user',
            frameRate: { ideal: 30, max: 30 }
          } 
        });
        
        console.log('Camera access successful with ideal constraints');
        console.log('Stream info:', {
          active: stream.active,
          tracks: stream.getVideoTracks().map(track => ({
            kind: track.kind,
            label: track.label,
            enabled: track.enabled,
            readyState: track.readyState,
            settings: track.getSettings ? track.getSettings() : 'N/A'
          }))
        });
      } catch (constraintError) {
        console.warn('Ideal constraints failed, trying basic constraints:', constraintError);
        
        try {
          // Fallback to basic constraints for older mobile devices
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'user'
            } 
          });
          
          console.log('Camera access successful with basic constraints');
          console.log('Stream info (basic):', {
            active: stream.active,
            tracks: stream.getVideoTracks().map(track => ({
              kind: track.kind,
              label: track.label,
              enabled: track.enabled,
              readyState: track.readyState
            }))
          });
        } catch (basicError) {
          console.warn('Basic constraints failed, trying minimal constraints:', basicError);
          
          // Last resort - try with just video: true
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: true
          });
          
          console.log('Camera access successful with minimal constraints');
          console.log('Stream info (minimal):', {
            active: stream.active,
            tracks: stream.getVideoTracks().map(track => ({
              kind: track.kind,
              label: track.label,
              enabled: track.enabled,
              readyState: track.readyState
            }))
          });
        }
      }
      
      // Step 2: Create video element and capture frame
      console.log('Creating video element and setting up stream...');
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true; // Critical for iOS Safari
      video.muted = true; // Required for autoplay on mobile
      
      console.log('Video element created, waiting for metadata...');
      
      // Wait for video to be ready with timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('Video loading timeout after 10 seconds');
          reject(new Error('Video loading timeout - camera may not be responding'));
        }, 10000); // 10 second timeout
        
        video.onloadedmetadata = () => {
          console.log('Video metadata loaded successfully', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState
          });
          clearTimeout(timeout);
          resolve(true);
        };
        
        video.onerror = (error) => {
          console.error('Video error event:', error);
          clearTimeout(timeout);
          reject(new Error('Video loading failed - camera stream error'));
        };
        
        video.onloadstart = () => {
          console.log('Video load started');
        };
        
        video.oncanplay = () => {
          console.log('Video can start playing');
        };
        
        // Start playing
        console.log('Starting video playback...');
        video.play().then(() => {
          console.log('Video play() succeeded');
        }).catch(err => {
          console.error('Video play() failed:', err);
          clearTimeout(timeout);
          reject(new Error(`Video play failed: ${err.message}`));
        });
      });
      
      // Step 3: Capture photo from video stream
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      ctx.drawImage(video, 0, 0);
      
      // Stop the camera stream
      stream.getTracks().forEach(track => track.stop());
      
      // Step 4: Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/jpeg', 0.9);
      });
      
      // Step 5: Submit live capture to API
      const formData = new FormData();
      formData.append('live_capture', blob, 'live_capture.jpg');
      formData.append('verification_id', verificationId);
      formData.append('sandbox', 'true'); // Enable sandbox mode for testing
      
      const response = await fetch(`${API_BASE_URL}/api/verify/live-capture`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Live capture failed: ${errorData.message || response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Live capture submitted:', data);
      
      // Step 6: Move to final results and poll for completion
      setCurrentStep(5);
      await pollForLiveCaptureCompletion();
      
    } catch (error) {
      console.error('Live capture failed:', error);
      
      // Handle specific camera errors with mobile-friendly messages
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          toast.error('Camera access denied. Please allow camera access in your browser settings and refresh the page.');
        } else if (error.name === 'NotFoundError') {
          toast.error('No camera found. Please ensure your device has a camera and try again.');
        } else if (error.name === 'NotReadableError') {
          toast.error('Camera is being used by another app. Please close other camera apps and try again.');
        } else if (error.name === 'OverconstrainedError') {
          toast.error('Camera constraints not supported. Trying with basic settings...');
        } else if (error.name === 'SecurityError') {
          toast.error('Camera access blocked. Please use HTTPS or allow camera permissions.');
        } else {
          toast.error(`Camera error: ${error.message}`);
        }
      } else {
        toast.error(`Live capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      setCurrentStep(4); // Go back to selection
    } finally {
      setLoading(false);
    }
  };

  // Poll for live capture completion
  const pollForLiveCaptureCompletion = async () => {
    const maxAttempts = 60; // 60 seconds max for real processing
    let attempts = 0;
    
    const pollInterval = setInterval(async () => {
      attempts++;
      
      try {
        await getVerificationResults();
        
        // Check if live capture processing is complete
        if (verificationResult) {
          const isComplete = verificationResult.live_capture_completed || 
                            verificationResult.status === 'verified' || 
                            verificationResult.status === 'failed' ||
                            (verificationResult.liveness_score !== undefined && verificationResult.face_match_score !== undefined);
          
          if (isComplete) {
            clearInterval(pollInterval);
            return;
          }
        }
        
        // Timeout after max attempts
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          console.warn('Live capture processing polling timed out');
        }
      } catch (error) {
        console.error('Error polling live capture results:', error);
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
        }
      }
    }, 1000); // Poll every second
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">Identity Verification</h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 px-2">Secure, AI-powered document verification in just a few steps</p>
        </div>

        {/* Progress Indicator - Mobile Optimized */}
        <div className="mb-6 sm:mb-8">
          {/* Mobile: Vertical Progress */}
          <div className="sm:hidden">
            <div className="flex flex-col space-y-3">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                    step <= currentStep 
                      ? 'bg-blue-600 text-white' 
                      : step === currentStep && loading
                      ? 'bg-yellow-500 text-white animate-pulse'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step <= currentStep && !loading ? '✓' : step}
                  </div>
                  <div className={`ml-3 text-sm font-medium ${
                    step <= currentStep ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step === 1 && 'Setup Session'}
                    {step === 2 && 'Upload Document'}
                    {step === 3 && 'AI Processing'}
                    {step === 4 && 'Live Capture'}
                    {step === 5 && 'Complete'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop/Tablet: Horizontal Progress */}
          <div className="hidden sm:flex items-center justify-center space-x-2 lg:space-x-4">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-xs lg:text-sm font-semibold ${
                  step <= currentStep 
                    ? 'bg-blue-600 text-white' 
                    : step === currentStep && loading
                    ? 'bg-yellow-500 text-white animate-pulse'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step <= currentStep && !loading ? '✓' : step}
                </div>
                <div className={`ml-1 lg:ml-2 text-xs lg:text-sm font-medium ${
                  step <= currentStep ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {step === 1 && 'Setup'}
                  {step === 2 && 'Upload'}
                  {step === 3 && 'Processing'}
                  {step === 4 && 'Live Capture'}
                  {step === 5 && 'Complete'}
                </div>
                {step < 5 && (
                  <div className={`ml-2 lg:ml-4 w-8 lg:w-16 h-0.5 ${
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content Area */}
          <div className="order-1 lg:order-1 lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
              
              {/* Step 1: API Configuration */}
              {currentStep === 1 && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="text-center mb-4 sm:mb-6">
                    <div className="inline-flex p-2 sm:p-3 bg-blue-100 rounded-full mb-3 sm:mb-4">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m-2-2l-2.5-2.5a2 2 0 00-2.83 0l-9.17 9.17a2 2 0 000 2.83L3 19l4-1 10.5-10.5z" />
                      </svg>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Start New Verification</h2>
                    <p className="text-sm sm:text-base text-gray-600 px-2">Enter your API credentials and start a verification session</p>
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
                        className="w-full p-3 sm:p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm sm:text-base"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Get your API key from the <a href="/developer" className="text-blue-600 underline">Developer Portal</a>
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        User ID (Auto-generated)
                      </label>
                      <div className="flex gap-2 sm:gap-3">
                        <input
                          type="text"
                          value={userId}
                          readOnly
                          className="flex-1 p-3 sm:p-4 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 font-mono text-xs sm:text-sm min-w-0"
                        />
                        <button
                          type="button"
                          onClick={() => setUserId(generateUUID())}
                          className="px-3 sm:px-6 py-3 sm:py-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm sm:text-base"
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
                      className="w-full bg-blue-600 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200 font-semibold text-sm sm:text-base flex items-center justify-center touch-manipulation"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                      ) : null}
                      Start Verification Session
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Document Upload */}
              {currentStep >= 2 && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="text-center mb-4 sm:mb-6">
                    <div className="inline-flex p-2 sm:p-3 bg-green-100 rounded-full mb-3 sm:mb-4">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Upload Your Document</h2>
                    <p className="text-sm sm:text-base text-gray-600 px-2">Upload a clear photo of your ID, passport, or driver's license</p>
                  </div>

                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDocumentDrop}
                    className={`relative border-2 border-dashed rounded-xl p-4 sm:p-6 lg:p-8 text-center transition-all ${
                      dragOver 
                        ? 'border-blue-500 bg-blue-50' 
                        : documentUploaded 
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {documentPreview ? (
                      <div className="space-y-3 sm:space-y-4">
                        <div className="relative inline-block">
                          <img 
                            src={documentPreview} 
                            alt="Document preview" 
                            className="max-w-full max-h-32 sm:max-h-48 rounded-lg shadow-md mx-auto"
                          />
                          <button
                            onClick={() => handleDocumentFileChange(null)}
                            className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center hover:bg-red-600 text-xs sm:text-sm touch-manipulation"
                          >
                            ×
                          </button>
                        </div>
                        <p className="text-sm text-green-600 font-medium">
                          ✓ Document uploaded successfully
                        </p>
                        <button
                          onClick={() => documentInputRef.current?.click()}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium touch-manipulation"
                        >
                          Choose a different file
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 sm:space-y-4">
                        <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-base sm:text-lg font-medium text-gray-700 mb-1">
                            <span className="hidden sm:inline">Drag and drop your document here</span>
                            <span className="sm:hidden">Tap to upload your document</span>
                          </p>
                          <p className="text-sm text-gray-500 mb-3 sm:mb-4">
                            <span className="hidden sm:inline">or click to browse files</span>
                            <span className="sm:hidden">Choose a clear photo of your ID or passport</span>
                          </p>
                          <button
                            onClick={() => documentInputRef.current?.click()}
                            className="bg-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:bg-blue-700 transition font-medium text-sm sm:text-base touch-manipulation"
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
                    <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="order-2 sm:order-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm sm:text-base touch-manipulation"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleDocumentVerification}
                        disabled={loading || !documentFile}
                        className="order-1 sm:order-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-semibold flex items-center justify-center text-sm sm:text-base touch-manipulation"
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

              {/* Step 3: Document Processing */}
              {currentStep === 3 && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="text-center mb-4 sm:mb-6">
                    <div className="inline-flex p-2 sm:p-3 bg-yellow-100 rounded-full mb-3 sm:mb-4">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Processing Document</h2>
                    <p className="text-sm sm:text-base text-gray-600 px-2">AI is analyzing your document for authenticity and extracting information</p>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6">
                    <div className="flex items-center justify-center mb-3 sm:mb-4">
                      <div className="flex space-x-1 sm:space-x-2">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">Verification in Progress</p>
                      <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                        <p>• Checking document authenticity</p>
                        <p>• Extracting personal information (OCR)</p>
                        <p>• Validating document quality</p>
                        <p>• Preparing for live capture</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Debug info - temporary */}
              {currentStep >= 3 && (
                <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  Debug: currentStep={currentStep}, documentUploaded={documentUploaded ? 'true' : 'false'}, hasVerificationResult={verificationResult ? 'true' : 'false'}
                </div>
              )}

              {/* Step 4: Live Capture Selection */}
              {currentStep === 4 && documentUploaded && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="text-center mb-4 sm:mb-6">
                    <div className="inline-flex p-2 sm:p-3 bg-green-100 rounded-full mb-3 sm:mb-4">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Document Verified</h2>
                    <p className="text-sm sm:text-base text-gray-600 px-2">Now complete verification with live capture</p>
                  </div>

                  {/* Show verification results so far */}
                  {verificationResult?.ocr_data ? (
                    <div className="bg-green-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                      <h3 className="font-semibold text-green-900 mb-2 text-sm sm:text-base">Document Information Extracted:</h3>
                      <div className="text-xs sm:text-sm text-green-800 space-y-1">
                        {verificationResult.ocr_data.name && <p>Name: {verificationResult.ocr_data.name}</p>}
                        {verificationResult.ocr_data.document_number && <p>Document #: {verificationResult.ocr_data.document_number}</p>}
                        {verificationResult.ocr_data.date_of_birth && <p>DOB: {verificationResult.ocr_data.date_of_birth}</p>}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                      <h3 className="font-semibold text-yellow-900 mb-2 text-sm sm:text-base">Document Processing:</h3>
                      <div className="text-xs sm:text-sm text-yellow-800">
                        <p>📄 Document uploaded successfully</p>
                        <p>🔄 OCR extraction in progress...</p>
                        <p className="mt-2 text-yellow-700">You can proceed with live capture while OCR completes</p>
                      </div>
                    </div>
                  )}

                  {/* Live capture options - Mobile optimized */}
                  <div className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
                    <button 
                      onClick={handleLiveCapture}
                      disabled={loading || !cameraSupported}
                      className="p-6 border-2 border-blue-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="text-center">
                        <div className="inline-flex p-3 bg-blue-100 rounded-full mb-3 group-hover:bg-blue-200">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 002 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">Live Camera Capture</h3>
                        <p className="text-sm text-gray-600">Real-time liveness detection with face matching</p>
                        {isMobileDevice && (
                          <p className="text-xs text-amber-600 mt-1">📱 Mobile: Allow camera access when prompted</p>
                        )}
                        {!cameraSupported && (
                          <p className="text-xs text-red-600 mt-1">⚠️ Camera not supported on this device</p>
                        )}
                        {loading && <p className="text-xs text-blue-600 mt-2">Starting camera...</p>}
                      </div>
                    </button>

                    <button
                      onClick={() => toast.info('Selfie upload is not implemented in this demo. Please use Live Camera Capture.')}
                      className="p-6 border-2 border-gray-300 rounded-xl hover:border-gray-400 transition-all opacity-75"
                    >
                      <div className="text-center">
                        <div className="inline-flex p-3 bg-gray-100 rounded-full mb-3">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">Upload Selfie</h3>
                        <p className="text-sm text-gray-600">Alternative method (use live capture instead)</p>
                      </div>
                    </button>
                  </div>
                  
                  {/* Mobile Camera Diagnostics */}
                  {isMobileDevice && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                      <button 
                        onClick={() => {
                          logUserAgentInfo();
                          navigator.mediaDevices.enumerateDevices().then(devices => {
                            const cameras = devices.filter(d => d.kind === 'videoinput');
                            toast.info(`Found ${cameras.length} camera(s). Check console for details.`);
                          }).catch(err => {
                            toast.error('Camera enumeration failed. Check console.');
                            console.error('Diagnostic enum error:', err);
                          });
                        }}
                        className="text-xs text-blue-600 underline"
                      >
                        🔍 Debug Camera Issues (Mobile)
                      </button>
                      <p className="text-xs text-gray-500 mt-1">
                        Tap to log camera diagnostics to browser console
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Final Results */}
              {currentStep >= 5 && verificationResult && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <div className={`inline-flex p-3 rounded-full mb-4 ${
                      verificationResult.status === 'verified' 
                        ? 'bg-green-100' 
                        : 'bg-red-100'
                    }`}>
                      {verificationResult.status === 'verified' ? (
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <h2 className={`text-2xl font-bold mb-2 ${
                      verificationResult.status === 'verified' 
                        ? 'text-green-900' 
                        : 'text-red-900'
                    }`}>
                      Verification {verificationResult.status === 'verified' ? 'Complete' : 'Failed'}
                    </h2>
                    <p className="text-gray-600">
                      {verificationResult.status === 'verified' 
                        ? 'Identity successfully verified with AI analysis'
                        : 'Verification could not be completed'
                      }
                    </p>
                  </div>

                  {/* Complete Verification Analysis */}
                  <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">🎉 Complete Verification Analysis</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {/* OCR Data */}
                      {verificationResult.ocr_data && (
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3">📄 Document Information</h4>
                          <div className="space-y-2 text-sm">
                            {verificationResult.ocr_data.name && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Name:</span>
                                <span className="font-semibold">{verificationResult.ocr_data.name}</span>
                              </div>
                            )}
                            {verificationResult.ocr_data.document_number && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Document #:</span>
                                <span className="font-mono text-sm">{verificationResult.ocr_data.document_number}</span>
                              </div>
                            )}
                            {verificationResult.ocr_data.date_of_birth && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Date of Birth:</span>
                                <span className="font-semibold">{verificationResult.ocr_data.date_of_birth}</span>
                              </div>
                            )}
                            {verificationResult.ocr_data.expiration_date && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Expires:</span>
                                <span className="font-semibold">{verificationResult.ocr_data.expiration_date}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Verification Scores */}
                      <div className="bg-white rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">🎯 Verification Scores</h4>
                        <div className="space-y-3">
                          {verificationResult.face_match_score && (
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-gray-600 text-sm">Face Match</span>
                                <span className="font-bold text-green-600">{(verificationResult.face_match_score * 100).toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full" 
                                  style={{width: `${verificationResult.face_match_score * 100}%`}}
                                ></div>
                              </div>
                            </div>
                          )}
                          
                          {verificationResult.liveness_score && (
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-gray-600 text-sm">Liveness Detection</span>
                                <span className="font-bold text-blue-600">{(verificationResult.liveness_score * 100).toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{width: `${verificationResult.liveness_score * 100}%`}}
                                ></div>
                              </div>
                            </div>
                          )}
                          
                          {verificationResult.confidence_score && (
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-gray-600 text-sm">Overall Confidence</span>
                                <span className="font-bold text-purple-600">{(verificationResult.confidence_score * 100).toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-purple-600 h-2 rounded-full" 
                                  style={{width: `${verificationResult.confidence_score * 100}%`}}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 justify-center">
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
                          setVerificationId('');
                        }}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Start New Verification
                      </button>
                      
                      <button
                        onClick={() => setShowRawData(!showRawData)}
                        className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition font-semibold"
                      >
                        {showRawData ? 'Hide' : 'View'} Technical Details
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Legacy Step 3: Selfie Upload (keeping for backward compatibility, but hiding) */}
              {false && currentStep >= 3 && verificationResult && (
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

          {/* Sidebar - Mobile optimized */}
          <div className="order-2 lg:order-2 space-y-4 sm:space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Quick Actions</h3>
              <div className="space-y-2 sm:space-y-3">
                <button
                  onClick={getVerificationResults}
                  disabled={!apiKey || !verificationId}
                  className="w-full bg-gray-100 text-gray-700 py-2 sm:py-3 px-3 sm:px-4 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 transition duration-200 font-medium text-xs sm:text-sm touch-manipulation"
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
                    setVerificationId('');
                  }}
                  className="w-full bg-gray-100 text-gray-700 py-2 sm:py-3 px-3 sm:px-4 rounded-lg hover:bg-gray-200 transition duration-200 font-medium text-xs sm:text-sm touch-manipulation"
                >
                  Start Over
                </button>
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-blue-50 rounded-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-3 sm:mb-4">📋 Verification Tips</h3>
              <ul className="text-xs sm:text-sm text-blue-800 space-y-1 sm:space-y-2">
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
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">🤖 AI Quality Check</h3>
                <div className="text-center">
                  <div className={`inline-flex px-3 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold ${getQualityColor(verificationResult.quality_analysis.overall_quality)}`}>
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

        {/* Status Check - Mobile optimized */}
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-center">
          <button
            onClick={getVerificationResults}
            disabled={!apiKey || !verificationId}
            className="bg-blue-600 text-white py-3 px-6 sm:px-8 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition duration-200 font-semibold text-sm sm:text-base touch-manipulation"
          >
            📊 Get Complete Results
          </button>
          <button
            onClick={checkVerificationStatus}
            disabled={!apiKey || !verificationId}
            className="bg-indigo-600 text-white py-3 px-6 sm:px-8 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition duration-200 font-semibold text-sm sm:text-base touch-manipulation"
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

        {/* Help Text - Mobile optimized */}
        <div className="mt-6 sm:mt-8 bg-blue-50 p-3 sm:p-4 rounded-md">
          <h3 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">Real Verification Demo</h3>
          <ol className="text-blue-800 text-xs sm:text-sm space-y-1 list-decimal list-inside">
            <li>Enter your API key (get one from the <a href="/developer" className="underline">Developer Portal</a>)</li>
            <li>Start a verification session with auto-generated user ID</li>
            <li>Upload your real government-issued document (passport, driver's license, etc.)</li>
            <li>Wait for AI document processing (OCR extraction and quality analysis)</li>
            <li>Complete live camera capture for face matching and liveness detection</li>
            <li>Review complete verification results with confidence scores</li>
          </ol>
          <div className="mt-3 p-2 sm:p-3 bg-white rounded border-l-4 border-blue-400">
            <p className="text-blue-800 text-xs sm:text-sm">
              <strong>🎥 Live Verification:</strong> This demo uses your real camera and processes actual documents through our AI verification pipeline. Camera access is required for live capture and liveness detection.
            </p>
          </div>
          {isMobileDevice && (
            <div className="mt-3 p-2 sm:p-3 bg-white rounded border-l-4 border-amber-400">
              <p className="text-amber-800 text-xs sm:text-sm">
                <strong>📱 Mobile Users:</strong> Ensure you're using HTTPS, allow camera permissions when prompted, and close other camera apps. If camera fails, try refreshing the page or switching to desktop.
              </p>
            </div>
          )}
          <div className="mt-3 p-2 sm:p-3 bg-white rounded border-l-4 border-green-400">
            <p className="text-green-800 text-xs sm:text-sm">
              <strong>🔒 Privacy Note:</strong> All verification data is processed securely and can be deleted after testing. This is a real implementation of our identity verification API.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};