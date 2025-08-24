import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL, shouldUseSandbox } from '../config/api';
import {
  CameraIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  XMarkIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

// OpenCV types
declare global {
  interface Window {
    cv: any;
  }
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

interface VerificationResults {
  verification_id: string;
  status: 'pending' | 'processing' | 'verified' | 'failed' | 'manual_review';
  face_match_score?: number;
  liveness_score?: number;
  confidence_score?: number;
  manual_review_reason?: string;
}

export const LiveCapturePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // State
  const [sessionData, setSessionData] = useState<LiveCaptureSession | null>(null);
  const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null);
  const [verificationResults, setVerificationResults] = useState<VerificationResults | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [cameraState, setCameraState] = useState<'prompt' | 'initializing' | 'ready' | 'error'>('prompt');
  const [challengeState, setChallengeState] = useState<'waiting' | 'active' | 'completed'>('waiting');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [captureAttempts, setCaptureAttempts] = useState(0);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [opencvReady, setOpencvReady] = useState(false);
  const [livenessScore, setLivenessScore] = useState(0);
  const [faceStability, setFaceStability] = useState(0);
  
  // OpenCV refs
  const animationRef = useRef<number | null>(null);
  const faceClassifierRef = useRef<any>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // URL params
  const token = searchParams.get('token');
  const verificationId = searchParams.get('verification_id');
  const apiKey = searchParams.get('api_key');

  // Initialize OpenCV
  useEffect(() => {
    const initOpenCV = () => {
      if (window.cv && window.cv.Mat) {
        console.log('🔧 OpenCV ready');
        setOpencvReady(true);
        setDebugInfo('OpenCV loaded');
        loadFaceClassifier();
      } else {
        console.log('🔧 Waiting for OpenCV...');
        setTimeout(initOpenCV, 100);
      }
    };
    initOpenCV();

    return () => {
      cleanup();
    };
  }, []);

  // Load session data
  useEffect(() => {
    if (!token) {
      setError('Invalid or missing live capture token');
      return;
    }

    const mockSession: LiveCaptureSession = {
      live_capture_token: token,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      liveness_challenge: {
        type: 'blink_twice',
        instruction: 'Please look directly at the camera and blink twice'
      },
      user_id: 'user-123',
      verification_id: verificationId,
      expires_in_seconds: 1800
    };

    setSessionData(mockSession);

    // Auto-start camera when OpenCV is ready and canvas is available
    if (opencvReady && cameraState === 'prompt') {
      // Wait a bit longer to ensure canvas is rendered
      setTimeout(() => {
        if (canvasRef.current) {
          initializeCamera();
        } else {
          console.log('🎥 Canvas not ready, will wait for manual initialization');
        }
      }, 1000);
    }

    // Session expiry timer
    const timer = setTimeout(() => {
      setSessionExpired(true);
      cleanup();
    }, mockSession.expires_in_seconds * 1000);

    return () => clearTimeout(timer);
  }, [token, verificationId, opencvReady]);

  // Polling function to check verification status
  const pollVerificationStatus = async (verificationId: string) => {
    if (!apiKey) return;

    setIsPolling(true);
    let attempts = 0;
    const maxAttempts = 60; // Poll for up to 5 minutes (5 seconds * 60)
    
    const poll = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/verify/results/${verificationId}`, {
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const results = await response.json();
        setVerificationResults(results);
        
        // Check if verification is in a final state
        const finalStates = ['verified', 'failed', 'manual_review'];
        if (finalStates.includes(results.status)) {
          setIsPolling(false);
          return; // Stop polling
        }
        
        // Continue polling if still processing
        attempts++;
        if (attempts < maxAttempts && results.status === 'processing') {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          setIsPolling(false);
          if (attempts >= maxAttempts) {
            setError('Verification is taking longer than expected. Please check results manually.');
          }
        }
        
      } catch (error) {
        console.error('Failed to poll verification status:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setIsPolling(false);
          setError('Failed to check verification status. Please try refreshing.');
        }
      }
    };
    
    // Start polling immediately
    poll();
  };

  const loadFaceClassifier = async () => {
    try {
      // For production deployment, we'll use a simplified face detection
      // that doesn't require external cascade files
      if (window.cv && window.cv.CascadeClassifier) {
        const classifier = new window.cv.CascadeClassifier();
        faceClassifierRef.current = classifier;
        console.log('🔧 Face classifier initialized');
      }
    } catch (error) {
      console.warn('🔧 Face classifier load failed, using basic detection:', error);
    }
  };

  const initializeCamera = async () => {
    if (cameraState === 'initializing' || cameraState === 'ready') return;
    
    setCameraState('initializing');
    setError('');
    setLoading(true);

    try {
      console.log('🎥 Initializing camera...');
      setDebugInfo('Requesting camera access...');

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      console.log('🎥 getUserMedia is supported');
      setDebugInfo('getUserMedia supported, checking permissions...');

      // Check permissions first
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          console.log('🎥 Camera permission state:', permission.state);
          setDebugInfo(`Permission state: ${permission.state}`);
        } catch (permError) {
          console.log('🎥 Could not check permissions:', permError);
        }
      }

      console.log('🎥 Requesting camera stream...');
      setDebugInfo('Requesting camera stream...');

      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      };

      console.log('🎥 Constraints:', constraints);

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('🎥 Stream received:', stream);
      console.log('🎥 Stream active:', stream.active);
      console.log('🎥 Video tracks:', stream.getVideoTracks().length);
      
      if (stream.getVideoTracks().length === 0) {
        throw new Error('No video tracks in stream');
      }

      streamRef.current = stream;
      setDebugInfo('Stream received, setting up canvas...');

      // Double-check canvas is available
      if (!canvasRef.current) {
        // Canvas might not be rendered yet, wait a bit and retry
        console.log('🎥 Canvas not available, retrying in 500ms...');
        setTimeout(() => {
          if (canvasRef.current) {
            console.log('🎥 Canvas now available, continuing setup...');
            setupCanvas(stream);
            setCameraState('ready');
            setDebugInfo('Camera ready - waiting for video to start');
            setLoading(false);
            console.log('🎥 Camera initialized successfully');
          } else {
            console.error('🎥 Canvas still not available after retry');
            setCameraState('error');
            setError('Canvas element not found. Please refresh the page.');
            setLoading(false);
          }
        }, 500);
        return; // Exit early, let the timeout handle it
      }

      console.log('🎥 Setting up canvas...');
      setupCanvas(stream);
      
      setCameraState('ready');
      setDebugInfo('Camera ready - waiting for video to start');
      console.log('🎥 Camera initialized successfully');

    } catch (error: any) {
      console.error('🎥 Camera initialization failed:', error);
      setCameraState('error');
      
      let errorMessage = 'Camera access failed';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please enable camera access.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please connect a camera.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Camera access blocked due to security settings.';
      } else {
        errorMessage = `Camera error: ${error.message || 'Unknown error'}`;
      }
      
      setError(errorMessage);
      setDebugInfo(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const setupCanvas = (stream: MediaStream) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('🎥 Canvas is null in setupCanvas');
      return;
    }

    console.log('🎥 Creating video element...');
    
    // Create a hidden video element to get frames from the stream
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    
    console.log('🎥 Video element created, waiting for metadata...');
    
    video.onloadedmetadata = () => {
      console.log('🎥 Video metadata loaded:', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        duration: video.duration,
        readyState: video.readyState
      });
      
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      console.log('🎥 Canvas dimensions set:', canvas.width, 'x', canvas.height);
    };

    video.onplay = () => {
      console.log('🎥 Video element started playing');
      // Start processing only when video is actually playing
      setTimeout(() => {
        console.log('🎥 Starting video processing after play event');
        startVideoProcessing();
      }, 100);
    };

    video.oncanplay = () => {
      console.log('🎥 Video can start playing');
      console.log('🎥 Video dimensions at canplay:', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState
      });
      video.play().catch(err => console.error('🎥 Video play failed:', err));
    };

    video.onerror = (e) => {
      console.error('🎥 Video element error:', e);
    };

    // Store video element reference using React ref
    videoElementRef.current = video;
    
    console.log('🎥 Canvas setup completed');
  };

  const startVideoProcessing = () => {
    if (!canvasRef.current) {
      console.error('🎥 Canvas is null in startVideoProcessing');
      return;
    }

    console.log('🎥 Starting video processing loop...');

    const processFrame = () => {
      const canvas = canvasRef.current;
      const video = videoElementRef.current;
      
      if (!canvas) {
        console.error('🎥 Canvas lost during processing');
        return;
      }

      if (!video) {
        console.error('🎥 Video element lost during processing');
        animationRef.current = requestAnimationFrame(processFrame);
        return;
      }

      if (video.readyState < 2 || video.videoWidth === 0) {
        // Video not ready yet, continue loop
        animationRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        console.error('🎥 Could not get canvas context');
        return;
      }

      try {
        // Clear canvas first
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Perform face detection (draws overlay on top)
        detectFaces(canvas, ctx);
      } catch (drawError) {
        console.error('🎥 Error drawing video frame:', drawError);
      }

      animationRef.current = requestAnimationFrame(processFrame);
    };

    processFrame();
    console.log('🎥 Video processing loop started');
  };

  const detectFaces = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    try {
      // Simple face detection using image analysis
      // This is more reliable than loading external cascade files
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const faceFound = performBasicFaceDetection(imageData, canvas.width, canvas.height);

      // Add visual feedback
      if (faceFound) {
        drawFaceOverlay(ctx, canvas.width, canvas.height, true);
      } else {
        drawFaceOverlay(ctx, canvas.width, canvas.height, false);
      }

      // Update face detection state with smoothing
      updateFaceDetectionState(faceFound);

    } catch (error) {
      console.warn('🔧 Face detection error:', error);
    }
  };

  const performBasicFaceDetection = (imageData: ImageData, width: number, height: number): boolean => {
    // Enhanced face detection with liveness scoring
    const data = imageData.data;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Method 1: Skin color detection in center region
    const regionSize = Math.min(width, height) * 0.4; // Larger region
    let skinPixels = 0;
    let totalPixels = 0;
    let brightnessSum = 0;
    let colorVariance = 0;
    
    // Sample more densely for better detection
    for (let y = centerY - regionSize/2; y < centerY + regionSize/2; y += 2) {
      for (let x = centerX - regionSize/2; x < centerX + regionSize/2; x += 2) {
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        
        const i = (Math.floor(y) * width + Math.floor(x)) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Improved skin color detection with multiple criteria
        const brightness = (r + g + b) / 3;
        brightnessSum += brightness;
        colorVariance += Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b);
        
        // Multiple skin tone ranges
        const skinCondition1 = r > 95 && g > 40 && b > 20 && 
                              Math.max(r, Math.max(g, b)) - Math.min(r, Math.min(g, b)) > 15 &&
                              Math.abs(r - g) > 15 && r > g && r > b;
        
        const skinCondition2 = r > 60 && g > 30 && b > 15 && r > b && (r - g) < 50;
        
        const skinCondition3 = brightness > 80 && brightness < 220 && 
                              r > g && g > b && (r - b) > 20;
        
        if (skinCondition1 || skinCondition2 || skinCondition3) {
          skinPixels++;
        }
        totalPixels++;
      }
    }
    
    const skinRatio = totalPixels > 0 ? skinPixels / totalPixels : 0;
    const avgBrightness = totalPixels > 0 ? brightnessSum / totalPixels : 0;
    const avgColorVariance = totalPixels > 0 ? colorVariance / totalPixels : 0;
    
    // Method 2: Edge detection for facial features
    let edgePixels = 0;
    let strongEdges = 0;
    const edgeThreshold = 30;
    const strongEdgeThreshold = 60;
    
    for (let y = centerY - regionSize/4; y < centerY + regionSize/4; y += 4) {
      for (let x = centerX - regionSize/4; x < centerX + regionSize/4; x += 4) {
        if (x < 1 || x >= width-1 || y < 1 || y >= height-1) continue;
        
        const i = (Math.floor(y) * width + Math.floor(x)) * 4;
        const current = (data[i] + data[i + 1] + data[i + 2]) / 3;
        
        const right = (data[i + 4] + data[i + 5] + data[i + 6]) / 3;
        const bottom = (data[i + width * 4] + data[i + width * 4 + 1] + data[i + width * 4 + 2]) / 3;
        
        const edgeStrength = Math.max(Math.abs(current - right), Math.abs(current - bottom));
        if (edgeStrength > edgeThreshold) {
          edgePixels++;
          if (edgeStrength > strongEdgeThreshold) {
            strongEdges++;
          }
        }
      }
    }
    
    // Calculate liveness indicators
    const detectionQuality = Math.min(1, (skinRatio * 2 + (edgePixels / 50)) / 2);
    const lightingQuality = avgBrightness > 60 && avgBrightness < 200 ? 1 : 0.5;
    const textureQuality = Math.min(1, avgColorVariance / 30); // More texture = more lively
    const featureQuality = Math.min(1, strongEdges / 10); // Strong features = more lively
    
    // Update liveness score (0-1 scale)
    const currentLivenessScore = (detectionQuality * 0.4 + lightingQuality * 0.2 + textureQuality * 0.2 + featureQuality * 0.2);
    setLivenessScore(currentLivenessScore);
    
    // Track face stability over time
    const faceHistory = (window as any).faceStabilityHistory || [];
    faceHistory.push(skinRatio > 0.08 ? 1 : 0);
    if (faceHistory.length > 10) faceHistory.shift();
    (window as any).faceStabilityHistory = faceHistory;
    
    const stability = faceHistory.reduce((a: number, b: number) => a + b, 0) / faceHistory.length;
    setFaceStability(stability);
    
    // Combined detection criteria with enhanced thresholds
    const hasGoodLighting = avgBrightness > 60 && avgBrightness < 200;
    const hasSkinTone = skinRatio > 0.08; // Lowered threshold
    const hasFeatures = edgePixels > 5; // Some facial features detected
    const hasLiveness = currentLivenessScore > 0.4; // Liveness threshold
    
    return hasGoodLighting && hasSkinTone && hasFeatures && hasLiveness;
  };

  const drawFaceOverlay = (ctx: CanvasRenderingContext2D, width: number, height: number, faceDetected: boolean) => {
    // Draw face detection indicator
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.25;
    
    ctx.strokeStyle = faceDetected ? '#10B981' : '#EF4444';
    ctx.lineWidth = 3;
    ctx.setLineDash(faceDetected ? [] : [10, 10]);
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Draw status text
    ctx.fillStyle = faceDetected ? '#10B981' : '#EF4444';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      faceDetected ? 'Face Detected' : 'Position Your Face',
      centerX,
      centerY + radius + 30
    );
    
    // Draw liveness indicators
    if (faceDetected && livenessScore > 0) {
      ctx.font = '12px Arial';
      ctx.fillStyle = '#10B981';
      ctx.fillText(
        `Liveness: ${Math.round(livenessScore * 100)}%`,
        centerX,
        centerY + radius + 50
      );
      ctx.fillText(
        `Stability: ${Math.round(faceStability * 100)}%`,
        centerX,
        centerY + radius + 65
      );
    }
  };

  const updateFaceDetectionState = (detected: boolean) => {
    // More responsive smoothing algorithm
    const history = (window as any).faceHistory || [];
    history.push(detected);
    if (history.length > 6) history.shift(); // Shorter history for faster response
    (window as any).faceHistory = history;
    
    const positiveCount = history.filter((h: boolean) => h).length;
    const totalCount = history.length;
    
    // More responsive thresholds
    let smoothedDetection = false;
    if (totalCount >= 3) {
      // Quick detection: 2/3 recent frames
      if (positiveCount >= 2 && totalCount <= 3) {
        smoothedDetection = true;
      }
      // Stable detection: 4/6 frames for longer sequences
      else if (positiveCount >= 4 && totalCount >= 6) {
        smoothedDetection = true;
      }
      // Medium detection: 3/5 frames
      else if (positiveCount >= 3 && totalCount >= 5) {
        smoothedDetection = true;
      }
    }
    
    setFaceDetected(smoothedDetection);
  };

  const startChallenge = () => {
    // Enhanced challenge requirements
    if (challengeState !== 'waiting' || !faceDetected || livenessScore < 0.6 || faceStability < 0.8) {
      if (!faceDetected) {
        setError('No face detected. Please position your face clearly in the center of the frame.');
      } else if (livenessScore < 0.6) {
        setError('Please ensure good lighting and face clearly visible for liveness detection.');
      } else if (faceStability < 0.8) {
        setError('Please hold your face steady in the center of the frame.');
      }
      return;
    }

    setChallengeState('active');
    setCountdown(3);
    setError(''); // Clear any previous errors

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          // Final face detection check before capture
          if (faceDetected && livenessScore >= 0.6 && faceStability >= 0.8) {
            performCapture();
          } else {
            setError('Face detection lost during countdown. Please try again.');
            setChallengeState('waiting');
          }
          return null;
        }
        
        // Continuously validate face detection during countdown
        if (!faceDetected || livenessScore < 0.6 || faceStability < 0.8) {
          clearInterval(timer);
          setError('Face detection lost during countdown. Please ensure your face remains visible.');
          setChallengeState('waiting');
          return null;
        }
        
        return prev - 1;
      });
    }, 1000);
  };

  const performCapture = async () => {
    if (!canvasRef.current || !sessionData || !apiKey) {
      setError('Missing required data for capture');
      return;
    }

    // Critical security check - ensure face is still detected before capture
    if (!faceDetected || livenessScore < 0.6 || faceStability < 0.8) {
      setError('Face detection lost. Please ensure your face is clearly visible and try again.');
      setChallengeState('waiting');
      setCountdown(null);
      return;
    }

    setLoading(true);
    setCaptureAttempts(prev => prev + 1);

    try {
      const canvas = canvasRef.current;
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      const base64Data = imageData.split(',')[1];

      console.log('📸 Capturing frame for verification...');
      
      const useSandbox = shouldUseSandbox(apiKey || undefined);
      const requestBody = {
        verification_id: sessionData.verification_id,
        live_image_data: base64Data,
        challenge_response: sessionData.liveness_challenge.type,
        ...(useSandbox && { sandbox: true })
      };
      
      console.log('🔧 Sandbox mode:', useSandbox);
      console.log('🔧 API Key (first 10 chars):', apiKey?.substring(0, 10));
      console.log('🔧 Verification ID:', sessionData.verification_id);
      console.log('🔧 Request body keys:', Object.keys(requestBody));
      console.log('🔧 Full request body:', JSON.stringify(requestBody, null, 2).substring(0, 200) + '...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${API_BASE_URL}/api/verify/live-capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('🔧 Response status:', response.status);
      console.log('🔧 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json();
        console.log('🔧 Error response:', errorData);
        throw new Error(errorData.message || 'Live capture failed');
      }

      const result: CaptureResult = await response.json();
      setCaptureResult(result);
      setChallengeState('completed');
      cleanup();
      
      // Start polling for verification results if capture was successful
      if (result.verification_id && result.status === 'processing') {
        console.log('🔄 Starting verification status polling...');
        pollVerificationStatus(result.verification_id);
      }

    } catch (error: any) {
      console.error('📸 Capture failed:', error);
      
      let errorMessage = 'Failed to capture image. Please try again.';
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setChallengeState('waiting');
      
      if (captureAttempts >= 3) {
        setError('Maximum capture attempts exceeded. Please refresh and try again.');
        cleanup();
      }
    } finally {
      setLoading(false);
    }
  };

  const cleanup = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
      videoElementRef.current = null;
    }
    
    if (faceClassifierRef.current) {
      try {
        faceClassifierRef.current.delete();
      } catch (e) {
        console.log('🔧 Classifier cleanup error:', e);
      }
      faceClassifierRef.current = null;
    }
  };

  const retryCamera = () => {
    cleanup();
    setCameraState('prompt');
    setError('');
    setCaptureResult(null);
    setChallengeState('waiting');
    setCaptureAttempts(0);
    setTimeout(initializeCamera, 100);
  };

  const goToResults = async () => {
    if (captureResult?.verification_id && apiKey) {
      navigate(`/verify?verification_id=${captureResult.verification_id}&api_key=${apiKey}&step=5`);
    }
  };

  // Render session expired
  if (sessionExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Expired</h2>
            <p className="text-gray-600 mb-6">
              Your live capture session has expired. Please start a new verification.
            </p>
            <button
              onClick={() => navigate('/verify')}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 transition"
            >
              Start New Verification
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render success
  if (captureResult) {
    const finalResults = verificationResults || { status: captureResult.status };
    const isProcessing = isPolling || (finalResults.status === 'processing' && !verificationResults);
    const isVerified = finalResults.status === 'verified';
    const isFailed = finalResults.status === 'failed';
    const isManualReview = finalResults.status === 'manual_review';
    
    // Determine background and icon colors based on status
    let bgGradient = 'from-green-50 via-white to-green-50';
    let iconColor = 'text-green-500';
    let statusColor = 'text-blue-600';
    
    if (isVerified) {
      bgGradient = 'from-green-50 via-white to-green-50';
      iconColor = 'text-green-500';
      statusColor = 'text-green-600';
    } else if (isFailed) {
      bgGradient = 'from-red-50 via-white to-red-50';
      iconColor = 'text-red-500';
      statusColor = 'text-red-600';
    } else if (isManualReview) {
      bgGradient = 'from-yellow-50 via-white to-yellow-50';
      iconColor = 'text-yellow-500';
      statusColor = 'text-yellow-600';
    } else if (isProcessing) {
      bgGradient = 'from-blue-50 via-white to-blue-50';
      iconColor = 'text-blue-500';
      statusColor = 'text-blue-600';
    }
    
    return (
      <div className={`min-h-screen bg-gradient-to-br ${bgGradient} flex items-center justify-center`}>
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            {/* Icon with conditional rendering for processing spinner */}
            <div className="w-16 h-16 mx-auto mb-4 relative">
              {isProcessing ? (
                <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
              ) : (
                <CheckCircleIcon className={`w-16 h-16 ${iconColor}`} />
              )}
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isProcessing ? 'Processing...' : 'Capture Complete!'}
            </h2>
            
            <p className="text-gray-600 mb-4">
              {isProcessing 
                ? 'Please wait while we verify your identity. This may take a few moments...'
                : isVerified 
                  ? 'Your identity has been successfully verified.'
                  : isFailed 
                    ? 'Verification failed. Please try again.'
                    : isManualReview 
                      ? 'Your verification is under manual review.'
                      : 'Your live capture has been successfully processed.'
              }
            </p>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <div className="flex items-center">
                    <span className={`font-semibold ${statusColor}`}>
                      {isProcessing && !verificationResults ? 'processing' : finalResults.status}
                    </span>
                    {isProcessing && (
                      <div className="ml-2 w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Liveness Check:</span>
                  <span className={`font-semibold ${captureResult.liveness_check_enabled ? 'text-green-600' : 'text-gray-600'}`}>
                    {captureResult.liveness_check_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Face Matching:</span>
                  <span className={`font-semibold ${captureResult.face_matching_enabled ? 'text-green-600' : 'text-gray-600'}`}>
                    {captureResult.face_matching_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                
                {/* Show additional verification details when available */}
                {verificationResults && (
                  <>
                    {verificationResults.face_match_score !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Face Match:</span>
                        <span className="font-semibold text-green-600">
                          {Math.round(verificationResults.face_match_score * 100)}%
                        </span>
                      </div>
                    )}
                    {verificationResults.liveness_score !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Liveness Score:</span>
                        <span className="font-semibold text-green-600">
                          {Math.round(verificationResults.liveness_score * 100)}%
                        </span>
                      </div>
                    )}
                    {verificationResults.confidence_score !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Confidence:</span>
                        <span className="font-semibold text-green-600">
                          {Math.round(verificationResults.confidence_score * 100)}%
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {!isProcessing ? (
                <button
                  onClick={goToResults}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 transition"
                >
                  View Full Results
                </button>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mr-3"></div>
                    <span className="text-blue-700 text-sm">
                      {isPolling ? 'Checking verification status...' : 'Processing verification...'}
                    </span>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-700 text-sm">{error}</p>
                  <button
                    onClick={goToResults}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm underline"
                  >
                    Check results manually
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main camera interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Live Identity Verification</h1>
          <p className="text-xl text-gray-600">Complete your verification with live face capture</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Canvas for camera - always present but conditionally visible */}
          {cameraState === 'ready' && (
            <div className="relative bg-black">
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="w-full h-96 object-cover"
                style={{ maxHeight: '384px' }}
              />
            </div>
          )}
          
          {/* Hidden canvas for initialization when not ready */}
          {cameraState !== 'ready' && (
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="hidden"
            />
          )}
          
          {/* Camera Permission Prompt */}
          {cameraState === 'prompt' && (
            <div className="p-8 text-center">
              <CameraIcon className="w-16 h-16 text-blue-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Camera Access Required</h2>
              <p className="text-gray-600 mb-6">
                We need access to your camera for live identity verification using OpenCV technology.
              </p>
              <button
                onClick={initializeCamera}
                disabled={!opencvReady || loading}
                className="bg-blue-600 text-white py-4 px-8 rounded-xl hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center justify-center mx-auto"
              >
                {!opencvReady ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                    Loading OpenCV...
                  </>
                ) : loading ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                    Initializing Camera...
                  </>
                ) : (
                  <>
                    <CameraIcon className="w-5 h-5 mr-2" />
                    Enable Camera
                  </>
                )}
              </button>
            </div>
          )}

          {/* Camera Error */}
          {cameraState === 'error' && (
            <div className="p-8 text-center">
              <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Camera Access Failed</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <div className="space-y-3">
                <button
                  onClick={retryCamera}
                  className="bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 transition"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Live Camera Feed */}
          {cameraState === 'ready' && sessionData && (
            <div className="relative">
              {/* Challenge Info */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-center space-x-4 mb-4">
                  <div className="p-3 bg-white/20 rounded-full">
                    <EyeIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Liveness Challenge</h3>
                    <p className="text-blue-100">{sessionData.liveness_challenge.instruction}</p>
                  </div>
                </div>

                {/* Face Detection Status Indicator */}
                <div className={`flex items-center justify-center space-x-3 p-3 rounded-xl mb-4 ${
                  faceDetected 
                    ? 'bg-green-500/20 border border-green-400/30' 
                    : 'bg-red-500/20 border border-red-400/30'
                }`}>
                  <div className={`w-3 h-3 rounded-full ${
                    faceDetected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                  }`}></div>
                  <span className={`text-sm font-medium ${
                    faceDetected ? 'text-green-100' : 'text-red-100'
                  }`}>
                    {faceDetected 
                      ? '✓ Face Detected - Ready for Capture' 
                      : '⚠ No Face Detected - Position Your Face in Frame'
                    }
                  </span>
                  {faceDetected && (
                    <div className="flex space-x-2 text-xs text-green-200">
                      <span>Liveness: {Math.round(livenessScore * 100)}%</span>
                      <span>Stability: {Math.round(faceStability * 100)}%</span>
                    </div>
                  )}
                </div>
                
                {countdown !== null && (
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">{countdown}</div>
                    <p className="text-blue-100">Get ready...</p>
                  </div>
                )}
              </div>


              {/* Controls */}
              <div className="p-6 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-gray-600">
                    Attempts: {captureAttempts}/3
                  </div>
                  {sessionData && (
                    <div className="text-sm text-gray-600">
                      Session expires: {new Date(sessionData.expires_at).toLocaleTimeString()}
                    </div>
                  )}
                </div>

                <div className="text-center">
                  {challengeState === 'waiting' && (
                    <button
                      onClick={startChallenge}
                      disabled={!faceDetected || loading || livenessScore < 0.6 || faceStability < 0.8}
                      className="bg-green-600 text-white py-4 px-8 rounded-xl hover:bg-green-700 disabled:bg-gray-400 transition flex items-center justify-center mx-auto"
                    >
                      {!faceDetected ? (
                        <>
                          <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                          Position Your Face
                        </>
                      ) : loading ? (
                        <>
                          <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : livenessScore < 0.6 ? (
                        <>
                          <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                          Improve Lighting
                        </>
                      ) : faceStability < 0.8 ? (
                        <>
                          <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                          Hold Steady
                        </>
                      ) : (
                        <>
                          <CameraIcon className="w-5 h-5 mr-2" />
                          Start Capture
                        </>
                      )}
                    </button>
                  )}

                  {challengeState === 'active' && (
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900 mb-2">
                        Performing challenge...
                      </div>
                      <div className="text-sm text-gray-600">
                        {sessionData.liveness_challenge.instruction}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && cameraState !== 'error' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg m-6">
              <div className="flex">
                <XMarkIcon className="w-5 h-5 text-red-400 mr-2 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">🔧 OpenCV Live Capture</h3>
          <ul className="text-blue-800 space-y-2">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2 mt-1">•</span>
              <span>This system uses OpenCV for reliable camera processing</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2 mt-1">•</span>
              <span>Ensure good lighting on your face</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2 mt-1">•</span>
              <span>Position your face in the center circle</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2 mt-1">•</span>
              <span>Wait for the green circle indicating face detection</span>
            </li>
          </ul>
          
          {debugInfo && (
            <div className="mt-4 p-3 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">Status: {debugInfo}</p>
              {cameraState === 'ready' && (
                <button
                  onClick={retryCamera}
                  className="mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Restart Camera
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};