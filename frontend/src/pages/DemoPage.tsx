import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { API_BASE_URL, shouldUseSandbox } from '../config/api';
import { BackOfIdUpload } from '../components/BackOfIdUpload';
import {
  CameraIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  XMarkIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { ContinueOnPhone } from '../components/ContinueOnPhone';

// OpenCV types
declare global {
  interface Window {
    cv: any;
  }
}

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

interface LiveCaptureSession {
  live_capture_token: string;
  expires_at: string;
  liveness_challenge: {
    type: string;
    instruction: string;
  };
  user_id: string;
  verification_id: string | null;
  expires_in_seconds: number;
}

interface CaptureResult {
  verification_id: string;
  live_capture_id: string;
  status: string;
  message: string;
  liveness_check_enabled: boolean;
  face_matching_enabled: boolean;
}

const DemoPage: React.FC = () => {
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

  // Live capture state
  const [showLiveCapture, setShowLiveCapture] = useState(false);
  const [sessionData, setSessionData] = useState<LiveCaptureSession | null>(null);
  const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null);
  const [cameraState, setCameraState] = useState<'prompt' | 'initializing' | 'ready' | 'error'>('prompt');
  const [challengeState, setChallengeState] = useState<'waiting' | 'active' | 'completed'>('waiting');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [captureAttempts, setCaptureAttempts] = useState(0);
  const [opencvReady, setOpencvReady] = useState(false);
  const [faceDetectionBuffer, setFaceDetectionBuffer] = useState<boolean[]>([]);
  const [mobileHandoffDone, setMobileHandoffDone] = useState(false);
  const [mobileResult, setMobileResult] = useState<any>(null);
  
  // Refs for live capture
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const faceClassifierRef = useRef<any>(null);

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

  // Load OpenCV script when needed
  useEffect(() => {
    if (showLiveCapture && !opencvReady) {
      // Check if OpenCV is already available globally
      if (window.cv && window.cv.Mat) {
        console.log('🔧 OpenCV already available, initializing...');
        setOpencvReady(true);
        loadFaceClassifier();
        return;
      }
      
      // Load OpenCV script if not already loaded
      if (!document.getElementById('opencv-script')) {
        const script = document.createElement('script');
        script.id = 'opencv-script';
        script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
        script.async = true;
        script.onload = () => {
          console.log('🔧 OpenCV script loaded');
          // Add delay to ensure OpenCV is fully initialized
          setTimeout(() => {
            initOpenCV();
          }, 100);
        };
        script.onerror = () => {
          console.error('🔧 Failed to load OpenCV script');
          setOpencvReady(false);
        };
        document.head.appendChild(script);
      } else {
        // Script already loaded, check if OpenCV is ready
        setTimeout(() => {
          initOpenCV();
        }, 100);
      }
    }

    return () => {
      if (!showLiveCapture) {
        cleanup();
      }
    };
  }, [showLiveCapture]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const initOpenCV = () => {
    if (window.cv && window.cv.Mat) {
      console.log('🔧 OpenCV ready for live capture');
      setOpencvReady(true);
      loadFaceClassifier();
    } else {
      console.log('🔧 Waiting for OpenCV to be ready...');
      setTimeout(initOpenCV, 200);
    }
  };

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

  // Cleanup function for camera and OpenCV resources
  const cleanup = () => {
    console.log('🧹 Starting cleanup...');
    
    // Stop all media tracks
    if (streamRef.current) {
      console.log('📹 Stopping camera tracks...');
      streamRef.current.getTracks().forEach(track => {
        console.log(`🔴 Stopping track: ${track.kind}, state: ${track.readyState}`);
        track.stop();
      });
      streamRef.current = null;
    }
    
    // Cancel face detection animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      console.log('🔍 Face detection animation cancelled');
    }
    
    // Clean up video element
    if (videoElementRef.current) {
      console.log('📺 Cleaning up video element...');
      videoElementRef.current.srcObject = null;
      videoElementRef.current.pause();
      videoElementRef.current = null;
    }
    
    // Reset camera state
    setCameraState('prompt');
    
    // Reset face detection state
    setFaceDetected(false);
    setFaceDetectionBuffer([]);
    
    // Reset OpenCV state
    setOpencvReady(false);
    faceClassifierRef.current = null;
    
    console.log('✅ Cleanup completed');
  };

  // Load OpenCV face classifier
  const loadFaceClassifier = async () => {
    if (!window.cv || !opencvReady) return;
    
    try {
      // Try to load the face cascade classifier
      const faceCascadeFile = '/models/haarcascade_frontalface_default.xml';
      
      const response = await fetch(faceCascadeFile);
      if (!response.ok) {
        console.warn('Face classifier file not found, using basic detection');
        // Set a flag that we're ready even without the classifier
        console.log('🔧 OpenCV ready without face classifier - using basic detection');
        return;
      }
      
      const buffer = await response.arrayBuffer();
      const data = new Uint8Array(buffer);
      window.cv.FS_createDataFile('/', 'haarcascade_frontalface_default.xml', data, true, false, false);
      faceClassifierRef.current = new window.cv.CascadeClassifier();
      const loaded = faceClassifierRef.current.load('haarcascade_frontalface_default.xml');
      
      if (loaded) {
        console.log('🔧 Face classifier loaded successfully');
      } else {
        console.warn('Face classifier failed to load, using basic detection');
        faceClassifierRef.current = null;
      }
    } catch (error) {
      console.error('Face classifier loading failed:', error);
      faceClassifierRef.current = null;
      console.log('🔧 Continuing with basic detection');
    }
  };

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

  // Initialize camera for live capture
  const initializeCamera = async () => {
    console.log('🎥 Initializing camera...');
    setCameraState('initializing');
    
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this browser');
      }

      console.log('🎥 Requesting camera permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640, min: 320, max: 1280 },
          height: { ideal: 480, min: 240, max: 720 },
          facingMode: 'user'
        },
        audio: false
      });
      
      console.log('🎥 Camera stream obtained', {
        tracks: stream.getTracks().length,
        videoTracks: stream.getVideoTracks().length
      });
      
      streamRef.current = stream;
      setCameraState('ready');
      
      // Reset face detection state for new session
      setFaceDetected(false);
      setFaceDetectionBuffer([]);
      
      // Wait for the UI to render the video element, then connect the stream
      setTimeout(() => {
        if (videoElementRef.current) {
          console.log('🎥 Connecting stream to video element...');
          videoElementRef.current.srcObject = stream;
          
          videoElementRef.current.onloadedmetadata = () => {
            console.log('🎥 Video metadata loaded, starting playback...');
            if (videoElementRef.current) {
              videoElementRef.current.play().then(() => {
                console.log('🎥 Video playing, starting face detection...');
                // Start face detection after a short delay to ensure video is fully loaded
                setTimeout(() => {
                  startFaceDetection();
                }, 1000);
              }).catch(error => {
                console.error('Video play failed:', error);
                toast.error('Failed to start video playback');
              });
            }
          };
          
          videoElementRef.current.onerror = (error) => {
            console.error('Video element error:', error);
            toast.error('Video playback error');
          };
        } else {
          console.warn('🎥 Video element not found in DOM yet, retrying...');
          setTimeout(() => {
            if (videoElementRef.current) {
              videoElementRef.current.srcObject = stream;
            }
          }, 500);
        }
      }, 100);
      
    } catch (error) {
      console.error('Camera initialization failed:', error);
      setCameraState('error');
      
      // More specific error messages
      if (error.name === 'NotAllowedError') {
        toast.error('Camera access denied. Please allow camera permissions and try again.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No camera found. Please connect a camera and try again.');
      } else if (error.name === 'NotReadableError') {
        toast.error('Camera is being used by another application.');
      } else {
        toast.error(`Camera error: ${error.message || 'Unknown error'}`);
      }
    }
  };

  // Start face detection loop
  const startFaceDetection = () => {
    console.log('🔍 Starting face detection...', {
      hasVideo: !!videoElementRef.current,
      hasCanvas: !!canvasRef.current,
      hasOpenCV: !!window.cv,
      hasClassifier: !!faceClassifierRef.current,
      cameraState
    });
    
    console.log('🚀 FACE DETECTION LOOP STARTING NOW!');

    if (!videoElementRef.current || !canvasRef.current) {
      console.warn('Missing video or canvas element for face detection, retrying in 200ms...');
      setTimeout(() => {
        if (cameraState === 'ready' && videoElementRef.current && canvasRef.current) {
          startFaceDetection();
        }
      }, 200);
      return;
    }

    const detectFaces = () => {
      // Face detection initiated
      
      if (!videoElementRef.current || !canvasRef.current) {
        // Stop detection if elements are missing
        console.warn('🚨 Early return from detectFaces - missing elements:', {
          hasVideo: !!videoElementRef.current,
          hasCanvas: !!canvasRef.current,
          cameraState: cameraState
        });
        
        // Retry if we're in a valid camera state
        if (cameraState === 'ready' || showLiveCapture) {
          setTimeout(() => {
            if (cameraState === 'ready' || showLiveCapture) {
              animationRef.current = requestAnimationFrame(detectFaces);
            }
          }, 100);
        }
        return;
      }
      
      // Check if we should be running face detection based on live capture state
      if (!showLiveCapture) {
        console.warn('🚨 Early return from detectFaces - live capture not active:', {
          showLiveCapture: showLiveCapture,
          cameraState: cameraState
        });
        return;
      }

      try {
        const video = videoElementRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          console.warn('No canvas context available');
          animationRef.current = requestAnimationFrame(detectFaces);
          return;
        }

        // Check if video is ready and has dimensions
        if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
          // Video not ready yet, continue loop
          console.log('📹 Video not ready yet:', {
            readyState: video.readyState,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight
          });
          animationRef.current = requestAnimationFrame(detectFaces);
          return;
        }

        // Set canvas dimensions to match video element display size, not video source size
        const displayWidth = video.clientWidth || 640;
        const displayHeight = video.clientHeight || 480;
        
        // Force canvas to have at least minimum dimensions
        const canvasWidth = Math.max(displayWidth, 320);
        const canvasHeight = Math.max(displayHeight, 240);
        
        if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          console.log('🎥 Canvas resized to match video display:', { 
            width: canvasWidth, 
            height: canvasHeight,
            videoDisplay: `${displayWidth}x${displayHeight}`,
            videoClient: `${video.clientWidth}x${video.clientHeight}`
          });
        }
        
        // Debug: Log face detection loop activity
        if (Math.random() < 0.1) { // Log every ~10th frame to avoid spam
          console.log('🔍 Face detection loop running:', {
            canvasSize: `${canvas.width}x${canvas.height}`,
            videoSize: `${video.videoWidth}x${video.videoHeight}`,
            displaySize: `${displayWidth}x${displayHeight}`
          });
        }
        
        // Clear canvas (we'll only draw overlays, not the video itself)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw circular guide overlay
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) * 0.3;
        
        ctx.strokeStyle = '#0066ff';
        ctx.lineWidth = 6;
        ctx.setLineDash([15, 10]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Add instruction text background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(10, 10, 320, 40);
        
        // Add instruction text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('Position your face in the blue circle', 20, 30);
        
        // Try OpenCV face detection if available
        let faceCount = 0;
        // Check face detection capabilities
        
        if (window.cv && window.cv.Mat && faceClassifierRef.current && opencvReady) {
          console.log('🔍 OPENCV: Attempting OpenCV face detection');
          try {
            // Create a temporary canvas to get image data from video
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            if (tempCtx) {
              // Use video's actual dimensions for processing
              const videoWidth = video.videoWidth;
              const videoHeight = video.videoHeight;
              tempCanvas.width = videoWidth;
              tempCanvas.height = videoHeight;
              
              tempCtx.drawImage(video, 0, 0, videoWidth, videoHeight);
              const imageData = tempCtx.getImageData(0, 0, videoWidth, videoHeight);
              
              const src = window.cv.matFromImageData(imageData);
              const gray = new window.cv.Mat();
              const faces = new window.cv.RectVector();
              
              // Convert to grayscale and detect faces
              window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY);
              // Use more lenient parameters: scale=1.05, minNeighbors=2, minSize=30x30
              faceClassifierRef.current.detectMultiScale(gray, faces, 1.05, 2, 0, new window.cv.Size(30, 30));
              
              faceCount = faces.size();
              console.log(`🔍 OPENCV: Detected ${faceCount} faces`);
              
              // Calculate scale factors to map from video coordinates to display coordinates
              const scaleX = canvas.width / videoWidth;
              const scaleY = canvas.height / videoHeight;
              
              // Face detection successful - count recorded but no visual overlay drawn
              
              // Cleanup OpenCV objects
              try {
                src.delete();
                gray.delete();
                faces.delete();
              } catch (cleanupError) {
                console.warn('OpenCV cleanup error:', cleanupError);
              }
            }
            
          } catch (cvError) {
            console.warn('OpenCV face detection error:', cvError);
          }
        } else {
          // Improved fallback: basic brightness-based face detection
          try {
            // Create a temporary canvas to get image data from video
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            if (!tempCtx) throw new Error('Could not get temp canvas context');
            
            // Set temp canvas size to match video
            tempCanvas.width = video.videoWidth;
            tempCanvas.height = video.videoHeight;
            
            // Draw current video frame to temp canvas
            tempCtx.drawImage(video, 0, 0);
            
            // Get image data from center region where face should be
            const faceRegionSize = Math.min(video.videoWidth, video.videoHeight) * 0.4;
            const startX = (video.videoWidth - faceRegionSize) / 2;
            const startY = (video.videoHeight - faceRegionSize) / 2;
            
            const imageData = tempCtx.getImageData(startX, startY, faceRegionSize, faceRegionSize);
            const pixels = imageData.data;
            
            // Calculate average brightness and detect skin tone patterns
            let totalBrightness = 0;
            let skinTonePixels = 0;
            const pixelCount = pixels.length / 4;
            
            for (let i = 0; i < pixels.length; i += 4) {
              const r = pixels[i];
              const g = pixels[i + 1];
              const b = pixels[i + 2];
              
              // Calculate brightness
              const brightness = (r + g + b) / 3;
              totalBrightness += brightness;
              
              // More flexible skin tone detection
              const isLightSkin = r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15;
              const isMediumSkin = r > 80 && g > 50 && b > 30 && r >= g && brightness > 60;
              const isDarkSkin = r > 60 && g > 40 && b > 25 && Math.abs(r - g) < 30 && brightness > 40;
              
              if ((isLightSkin || isMediumSkin || isDarkSkin) && brightness > 30 && brightness < 250) {
                skinTonePixels++;
              }
            }
            
            const avgBrightness = totalBrightness / pixelCount;
            const skinToneRatio = skinTonePixels / pixelCount;
            
            // Detect face based on skin tone presence and brightness variation
            const hasFaceFeatures = skinToneRatio > 0.02 && avgBrightness > 30 && avgBrightness < 240;
            faceCount = hasFaceFeatures ? 1 : 0;
            
            // Fallback face detection analysis
            console.log('🔍 FALLBACK Face detection:', { 
              faceCount, 
              skinToneRatio: skinToneRatio.toFixed(3), 
              avgBrightness: avgBrightness.toFixed(1),
              skinTonePixels,
              totalPixels: pixelCount,
              hasFaceFeatures,
              opencvReady,
              faceRegionSize: Math.round(faceRegionSize)
            });
            
            if (faceCount > 0) {
              // Draw simple detection indicator in center area
              const detectionSize = radius * 0.8;
              ctx.strokeStyle = '#00ff00';
              ctx.lineWidth = 4;
              ctx.strokeRect(centerX - detectionSize/2, centerY - detectionSize/2, detectionSize, detectionSize);
              ctx.fillStyle = '#00ff00';
              ctx.font = 'bold 16px Arial';
              ctx.fillText('FACE DETECTED', centerX - detectionSize/2, centerY - detectionSize/2 - 15);
            }
          } catch (fallbackError) {
            console.warn('Fallback face detection error:', fallbackError);
            faceCount = 0;
          }
        }
        
        // Add current detection to buffer for stability
        const currentDetection = faceCount > 0;
        setFaceDetectionBuffer(prev => {
          const newBuffer = [...prev, currentDetection].slice(-5); // Keep last 5 detections
          
          // Only update faceDetected if we have consistent results
          const trueCount = newBuffer.filter(Boolean).length;
          const falseCount = newBuffer.filter(x => !x).length;
          
          if (trueCount >= 3 && !faceDetected) {
            // Face has been detected consistently for 3+ frames
            setFaceDetected(true);
          } else if (falseCount >= 3 && faceDetected) {
            // Face has been missing consistently for 3+ frames
            setFaceDetected(false);
          }
          
          return newBuffer;
        });
        
      } catch (error) {
        console.error('Face detection error:', error);
      }
      
      // Continue the animation loop
      animationRef.current = requestAnimationFrame(detectFaces);
    };
    
    console.log('🔍 Starting face detection animation loop');
    animationRef.current = requestAnimationFrame(detectFaces);
  };

  // Capture selfie
  const captureSelfie = async () => {
    if (!videoElementRef.current || !apiKey || !verificationId) {
      toast.error('Camera not ready or missing credentials');
      return;
    }

    if (!faceDetected) {
      toast.error('Please position your face within the frame');
      return;
    }

    setChallengeState('active');
    setIsLoading(true);

    try {
      // Create a capture canvas from the video
      const video = videoElementRef.current;
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = video.videoWidth;
      captureCanvas.height = video.videoHeight;
      
      const captureCtx = captureCanvas.getContext('2d');
      if (!captureCtx) {
        throw new Error('Failed to create capture context');
      }
      
      // Draw the current video frame to capture canvas
      captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
      
      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        captureCanvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/jpeg', 0.8);
      });

      if (!blob) {
        throw new Error('Failed to capture image');
      }

      // Convert blob to base64
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const useSandbox = shouldUseSandbox();
      const url = new URL(`${API_BASE_URL}/api/verify/live-capture`);
      if (useSandbox) {
        url.searchParams.append('sandbox', 'true');
      }

      console.log('📸 Capturing selfie...', { verificationId, sandbox: useSandbox });

      const requestBody = {
        verification_id: verificationId,
        live_image_data: base64Image,
        challenge_response: 'blink',
        ...(useSandbox && { sandbox: true })
      };

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Live capture failed');
      }

      const result = await response.json();
      setCaptureResult(result);
      setChallengeState('completed');
      
      toast.success('Selfie captured successfully!');
      
      // Immediately cleanup camera resources
      console.log('📸 Selfie captured, cleaning up camera...');
      cleanup();
      
      // Hide live capture interface
      setShowLiveCapture(false);
      
      // Load verification results and move to next step
      setTimeout(() => {
        loadVerificationResults(verificationId);
        setCurrentStep(5);
      }, 1000);

    } catch (error) {
      console.error('Selfie capture failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to capture selfie');
      setChallengeState('waiting');
      
      // Clean up camera on error as well
      console.log('❌ Selfie capture failed, cleaning up camera...');
      cleanup();
      setShowLiveCapture(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle live capture
  const handleLiveCapture = async () => {
    if (!apiKey || !verificationId) {
      toast.error('Please start verification session and upload document first');
      return;
    }

    setShowLiveCapture(true);
    setCameraState('prompt');
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
  const renderProgressIndicator = () => {
    const steps = [
      { label: 'Start',    icon: '🔑' },
      { label: 'Upload',   icon: '📄' },
      { label: 'Process',  icon: '⚙️' },
      { label: 'Verify',   icon: '🤳' },
      { label: 'Complete', icon: '✓'  },
    ];
    return (
      <div className="mb-10">
        <div className="flex items-start">
          {steps.map((s, i) => {
            const stepNum = i + 1;
            const isCompleted = stepNum < currentStep;
            const isActive    = stepNum === currentStep;
            return (
              <React.Fragment key={stepNum}>
                {/* Circle + label */}
                <div className="flex flex-col items-center gap-1.5 min-w-0">
                  <div
                    className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold transition-all duration-300 ${
                      isCompleted
                        ? 'bg-blue-600 text-white'
                        : isActive
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-110'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isCompleted
                      ? <CheckCircleIcon className="w-5 h-5" />
                      : stepNum}
                  </div>
                  <span
                    className={`text-[11px] font-medium whitespace-nowrap transition-colors duration-300 ${
                      isActive    ? 'text-blue-600' :
                      isCompleted ? 'text-gray-600' : 'text-gray-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>

                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="flex-1 mx-2 mt-[18px]">
                    <div className="h-0.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: stepNum < currentStep ? '100%' : '0%' }}
                      />
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  // Render embedded live capture
  const renderLiveCapture = () => (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Live Selfie Capture</h3>
        <button
          onClick={() => {
            cleanup();
            setShowLiveCapture(false);
          }}
          className="text-gray-500 hover:text-gray-700"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        {cameraState === 'prompt' && (
          <div className="text-center py-8">
            <CameraIcon className="h-12 w-12 mx-auto text-blue-600 mb-4" />
            <h4 className="text-lg font-semibold mb-2">Ready for Live Capture</h4>
            <p className="text-gray-600 mb-6">
              We'll use your camera to take a selfie for identity verification.
            </p>
            <button
              onClick={initializeCamera}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Start Camera
            </button>
          </div>
        )}

        {cameraState === 'initializing' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Initializing camera...</p>
          </div>
        )}

        {cameraState === 'ready' && (
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '240px', height: '320px' }}>
              {/* Video element for camera feed */}
              <video
                ref={videoElementRef}
                autoPlay
                playsInline
                muted
                controls={false}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ 
                  display: 'block',
                  backgroundColor: '#000',
                  borderRadius: '0.5rem'
                }}
                onLoadedMetadata={() => {
                  console.log('🎥 Video metadata loaded in UI');
                  if (videoElementRef.current) {
                    videoElementRef.current.play().then(() => {
                      console.log('🎥 Video playing in UI');
                    }).catch(err => {
                      console.error('🎥 Video play error:', err);
                    });
                  }
                }}
                onError={(e) => {
                  console.error('🎥 Video element error:', e);
                }}
              />
              
              {/* Canvas overlay for face detection - positioned over video */}
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ 
                  display: 'block',
                  backgroundColor: 'transparent',
                  zIndex: 20,
                  position: 'absolute'
                }}
              />
              
              {/* Face detection indicator */}
              <div className="absolute top-4 right-4">
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                  faceDetected 
                    ? 'bg-green-500 text-white' 
                    : 'bg-red-500 text-white'
                }`}>
                  <EyeIcon className="h-4 w-4" />
                  <span>{faceDetected ? 'Face Detected' : 'No Face'}</span>
                </div>
              </div>
              
              {/* Instructions overlay */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-black bg-opacity-70 text-white p-3 rounded-lg text-center">
                  <p className="text-sm">
                    {!faceDetected 
                      ? 'Position your face within the blue circle' 
                      : 'Great! Click capture when ready'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={captureSelfie}
                disabled={!faceDetected || isLoading}
                className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${
                  faceDetected && !isLoading
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isLoading ? 'Capturing...' : 'Capture Selfie'}
              </button>
              
              <button
                onClick={() => {
                  cleanup();
                  setShowLiveCapture(false);
                }}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {cameraState === 'error' && (
          <div className="text-center py-8">
            <ExclamationTriangleIcon className="h-12 w-12 mx-auto text-red-600 mb-4" />
            <h4 className="text-lg font-semibold mb-2 text-red-600">Camera Error</h4>
            <p className="text-gray-600 mb-6">
              Unable to access your camera. Please check permissions and try again.
            </p>
            <button
              onClick={initializeCamera}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="py-8">
            {mobileHandoffDone ? (
              // Mobile completed — show result inline
              <div className="max-w-md mx-auto text-center py-8">
                <div className="text-5xl mb-3">
                  {mobileResult?.status === 'verified' || mobileResult?.status === 'completed' ? '✓' : '✗'}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {mobileResult?.status === 'verified' || mobileResult?.status === 'completed'
                    ? 'Verification Complete'
                    : mobileResult?.status === 'failed'
                    ? 'Verification Failed'
                    : 'Under Review'}
                </h2>
                <p className="text-gray-500 text-sm">Completed on mobile device</p>
                {mobileResult?.confidence_score != null && (
                  <p className="text-sm text-gray-600 mt-2">
                    Confidence: {Math.round(mobileResult.confidence_score * 100)}%
                  </p>
                )}
                {(mobileResult?.status === 'failed' || mobileResult?.status === 'manual_review') && (
                  <button
                    onClick={() => { setMobileHandoffDone(false); setMobileResult(null); }}
                    className="mt-4 text-sm text-blue-600 hover:text-blue-700 underline underline-offset-2"
                  >
                    Try Again
                  </button>
                )}
              </div>
            ) : (
              <>
                <h2 className="text-xl sm:text-2xl font-bold mb-2 text-center">
                  Identity Verification Demo
                </h2>
                <p className="text-gray-500 text-sm mb-6 text-center">
                  Enter your API key, then verify on this device or scan to use your phone.
                </p>

                {/* API Key and User ID inputs */}
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
                </div>

                {/* Two-column choice */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mt-6">
                  {/* Desktop */}
                  <div className="border border-gray-200 rounded-2xl p-6 flex flex-col items-center text-center gap-3">
                    <div className="text-4xl">💻</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Start Here</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Use webcam and upload documents on this device
                      </p>
                    </div>
                    <button
                      onClick={startVerification}
                      disabled={isLoading || !apiKey.trim() || !userId.trim()}
                      className="mt-1 w-full py-2.5 px-4 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? 'Starting…' : 'Start on This Device'}
                    </button>
                  </div>

                  {/* Mobile */}
                  <ContinueOnPhone
                    apiKey={apiKey}
                    userId={userId}
                    onComplete={(result) => {
                      setMobileResult(result);
                      setMobileHandoffDone(true);
                    }}
                  />
                </div>
              </>
            )}
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
              We're extracting information from your document using OCR and PDF417 barcode scanning. This may take a few moments...
            </p>
          </div>
        );

      case 4:
        const ocrData = verificationRequest?.ocr_data;
        
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
                    toast.success('Back-of-ID uploaded successfully with PDF417 parsing!');
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
                  Back-of-ID successfully processed with PDF417 barcode scanning, QR code detection, and cross-validation.
                </p>
              </div>
            )}

            {/* Embedded Live Capture */}
            {backOfIdUploaded && showLiveCapture && renderLiveCapture()}

            {/* Live Capture Controls - Only show after back-of-ID is uploaded */}
            {backOfIdUploaded && !showLiveCapture && (
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">Identity Verification</h3>
                <p className="text-gray-600 mb-6">
                  Now we need to verify that you're the person in the document using live capture.
                </p>
                
                <div className="space-y-4">
                  <button
                    onClick={handleLiveCapture}
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <CameraIcon className="h-5 w-5" />
                    <span>Start Live Capture</span>
                  </button>
                  
                  <button
                    onClick={skipLiveCapture}
                    className="w-full bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                  >
                    Skip Live Capture (Complete Verification)
                  </button>
                </div>
              </div>
            )}

            {/* Instructions when back-of-ID is not uploaded */}
            {!backOfIdUploaded && (
              <div className="text-center bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="text-blue-600 mb-2">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Next Step: Upload Back-of-ID</h3>
                <p className="text-blue-700 text-sm">
                  Please upload the back of your ID above for enhanced verification with PDF417 barcode scanning and cross-validation before proceeding to live capture.
                </p>
              </div>
            )}
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
              Demo Verification {status === 'verified' ? 'Complete' : status === 'failed' ? 'Failed' : 'Under Review'}
            </h2>
            
            <p className="text-gray-600 mb-6">
              {status === 'verified' && 'Your identity has been successfully verified with live capture and PDF417 validation.'}
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
                  {captureResult && (
                    <div className="flex justify-between">
                      <span>Live Capture:</span>
                      <span className="text-green-600">✓ Complete</span>
                    </div>
                  )}
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
              Start New Demo
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ── HERO ── */}
      <div className="bg-[#0F172A] text-white">
        <div className="max-w-6xl mx-auto px-6">
          {/* Hero content */}
          <div className="py-20 text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
              Live Interactive Demo
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold mb-6 leading-tight tracking-tight">
              Identity Verification
              <br />
              <span className="text-blue-400">Built for Developers</span>
            </h1>
            <p className="text-gray-400 text-lg mb-10 leading-relaxed">
              Production-ready KYC API with AI-powered document OCR, liveness detection,
              and face matching. Integrate in under 30 minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#demo"
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors"
              >
                Try Demo ↓
              </a>
              <a
                href="/docs"
                className="w-full sm:w-auto bg-white/10 hover:bg-white/15 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors"
              >
                View Docs →
              </a>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                AI-Powered OCR
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                Under 3 Minutes
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                90%+ Accuracy
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                GDPR Compliant
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── FEATURES STRIP ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '📄', title: 'Document OCR', desc: 'Extracts name, DOB, ID number from passports, licenses, and national IDs' },
              { icon: '👤', title: 'Face Matching', desc: 'Matches selfie against document photo with configurable confidence threshold' },
              { icon: '👁', title: 'Liveness Detection', desc: 'Real-time challenge-response to prevent spoofing with printed photos or videos' },
              { icon: '🔑', title: 'API-First', desc: 'RESTful API with webhook callbacks, sandbox mode, and SDKs for JS and Python' },
            ].map(f => (
              <div key={f.title} className="flex flex-col gap-2">
                <div className="text-2xl">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 text-sm">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── VERIFICATION WIDGET ── */}
      <div id="demo" className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-8">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest">Interactive Demo</span>
          <h2 className="text-3xl font-bold text-gray-900 mt-2">Try It Live</h2>
          <p className="text-gray-500 mt-2 text-sm">Use your real API key — this calls the actual verification API</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          {renderProgressIndicator()}
          {renderStepContent()}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div className="bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
            {[
              { step: '1', icon: '📤', title: 'Upload ID', desc: 'User uploads a photo of their government-issued ID. Our AI extracts and validates the data.' },
              { step: '2', icon: '🤳', title: 'Live Selfie', desc: 'A real-time liveness challenge confirms the person is physically present, not a photo or video.' },
              { step: '3', icon: '⚡', title: 'Instant Result', desc: 'Receive a verification result in seconds with confidence scores via API response or webhook.' },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-2xl">
                  {s.icon}
                </div>
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full text-xs font-bold flex items-center justify-center">
                  {s.step}
                </div>
                <h3 className="font-semibold text-gray-900">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── DEVELOPER CTA ── */}
      <div className="bg-[#0F172A] text-white">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold mb-3">Integrate in 30 Minutes</h2>
          <p className="text-gray-400 mb-8">One API call to start a verification session.</p>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left font-mono text-sm text-gray-300 max-w-xl mx-auto mb-8 overflow-x-auto">
            <span className="text-gray-500"># Start a verification</span>
            <br />
            curl -X POST https://api.idswyft.app/api/verify/start \
            <br />
            {'  '}-H <span className="text-emerald-400">"X-API-Key: YOUR_KEY"</span> \
            <br />
            {'  '}-d <span className="text-blue-400">{'\'{"user_id":"usr_123"}\''}</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/developer"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors"
            >
              Get Free API Key →
            </a>
            <a
              href="/docs"
              className="w-full sm:w-auto bg-white/10 hover:bg-white/15 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors"
            >
              Read the Docs →
            </a>
          </div>
        </div>
      </div>

    </div>
  );
};

export { DemoPage };
export default DemoPage;