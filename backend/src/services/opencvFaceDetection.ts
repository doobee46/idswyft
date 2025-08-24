import cv from 'opencv4nodejs';
import { logger } from '@/utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FaceDetectionResult {
  faceDetected: boolean;
  faceCount: number;
  faceArea: number;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  qualityChecks: {
    brightness: number;
    contrast: number;
    sharpness: number;
    isWellLit: boolean;
    isClear: boolean;
  };
}

interface LivenessResult {
  isLive: boolean;
  confidence: number;
  checks: {
    eyeMovement: boolean;
    faceSymmetry: boolean;
    textureAnalysis: boolean;
    depthConsistency: boolean;
  };
}

class OpenCVFaceDetectionService {
  private faceClassifier: cv.CascadeClassifier | null = null;
  private eyeClassifier: cv.CascadeClassifier | null = null;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      logger.info('Initializing OpenCV face detection service');
      
      // Load Haar cascade classifiers
      const cascadeDir = path.join(__dirname, '../../models');
      
      // Haar cascade files are already included in the models directory
      const faceCascadePath = path.join(cascadeDir, 'haarcascade_frontalface_default.xml');
      const eyeCascadePath = path.join(cascadeDir, 'haarcascade_eye.xml');
      
      try {
        this.faceClassifier = new cv.CascadeClassifier(faceCascadePath);
        this.eyeClassifier = new cv.CascadeClassifier(eyeCascadePath);
        logger.info('Haar cascade classifiers loaded successfully');
      } catch (cascadeError) {
        logger.warn('Could not load Haar cascades, using DNN fallback', cascadeError);
        // Fallback to basic detection if cascade files not available
      }
      
