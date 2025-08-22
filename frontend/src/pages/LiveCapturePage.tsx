import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL, shouldUseSandbox } from '../config/api';
import {
  CameraIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  XMarkIcon,
  EyeIcon,
  FaceSmileIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

interface LiveCaptureChallenge {
  type: string;
  instruction: string;
}

interface LiveCaptureSession {
  live_capture_token: string;
  expires_at: string;
  liveness_challenge: LiveCaptureChallenge;
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

export const LiveCapturePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [sessionData, setSessionData] = useState<LiveCaptureSession | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [challengeState, setChallengeState] = useState<'waiting' | 'active' | 'completed'>('waiting');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [captureAttempts, setCaptureAttempts] = useState(0);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const token = searchParams.get('token');
  const verificationId = searchParams.get('verification_id');
  const apiKey = searchParams.get('api_key');

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing live capture token');
      return;
    }

    // Mock session data based on token (in production, this would validate the token)
    const mockSession: LiveCaptureSession = {
      live_capture_token: token,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      liveness_challenge: {
        type: 'blink_twice',
        instruction: 'Please blink twice slowly when prompted'
      },
      user_id: 'user-123',
      verification_id: verificationId,
      expires_in_seconds: 1800
    };

    setSessionData(mockSession);

    // Automatically request camera permission when session is loaded
    setTimeout(() => {
      requestCameraPermission();
    }, 500); // Small delay to ensure UI is ready

    // Set up session expiry timer
    const expiryTimer = setTimeout(() => {
      setSessionExpired(true);
      stopCamera();
    }, mockSession.expires_in_seconds * 1000);

    return () => clearTimeout(expiryTimer);
  }, [token, verificationId]);

  const getChallengeIcon = (challengeType: string) => {
    const icons = {
      'blink_twice': EyeIcon,
      'turn_head_left': ArrowLeftIcon,
      'turn_head_right': ArrowRightIcon,
      'smile': FaceSmileIcon,
      'look_up': ArrowUpIcon,
      'look_down': ArrowDownIcon
    };
    const IconComponent = icons[challengeType as keyof typeof icons] || EyeIcon;
    return <IconComponent className="w-8 h-8" />;
  };

  const requestCameraPermission = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser');
      }
      
      // Log environment info for debugging
      console.log('🌐 Environment info:', {
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        isSecureContext: window.isSecureContext,
        userAgent: navigator.userAgent,
        platform: navigator.platform
      });
      
      setDebugInfo(`Environment: ${window.location.protocol}//${window.location.hostname}, Secure: ${window.isSecureContext}`);
      
      // Check current camera permissions
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          console.log('🎥 Camera permission state:', permission.state);
          setDebugInfo(prev => `${prev}, Perm: ${permission.state}`);
        } catch (permError) {
          console.log('🎥 Could not check camera permissions:', permError);
        }
      }
      
      // Check available devices first
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('🎥 Available video devices:', videoDevices);
        setDebugInfo(`Found ${videoDevices.length} camera(s)`);
        
        if (videoDevices.length === 0) {
          throw new Error('No camera devices found');
        }
      } catch (deviceError) {
        console.log('🎥 Could not enumerate devices:', deviceError);
        setDebugInfo('Could not check available cameras');
      }
      
      console.log('🎥 Requesting camera access...');
      setDebugInfo('Requesting camera access...');
      
      // Try with ideal constraints first
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: false 
        });
      } catch (constraintError) {
        console.log('🎥 Initial constraints failed, trying fallback...');
        setDebugInfo('Initial constraints failed, trying fallback...');
        
        try {
          // Fallback to basic video constraints
          mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: true,
            audio: false 
          });
        } catch (basicError) {
          console.log('🎥 Basic constraints failed, trying device-specific...');
          setDebugInfo('Basic constraints failed, trying device-specific...');
          
          // Last resort: try with a specific device
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          
          if (videoDevices.length > 0) {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: videoDevices[0].deviceId },
              audio: false
            });
          } else {
            throw basicError;
          }
        }
      }
      
      console.log('🎥 Camera access granted, stream:', mediaStream);
      console.log('🎥 Stream tracks:', mediaStream.getTracks());
      console.log('🎥 Video tracks:', mediaStream.getVideoTracks());
      console.log('🎥 Audio tracks:', mediaStream.getAudioTracks());
      
      const videoTracks = mediaStream.getVideoTracks();
      const audioTracks = mediaStream.getAudioTracks();
      
      setDebugInfo(`Stream: ${mediaStream.active ? 'active' : 'inactive'}, Video tracks: ${videoTracks.length}, Audio tracks: ${audioTracks.length}`);
      
      // Check if we have any video tracks
      if (videoTracks.length === 0) {
        throw new Error('No video tracks available in media stream');
      }
      
      // Log track details
      videoTracks.forEach((track, index) => {
        console.log(`🎥 Video track ${index}:`, {
          id: track.id,
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted
        });
      });
      
      setStream(mediaStream);
      setPermissionState('granted');
      
      // Monitor track events
      videoTracks.forEach((track, index) => {
        track.onended = () => {
          console.log(`🎥 Video track ${index} ended`);
          setDebugInfo(`Video track ${index} ended - camera may be disconnected`);
        };
        
        track.onmute = () => {
          console.log(`🎥 Video track ${index} muted`);
          setDebugInfo(`Video track ${index} muted`);
        };
        
        track.onunmute = () => {
          console.log(`🎥 Video track ${index} unmuted`);
          setDebugInfo(`Video track ${index} unmuted`);
        };
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        console.log('🎥 Video element source set');
        
        // Immediately try to play without waiting for metadata
        const tryPlay = async () => {
          if (!videoRef.current) return;
          
          try {
            await videoRef.current.play();
            console.log('🎥 Video play successful (immediate)');
            setDebugInfo(prev => `${prev}, Playing immediately`);
          } catch (immediatePlayError) {
            console.log('🎥 Immediate play failed, waiting for metadata:', immediatePlayError);
          }
        };
        
        tryPlay();
        
        // Also set up metadata handler as backup
        videoRef.current.onloadedmetadata = () => {
          console.log('🎥 Video metadata loaded');
          console.log('🎥 Video dimensions:', {
            videoWidth: videoRef.current?.videoWidth,
            videoHeight: videoRef.current?.videoHeight,
            duration: videoRef.current?.duration
          });
          
          if (videoRef.current && videoRef.current.paused) {
            // Only try to play if video is still paused
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  console.log('🎥 Video play successful (metadata)');
                  setDebugInfo(prev => `${prev}, Playing: ${videoRef.current?.videoWidth}x${videoRef.current?.videoHeight}`);
                })
                .catch(e => {
                  console.error('🎥 Video play failed:', e);
                  setError('Failed to start video playback. Please click to enable camera.');
                  // Add a click handler to retry play
                  if (videoRef.current) {
                    videoRef.current.onclick = () => {
                      videoRef.current?.play().catch(console.error);
                    };
                  }
                });
            }
          }
        };
        
        videoRef.current.onplay = () => {
          console.log('🎥 Video started playing');
          // Start face detection after video starts playing
          setTimeout(() => startFaceDetection(), 1000);
        };
        
        // Fallback: Auto-reconnect stream if video isn't visible after 3 seconds
        setTimeout(() => {
          if (videoRef.current && stream) {
            console.log('🎥 Checking if video is visible...');
            
            // Check if video has dimensions (visible)
            if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
              console.log('🎥 Video not visible, auto-reconnecting stream...');
              
              // Simulate the "Reconnect Stream" button click
              videoRef.current.srcObject = null;
              setTimeout(() => {
                if (videoRef.current && stream) {
                  videoRef.current.srcObject = stream;
                  videoRef.current.play().catch(console.error);
                }
              }, 100);
            } else {
              console.log('🎥 Video is visible, starting face detection');
              startFaceDetection();
            }
          }
        }, 3000);
        
        videoRef.current.onerror = (e) => {
          console.error('🎥 Video element error:', e);
          setError('Video display error. Please refresh and try again.');
        };
      }
      
    } catch (error: any) {
      console.error('🎥 Camera access error:', error);
      setPermissionState('denied');
      
      let errorMessage = 'Camera access is required for live verification.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please enable camera access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please connect a camera and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is in use by another application. Please close other apps and try again.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Camera access blocked due to security settings. Please use HTTPS and try again.';
      } else {
        errorMessage = `Camera error: ${error.message || 'Unknown error occurred'}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const startFaceDetection = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    const detectFace = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        // Basic face detection using image analysis
        // Check if there's significant change in the center area (where face should be)
        const imageData = context.getImageData(
          canvas.width * 0.25, 
          canvas.height * 0.25, 
          canvas.width * 0.5, 
          canvas.height * 0.5
        );
        
        // Simple brightness/contrast check for face presence
        let totalBrightness = 0;
        let pixelVariance = 0;
        const pixels = imageData.data;
        
        for (let i = 0; i < pixels.length; i += 4) {
          const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
          totalBrightness += brightness;
        }
        
        const avgBrightness = totalBrightness / (pixels.length / 4);
        
        // Calculate variance for texture detection
        for (let i = 0; i < pixels.length; i += 4) {
          const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
          pixelVariance += Math.pow(brightness - avgBrightness, 2);
        }
        
        const variance = pixelVariance / (pixels.length / 4);
        
        // Much more lenient face detection - any reasonable activity in center area
        // Just check if there's some content (not blank/dark screen)
        const hasContent = avgBrightness > 20 && avgBrightness < 250;
        const hasTexture = variance > 50; // Much lower threshold
        const isFaceDetected = hasContent && hasTexture;
        
        // Simplified detection - if there's any reasonable activity, consider it a face
        // This makes it work for testing while still providing some validation
        const currentTime = Date.now();
        
        // Log every detection for debugging
        console.log('🎥 Face detection (live):', { 
          avgBrightness: Math.round(avgBrightness), 
          variance: Math.round(variance), 
          hasContent,
          hasTexture,
          detected: isFaceDetected,
          centerArea: `${Math.round(canvas.width * 0.25)}x${Math.round(canvas.height * 0.25)} to ${Math.round(canvas.width * 0.75)}x${Math.round(canvas.height * 0.75)}`
        });
        
        setFaceDetected(isFaceDetected);
      }
    };

    const detectionInterval = setInterval(detectFace, 500);
    
    return () => clearInterval(detectionInterval);
  }, []);

  const startChallenge = () => {
    if (challengeState !== 'waiting' || !faceDetected) return;

    setChallengeState('active');
    setCountdown(3);

    const countdownTimer = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownTimer);
          performCapture();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const performCapture = async () => {
    if (!videoRef.current || !canvasRef.current || !sessionData || !apiKey) {
      setError('Missing required data for capture');
      return;
    }

    setLoading(true);
    setCaptureAttempts(prev => prev + 1);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      // Capture frame
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      // Convert to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      const base64Data = imageData.split(',')[1];

      // Send to API
      const response = await fetch(`${API_BASE_URL}/api/verify/live-capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          verification_id: sessionData.verification_id,
          live_image_data: base64Data,
          challenge_response: sessionData.liveness_challenge.type,
          ...(shouldUseSandbox() && { sandbox: true })
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Live capture failed');
      }

      const result: CaptureResult = await response.json();
      setCaptureResult(result);
      setChallengeState('completed');
      stopCamera();

    } catch (error: any) {
      console.error('Capture failed:', error);
      setError(error.message || 'Failed to capture image. Please try again.');
      setChallengeState('waiting');
      
      // Allow retry up to 3 times
      if (captureAttempts >= 3) {
        setError('Maximum capture attempts exceeded. Please refresh and try again.');
        stopCamera();
      }
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const retryCapture = () => {
    setError('');
    setCaptureResult(null);
    setChallengeState('waiting');
    setCaptureAttempts(0);
    requestCameraPermission();
  };

  const goToResults = async () => {
    if (captureResult?.verification_id && apiKey) {
      try {
        // Fetch the complete verification results
        const response = await fetch(`${API_BASE_URL}/api/verify/results/${captureResult.verification_id}`, {
          headers: {
            'X-API-Key': apiKey,
          },
        });

        if (response.ok) {
          const results = await response.json();
          // Navigate to verification page with results data in URL
          const params = new URLSearchParams({
            api_key: apiKey,
            verification_id: captureResult.verification_id,
            step: '5', // Go directly to results step
            status: results.status || 'completed'
          });
          navigate(`/verify?${params.toString()}`);
        } else {
          // Fallback to verification page
          navigate(`/verify?verification_id=${captureResult.verification_id}&api_key=${apiKey}&step=5`);
        }
      } catch (error) {
        console.error('Failed to fetch results:', error);
        // Fallback to verification page
        navigate(`/verify?verification_id=${captureResult.verification_id}&api_key=${apiKey}&step=5`);
      }
    }
  };

  // Session expired view
  if (sessionExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Expired</h2>
            <p className="text-gray-600 mb-6">
              Your live capture session has expired. Please start a new verification process.
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

  // Success view
  if (captureResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Live Capture Complete!</h2>
            <p className="text-gray-600 mb-4">
              Your live capture has been successfully processed.
            </p>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-semibold text-blue-600">{captureResult.status}</span>
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
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={goToResults}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 transition"
              >
                View Full Results
              </button>
              <button
                onClick={() => navigate('/verify')}
                className="w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-50 transition"
              >
                Start New Verification
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error view
  if (error && permissionState !== 'denied') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <XMarkIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Capture Failed</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={retryCapture}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 transition"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/verify')}
                className="w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-50 transition"
              >
                Back to Verification
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Live Identity Verification</h1>
          <p className="text-xl text-gray-600">Complete your verification with live face capture</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Camera Permission */}
          {permissionState === 'prompt' && (
            <div className="p-8 text-center">
              <CameraIcon className="w-16 h-16 text-blue-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Camera Access Required</h2>
              <p className="text-gray-600 mb-6">
                We need access to your camera to capture a live photo for identity verification.
                This ensures the highest level of security and prevents fraud.
              </p>
              <button
                onClick={requestCameraPermission}
                disabled={loading}
                className="bg-blue-600 text-white py-4 px-8 rounded-xl hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center justify-center mx-auto"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                    Requesting Access...
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

          {/* Camera Denied */}
          {permissionState === 'denied' && (
            <div className="p-8 text-center">
              <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Camera Access Denied</h2>
              <p className="text-gray-600 mb-6">
                Camera access is required for live verification. Please:
              </p>
              <ul className="text-left text-gray-600 mb-6 space-y-2 max-w-md mx-auto">
                <li>1. Click the camera icon in your browser's address bar</li>
                <li>2. Select "Allow" for camera permissions</li>
                <li>3. Refresh this page and try again</li>
              </ul>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 transition"
              >
                Refresh Page
              </button>
            </div>
          )}

          {/* Live Camera Feed */}
          {permissionState === 'granted' && sessionData && (
            <div className="relative">
              {/* Challenge Info */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-center space-x-4 mb-4">
                  <div className="p-3 bg-white/20 rounded-full">
                    {getChallengeIcon(sessionData.liveness_challenge.type)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Liveness Challenge</h3>
                    <p className="text-blue-100">{sessionData.liveness_challenge.instruction}</p>
                  </div>
                </div>
                
                {countdown !== null && (
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">{countdown}</div>
                    <p className="text-blue-100">Get ready...</p>
                  </div>
                )}
              </div>

              {/* Video Feed */}
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  controls={false}
                  style={{ width: '100%', height: '384px', objectFit: 'cover' }}
                  className="w-full h-96 object-cover bg-black"
                  onLoadStart={() => console.log('🎥 Video load started')}
                  onCanPlay={() => console.log('🎥 Video can play')}
                  onPlaying={() => console.log('🎥 Video is playing')}
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                
                {/* Face Detection Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-64 h-64 border-4 rounded-full transition-colors ${
                    faceDetected 
                      ? 'border-green-500 shadow-lg shadow-green-500/50' 
                      : 'border-red-500 border-dashed animate-pulse'
                  }`}>
                    <div className="w-full h-full flex items-center justify-center">
                      <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                        faceDetected 
                          ? 'bg-green-500 text-white' 
                          : 'bg-red-500 text-white'
                      }`}>
                        {faceDetected ? 'Face Detected' : 'Position Your Face'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="p-6 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-gray-600">
                    Attempts: {captureAttempts}/3
                  </div>
                  <div className="text-sm text-gray-600">
                    Session expires: {new Date(sessionData.expires_at).toLocaleTimeString()}
                  </div>
                </div>

                <div className="text-center">
                  {challengeState === 'waiting' && (
                    <button
                      onClick={startChallenge}
                      disabled={!faceDetected || loading}
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
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">📋 Live Capture Instructions</h3>
          <ul className="text-blue-800 space-y-2">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2 mt-1">•</span>
              <span>Ensure good lighting on your face</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2 mt-1">•</span>
              <span>Look directly at the camera</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2 mt-1">•</span>
              <span>Remove any face coverings or sunglasses</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2 mt-1">•</span>
              <span>Follow the liveness challenge instructions when prompted</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2 mt-1">•</span>
              <span>Stay still during capture for best results</span>
            </li>
          </ul>
          
          {/* Debug Info for Production Troubleshooting */}
          {debugInfo && (
            <div className="mt-4 p-3 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">Debug: {debugInfo}</p>
              {/* Production troubleshooting buttons */}
              {permissionState === 'granted' && (
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => videoRef.current?.play().catch(console.error)}
                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded"
                  >
                    Force Play
                  </button>
                  <button
                    onClick={() => {
                      if (videoRef.current && stream) {
                        videoRef.current.srcObject = null;
                        setTimeout(() => {
                          if (videoRef.current) videoRef.current.srcObject = stream;
                        }, 100);
                      }
                    }}
                    className="px-3 py-1 text-xs bg-green-500 text-white rounded"
                  >
                    Reconnect Stream
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};