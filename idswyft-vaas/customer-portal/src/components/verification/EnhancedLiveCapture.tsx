// Enhanced live capture with robust camera handling
import React, { useRef, useState, useEffect } from 'react';
import { Camera, AlertTriangle, X, Eye, CheckCircle, Loader2 } from 'lucide-react';

interface EnhancedLiveCaptureProps {
  onCapture: (imageData: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const EnhancedLiveCapture: React.FC<EnhancedLiveCaptureProps> = ({
  onCapture,
  onCancel,
  isLoading = false
}) => {
  const [cameraState, setCameraState] = useState<'prompt' | 'initializing' | 'ready' | 'error'>('prompt');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Cleanup function for camera resources
  const cleanupCamera = () => {
    console.log('🧹 Cleaning up camera resources...');

    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        console.log(`🔴 Stopping camera track: ${track.kind}`);
        track.stop();
      });
      setCameraStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraState('prompt');
    setCameraError(null);
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupCamera();
    };
  }, []);

  // Initialize camera for live capture
  const initializeCamera = async () => {
    console.log('🎥 Initializing camera...');
    setCameraState('initializing');
    setCameraError(null);

    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this browser. Please use Chrome, Firefox, or Safari.');
      }

      // Check if running on HTTPS (required for camera access in production)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        throw new Error('Camera access requires HTTPS. Please ensure you are using a secure connection.');
      }

      console.log('🎥 Requesting camera permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640, min: 320, max: 1280 },
          height: { ideal: 480, min: 240, max: 720 }
        },
        audio: false
      });

      console.log('🎥 Camera stream obtained successfully');
      setCameraStream(stream);
      setCameraState('ready');

      // Connect stream to video element
      setTimeout(() => {
        if (videoRef.current && stream) {
          console.log('🎥 Connecting stream to video element...');
          videoRef.current.srcObject = stream;

          videoRef.current.onloadedmetadata = () => {
            console.log('🎥 Video metadata loaded, starting playback...');
            if (videoRef.current) {
              videoRef.current.play().then(() => {
                console.log('🎥 Video playing successfully');
              }).catch(error => {
                console.error('Video play failed:', error);
                setCameraError('Failed to start camera preview. Please try again.');
                cleanupCamera();
              });
            }
          };

          videoRef.current.onerror = () => {
            console.error('Video element error');
            setCameraError('Camera preview failed. Please check your camera permissions.');
            cleanupCamera();
          };
        }
      }, 100);

    } catch (error) {
      console.error('Camera initialization failed:', error);
      setCameraState('error');

      let errorMessage = 'Camera access failed. ';

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera permission denied. Please allow camera access in your browser settings and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera found. Please connect a camera device and try again.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera is currently in use. Please close other applications using the camera and try again.';
        } else if (error.name === 'SecurityError') {
          errorMessage = 'Camera access blocked for security reasons. Please ensure you are using HTTPS.';
        } else {
          errorMessage += error.message;
        }
      }

      setCameraError(errorMessage);
    }
  };

  // Capture photo from video stream
  const capturePhoto = async () => {
    console.log('📸 Capturing photo...');

    if (!videoRef.current || !canvasRef.current) {
      console.error('Video or canvas not available for capture');
      setCameraError('Camera not ready for capture. Please try again.');
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      console.error('Canvas context not available');
      setCameraError('Failed to prepare capture. Please try again.');
      return;
    }

    // Check if video is ready
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      console.error('Video not ready for capture');
      setCameraError('Camera preview not ready. Please wait a moment and try again.');
      return;
    }

    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      const base64Data = imageData.split(',')[1];

      if (!base64Data || base64Data.length < 1000) {
        throw new Error('Captured image appears to be empty or corrupted');
      }

      console.log('📸 Photo captured successfully, processing...');

      // Clean up camera before calling onCapture
      cleanupCamera();

      // Call the onCapture callback
      await onCapture(base64Data);

    } catch (error) {
      console.error('Photo capture failed:', error);
      setCameraError(error instanceof Error ? error.message : 'Failed to capture photo. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Live Photo Capture</h2>
        <button
          onClick={() => {
            cleanupCamera();
            onCancel();
          }}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        {cameraState === 'prompt' && (
          <div className="text-center py-8">
            <Camera className="h-12 w-12 mx-auto text-blue-600 mb-4" />
            <h4 className="text-lg font-semibold mb-2">Ready for Live Capture</h4>
            <p className="text-gray-600 mb-6">
              Take a live photo to verify your identity. Look directly at the camera and ensure good lighting.
            </p>
            {cameraError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{cameraError}</p>
                </div>
              </div>
            )}
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
            <Loader2 className="h-12 w-12 mx-auto text-blue-600 mb-4 animate-spin" />
            <p className="text-gray-600">Initializing camera...</p>
          </div>
        )}

        {cameraState === 'ready' && (
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '240px', height: '320px' }}>
              {/* Video element for camera feed */}
              <video
                ref={videoRef}
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

              {/* Instructions overlay */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-black bg-opacity-70 text-white p-3 rounded-lg text-center">
                  <p className="text-sm">
                    Position your face in the center of the frame
                  </p>
                </div>
              </div>
            </div>

            {cameraError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{cameraError}</p>
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={capturePhoto}
                disabled={isLoading}
                className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${
                  !isLoading
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Capture Photo'
                )}
              </button>

              <button
                onClick={() => {
                  cleanupCamera();
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
            <AlertTriangle className="h-12 w-12 mx-auto text-red-600 mb-4" />
            <h4 className="text-lg font-semibold mb-2 text-red-600">Camera Error</h4>
            {cameraError && (
              <p className="text-gray-600 mb-6">{cameraError}</p>
            )}
            <div className="space-y-3">
              <button
                onClick={initializeCamera}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Troubleshooting tips:</p>
                <p>• Allow camera permissions in your browser</p>
                <p>• Close other applications using the camera</p>
                <p>• Ensure you're using HTTPS</p>
                <p>• Try refreshing the page</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default EnhancedLiveCapture;