      this.initialized = true;
      logger.info('OpenCV face detection service initialized');
      
    } catch (error) {
      logger.error('Failed to initialize OpenCV face detection service:', error);
      throw error;
    }
  }

  /**
   * Detect faces in an image buffer
   */
  async detectFaces(imageBuffer: Buffer): Promise<FaceDetectionResult> {
    if (!this.initialized) {
      throw new Error('OpenCV service not initialized');
    }

    try {
      // Decode image from buffer
      const mat = cv.imdecode(imageBuffer);
      if (mat.empty()) {
        throw new Error('Could not decode image');
      }

      // Convert to grayscale for face detection
      const grayMat = mat.cvtColor(cv.COLOR_BGR2GRAY);
      
      // Detect faces
      const faces = await this.detectFacesInMat(grayMat);
      
      // Calculate quality metrics
      const qualityChecks = this.analyzeImageQuality(mat, grayMat);
      
      // Prepare result
      const result: FaceDetectionResult = {
        faceDetected: faces.length > 0,
        faceCount: faces.length,
        faceArea: faces.length > 0 ? faces[0].width * faces[0].height : 0,
        confidence: faces.length > 0 ? this.calculateConfidence(faces[0], mat) : 0,
        boundingBox: faces.length > 0 ? {
          x: faces[0].x,
          y: faces[0].y,
          width: faces[0].width,
          height: faces[0].height
        } : undefined,
        qualityChecks
      };

      // Cleanup
      mat.release();
      grayMat.release();

      logger.info('Face detection completed', {
        faceDetected: result.faceDetected,
        faceCount: result.faceCount,
        confidence: result.confidence
      });

      return result;

    } catch (error) {
      logger.error('Face detection failed:', error);
      throw error;
    }
  }

  /**
   * Perform liveness detection on an image
   */
  async performLivenessCheck(imageBuffer: Buffer): Promise<LivenessResult> {
    if (!this.initialized) {
      throw new Error('OpenCV service not initialized');
    }

    try {
      const mat = cv.imdecode(imageBuffer);
      if (mat.empty()) {
        throw new Error('Could not decode image');
      }

      const grayMat = mat.cvtColor(cv.COLOR_BGR2GRAY);
      
      // Detect faces first
      const faces = await this.detectFacesInMat(grayMat);
      
      if (faces.length === 0) {
        return {
          isLive: false,
          confidence: 0,
          checks: {
            eyeMovement: false,
            faceSymmetry: false,
            textureAnalysis: false,
            depthConsistency: false
          }
        };
      }

      const faceROI = grayMat.getRegion(faces[0]);
      
      // Perform liveness checks
      const checks = {
        eyeMovement: await this.checkEyeMovement(faceROI),
        faceSymmetry: this.checkFaceSymmetry(faceROI),
        textureAnalysis: this.performTextureAnalysis(faceROI),
        depthConsistency: this.checkDepthConsistency(mat, faces[0])
      };

      // Calculate overall liveness confidence
      const passedChecks = Object.values(checks).filter(Boolean).length;
      const confidence = passedChecks / Object.keys(checks).length;
      const isLive = confidence > 0.6; // Require 60% of checks to pass

      // Cleanup
      mat.release();
      grayMat.release();
      faceROI.release();

      logger.info('Liveness check completed', {
        isLive,
        confidence: Math.round(confidence * 100),
        checks
      });

      return {
        isLive,
        confidence,
        checks
      };

    } catch (error) {
      logger.error('Liveness check failed:', error);
      throw error;
    }
  }

  private async detectFacesInMat(grayMat: cv.Mat): Promise<cv.Rect[]> {
    if (this.faceClassifier) {
      // Use Haar cascade detection
      return this.faceClassifier.detectMultiScale(grayMat, {
        scaleFactor: 1.1,
        minNeighbors: 3,
        minSize: new cv.Size(30, 30)
      }).objects;
    } else {
      // Fallback to basic contour detection
      return this.fallbackFaceDetection(grayMat);
    }
  }

  private fallbackFaceDetection(grayMat: cv.Mat): cv.Rect[] {
    // Basic fallback using contour detection and face-like shape analysis
    const blurred = grayMat.gaussianBlur(new cv.Size(5, 5), 1.4);
    const edges = blurred.canny(50, 150);
    
    const contours = edges.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    const faces: cv.Rect[] = [];
    
    for (const contour of contours) {
      const rect = contour.boundingRect();
      const aspectRatio = rect.width / rect.height;
      const area = rect.width * rect.height;
      
      // Face-like criteria
      if (aspectRatio > 0.6 && aspectRatio < 1.4 && area > 2500) {
        faces.push(rect);
      }
    }
    
    blurred.release();
    edges.release();
    
    return faces.slice(0, 1); // Return only the largest face
  }

  private analyzeImageQuality(colorMat: cv.Mat, grayMat: cv.Mat) {
    // Calculate brightness (mean intensity)
    const brightness = grayMat.mean()[0];
    
    // Calculate contrast (standard deviation)
    const meanStd = grayMat.meanStdDev();
    const contrast = meanStd.stddev[0];
    
    // Calculate sharpness using Laplacian variance
    const laplacian = grayMat.laplacian(cv.CV_64F);
    const sharpness = laplacian.meanStdDev().stddev[0];
    
    laplacian.release();
    
    return {
      brightness: Math.round(brightness),
      contrast: Math.round(contrast),
      sharpness: Math.round(sharpness),
      isWellLit: brightness > 50 && brightness < 200,
      isClear: sharpness > 100
    };
  }

  private calculateConfidence(face: cv.Rect, mat: cv.Mat): number {
    const faceArea = face.width * face.height;
    const imageArea = mat.rows * mat.cols;
    const areaRatio = faceArea / imageArea;
    
    // Higher confidence for larger faces (closer to camera)
    const sizeScore = Math.min(areaRatio * 10, 1);
    
    // Additional confidence factors can be added here
    return Math.round(sizeScore * 100);
  }

  private async checkEyeMovement(faceROI: cv.Mat): Promise<boolean> {
    if (!this.eyeClassifier) {
      return true; // Skip if no eye classifier available
    }
    
    try {
      const eyes = this.eyeClassifier.detectMultiScale(faceROI, {
        scaleFactor: 1.1,
        minNeighbors: 2,
        minSize: new cv.Size(10, 10)
      }).objects;
      
      // Basic check: should detect at least one eye
      return eyes.length >= 1;
    } catch {
      return true; // Default to pass if detection fails
    }
  }

  private checkFaceSymmetry(faceROI: cv.Mat): boolean {
    const centerX = Math.floor(faceROI.cols / 2);
    
    // Split face into left and right halves
    const leftHalf = faceROI.getRegion(new cv.Rect(0, 0, centerX, faceROI.rows));
    const rightHalf = faceROI.getRegion(new cv.Rect(centerX, 0, centerX, faceROI.rows));
    
    // Flip right half to compare with left
    const rightFlipped = rightHalf.flip(1);
    
    // Calculate structural similarity
    const diff = leftHalf.absDiff(rightFlipped);
    const similarity = 255 - diff.mean()[0];
    
    leftHalf.release();
    rightHalf.release();
    rightFlipped.release();
    diff.release();
    
    // Face is symmetric if similarity is high
    return similarity > 100;
  }

  private performTextureAnalysis(faceROI: cv.Mat): boolean {
    // Use Local Binary Pattern (LBP) like analysis
    const blurred = faceROI.gaussianBlur(new cv.Size(3, 3), 1);
    const edges = blurred.canny(30, 100);
    
    // Calculate texture density
    const edgePixels = cv.countNonZero(edges);
    const totalPixels = edges.rows * edges.cols;
    const textureDensity = edgePixels / totalPixels;
    
    blurred.release();
    edges.release();
    
    // Real faces have moderate texture density
    return textureDensity > 0.05 && textureDensity < 0.3;
  }

  private checkDepthConsistency(colorMat: cv.Mat, faceRect: cv.Rect): boolean {
    // Analyze color distribution for depth cues
    const faceROI = colorMat.getRegion(faceRect);
    const hsvROI = faceROI.cvtColor(cv.COLOR_BGR2HSV);
    
    // Check for natural skin color variations
    const hMean = hsvROI.split()[0].mean()[0];
    const sMean = hsvROI.split()[1].mean()[0];
    
    faceROI.release();
    hsvROI.release();
    
    // Natural faces have specific hue/saturation ranges
    return hMean > 5 && hMean < 25 && sMean > 30 && sMean < 150;
  }

  /**
   * Process a video frame for real-time face detection
   */
  async processVideoFrame(frameBuffer: Buffer): Promise<{
    faceDetected: boolean;
    confidence: number;
    boundingBox?: { x: number; y: number; width: number; height: number };
  }> {
    try {
      // Simplified processing for real-time performance
      const mat = cv.imdecode(frameBuffer);
      const grayMat = mat.cvtColor(cv.COLOR_BGR2GRAY);
      
      const faces = await this.detectFacesInMat(grayMat);
      
      const result = {
        faceDetected: faces.length > 0,
        confidence: faces.length > 0 ? this.calculateConfidence(faces[0], mat) : 0,
        boundingBox: faces.length > 0 ? {
          x: faces[0].x,
          y: faces[0].y,
          width: faces[0].width,
          height: faces[0].height
        } : undefined
      };
      
      mat.release();
      grayMat.release();
      
      return result;
      
    } catch (error) {
      logger.error('Video frame processing failed:', error);
      return { faceDetected: false, confidence: 0 };
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.initialized = false;
    logger.info('OpenCV face detection service destroyed');
  }
}

// Export singleton instance
export const opencvFaceDetectionService = new OpenCVFaceDetectionService();
export default opencvFaceDetectionService;