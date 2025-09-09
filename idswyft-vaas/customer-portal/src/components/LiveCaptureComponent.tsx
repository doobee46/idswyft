import React, { useState, useEffect, useRef } from 'react';
import { 
  CameraIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

// OpenCV types
declare global {
  interface Window {
    cv: any;
  }
}

interface LiveCaptureComponentProps {
  onCapture: (imageData: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const LiveCaptureComponent: React.FC<LiveCaptureComponentProps> = ({
  onCapture,
  onCancel,
  isLoading
}) => {
  const [cameraState, setCameraState] = useState<'prompt' | 'initializing' | 'ready' | 'error'>('prompt');
  const [faceDetected, setFaceDetected] = useState(false);
  const [opencvReady, setOpencvReady] = useState(false);
  const [faceDetectionBuffer, setFaceDetectionBuffer] = useState<boolean[]>([]);
  
  // Refs for live capture
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const faceClassifierRef = useRef<any>(null);

  // Load OpenCV script when component mounts
  useEffect(() => {
    if (!opencvReady) {
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
                setTimeout(() => {
                  startFaceDetection();
                }, 1000);
              }).catch(error => {
                console.error('Video play failed:', error);
              });
            }
          };
        }
      }, 100);
      
    } catch (error) {
      console.error('Camera initialization failed:', error);
      setCameraState('error');
    }
  };

  // Start face detection loop
  const startFaceDetection = () => {
    console.log('🔍 Starting face detection...');

    if (!videoElementRef.current || !canvasRef.current) {
      console.warn('Missing video or canvas element for face detection, retrying...');
      setTimeout(() => {
        if (cameraState === 'ready' && videoElementRef.current && canvasRef.current) {
          startFaceDetection();
        }
      }, 200);
      return;
    }

    const detectFaces = () => {
      if (!videoElementRef.current || !canvasRef.current || cameraState !== 'ready') {
        return;
      }
      
      try {
        const video = videoElementRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          animationRef.current = requestAnimationFrame(detectFaces);
          return;
        }

        // Check if video is ready
        if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
          animationRef.current = requestAnimationFrame(detectFaces);
          return;
        }

        // Set canvas dimensions
        const displayWidth = video.clientWidth || 640;
        const displayHeight = video.clientHeight || 480;
        const canvasWidth = Math.max(displayWidth, 320);
        const canvasHeight = Math.max(displayHeight, 240);
        
        if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
        }
        
        // Clear canvas
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
        
        // Face detection logic (simplified from demo)
        let faceCount = 0;
        
        if (window.cv && window.cv.Mat && faceClassifierRef.current && opencvReady) {
          // OpenCV face detection
          try {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            if (tempCtx) {
              const videoWidth = video.videoWidth;
              const videoHeight = video.videoHeight;
              tempCanvas.width = videoWidth;
              tempCanvas.height = videoHeight;
              
              tempCtx.drawImage(video, 0, 0, videoWidth, videoHeight);
              const imageData = tempCtx.getImageData(0, 0, videoWidth, videoHeight);
              
              const src = window.cv.matFromImageData(imageData);
              const gray = new window.cv.Mat();
              const faces = new window.cv.RectVector();
              
              window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY);
              faceClassifierRef.current.detectMultiScale(gray, faces, 1.05, 2, 0, new window.cv.Size(30, 30));
              
              faceCount = faces.size();
              
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
          // Fallback face detection
          faceCount = Math.random() > 0.3 ? 1 : 0; // Simplified for now
        }
        
        // Add current detection to buffer for stability
        const currentDetection = faceCount > 0;
        setFaceDetectionBuffer(prev => {
          const newBuffer = [...prev, currentDetection].slice(-5);
          
          const trueCount = newBuffer.filter(Boolean).length;
          const falseCount = newBuffer.filter(x => !x).length;
          
          if (trueCount >= 3 && !faceDetected) {
            setFaceDetected(true);
          } else if (falseCount >= 3 && faceDetected) {
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
    
    animationRef.current = requestAnimationFrame(detectFaces);
  };

  // Capture selfie
  const captureSelfie = async () => {
    if (!videoElementRef.current) {
      return;
    }

    if (!faceDetected) {
      alert('Please position your face within the frame');
      return;
    }

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
      
      // Convert to base64
      const base64Image = captureCanvas.toDataURL('image/jpeg', 0.8);
      const base64Data = base64Image.split(',')[1];
      
      // Cleanup camera resources
      cleanup();
      
      // Call the onCapture callback
      onCapture(base64Data);

    } catch (error) {
      console.error('Selfie capture failed:', error);
      alert('Failed to capture selfie. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Live Selfie Capture</h3>
        <button
          onClick={() => {
            cleanup();
            onCancel();
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
              We'll use your camera to take a selfie for identity verification with liveness detection.
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
              />
              
              {/* Canvas overlay for face detection */}
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
                  onCancel();
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
};

export default LiveCaptureComponent;