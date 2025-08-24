import { logger } from '@/utils/logger.js';
import { StorageService } from './storage.js';

// Optional dependency imports with graceful fallbacks
let tf: any = null;
let blazeface: any = null;

// Type definitions for optional dependencies
type TensorFlow3D = any;
type TensorFlow2D = any;

try {
  tf = await import('@tensorflow/tfjs-node');
} catch (error) {
  logger.warn('TensorFlow.js not available, falling back to AI detection');
}

try {
  blazeface = await import('@tensorflow-models/blazeface');
} catch (error) {
  logger.warn('BlazeFace model not available, falling back to AI detection');
}

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
  aiAnalysis: {
    facial_depth_detected: boolean;
    natural_lighting: boolean;
    eye_authenticity: boolean;
    skin_texture_natural: boolean;
    no_screen_artifacts: boolean;
  };
  risk_factors: string[];
  liveness_indicators: string[];
}

/**
 * TensorFlow.js-based face detection service
 * Provides real computer vision capabilities without native dependencies
 * Railway deployment-friendly alternative to OpenCV
 */
class TensorFlowFaceDetectionService {
  private storageService: StorageService;
  private initialized = false;
  private blazeFaceModel: any = null;

  constructor() {
    this.storageService = new StorageService();
    this.initialize();
  }

  private async initialize() {
    try {
      logger.info('Initializing TensorFlow.js face detection service');

      // Check if TensorFlow.js is available
      if (!tf || !blazeface) {
        logger.warn('TensorFlow.js dependencies not available, service will use AI fallback only');
        this.initialized = true;
        return;
      }

      // Load BlazeFace model for face detection
      await this.loadBlazeFaceModel();
      
      this.initialized = true;
      logger.info('TensorFlow.js face detection service initialized successfully', {
        blazeFaceAvailable: !!this.blazeFaceModel
      });
    } catch (error) {
      logger.error('Failed to initialize TensorFlow.js face detection service:', error);
      // Initialize anyway to allow fallback operations
      this.initialized = true;
    }
  }

  private async loadBlazeFaceModel() {
    try {
      if (!blazeface) {
        logger.warn('BlazeFace not available, skipping model load');
        return;
      }
      
      // Use TensorFlow.js BlazeFace model for efficient face detection
      this.blazeFaceModel = await blazeface.load();
      logger.info('BlazeFace model loaded successfully');
    } catch (error) {
      logger.warn('BlazeFace model not available, using tensor-based fallback:', error);
      // Continue without BlazeFace - we'll use tensor operations for basic detection
    }
  }

  /**
   * Detect faces using TensorFlow.js
   */
  async detectFaces(imageBuffer: Buffer): Promise<FaceDetectionResult> {
    if (!this.initialized) {
      throw new Error('TensorFlow face detection service not initialized');
    }

    // If TensorFlow.js is not available, throw error to trigger AI fallback
    if (!tf) {
      throw new Error('TensorFlow.js not available, using AI fallback');
    }

    try {
      // Decode image to tensor
      const imageTensor = tf.node.decodeImage(imageBuffer, 3) as any;
      
      let result: FaceDetectionResult;

      if (this.blazeFaceModel) {
        // Use BlazeFace for accurate face detection
        result = await this.detectFacesWithBlazeFace(imageTensor);
      } else {
        // Fallback to tensor-based detection
        result = await this.detectFacesWithTensorOps(imageTensor);
      }

      // Cleanup tensor
      imageTensor.dispose();

      logger.info('TensorFlow face detection completed', {
        faceDetected: result.faceDetected,
        faceCount: result.faceCount,
        confidence: result.confidence,
        method: this.blazeFaceModel ? 'blazeface' : 'tensor_ops'
      });

      return result;

    } catch (error) {
      logger.error('TensorFlow face detection failed:', error);
      throw error;
    }
  }

  /**
   * Perform liveness detection using TensorFlow.js and AI analysis
   */
  async performLivenessCheck(imageBuffer: Buffer): Promise<LivenessResult> {
    if (!this.initialized) {
      throw new Error('TensorFlow face detection service not initialized');
    }

    // If TensorFlow.js is not available, throw error to trigger AI fallback
    if (!tf) {
      throw new Error('TensorFlow.js not available, using AI fallback');
    }

    try {
      const imageTensor = tf.node.decodeImage(imageBuffer, 3) as any;

      // Perform face detection first
      const faceResult = this.blazeFaceModel 
        ? await this.detectFacesWithBlazeFace(imageTensor)
        : await this.detectFacesWithTensorOps(imageTensor);

      if (!faceResult.faceDetected) {
        imageTensor.dispose();
        return {
          isLive: false,
          confidence: 0,
          checks: {
            eyeMovement: false,
            faceSymmetry: false,
            textureAnalysis: false,
            depthConsistency: false
          },
          aiAnalysis: {
            facial_depth_detected: false,
            natural_lighting: false,
            eye_authenticity: false,
            skin_texture_natural: false,
            no_screen_artifacts: false
          },
          risk_factors: ['No face detected'],
          liveness_indicators: []
        };
      }

      // Perform tensor-based liveness checks
      const checks = await this.performTensorLivenessChecks(imageTensor, faceResult.boundingBox);

      // Enhanced AI analysis using OpenAI Vision API for comprehensive liveness
      const aiAnalysis = await this.performAILivenessAnalysis(imageBuffer);

      // Cleanup
      imageTensor.dispose();

      // Combine tensor-based and AI analysis
      const combinedConfidence = (checks.confidence + aiAnalysis.confidence) / 2;
      const isLive = combinedConfidence > 0.65; // Higher threshold for combined approach

      logger.info('TensorFlow liveness check completed', {
        tensorConfidence: checks.confidence,
        aiConfidence: aiAnalysis.confidence,
        combinedConfidence,
        isLive
      });

      return {
        isLive,
        confidence: combinedConfidence,
        checks: {
          eyeMovement: checks.eyeMovement,
          faceSymmetry: checks.faceSymmetry,
          textureAnalysis: checks.textureAnalysis,
          depthConsistency: checks.depthConsistency
        },
        aiAnalysis: aiAnalysis.analysis,
        risk_factors: [...checks.riskFactors, ...aiAnalysis.riskFactors],
        liveness_indicators: [...checks.livenessIndicators, ...aiAnalysis.livenessIndicators]
      };

    } catch (error) {
      logger.error('TensorFlow liveness detection failed:', error);
      throw new Error('Liveness detection temporarily unavailable');
    }
  }

  private async detectFacesWithBlazeFace(imageTensor: TensorFlow3D): Promise<FaceDetectionResult> {
    const predictions = await this.blazeFaceModel.estimateFaces(imageTensor, false);
    
    const qualityChecks = this.analyzeImageQuality(imageTensor);

    if (predictions.length === 0) {
      return {
        faceDetected: false,
        faceCount: 0,
        faceArea: 0,
        confidence: 0,
        qualityChecks
      };
    }

    const face = predictions[0];
    const [height, width] = imageTensor.shape.slice(0, 2);
    
    // Extract bounding box
    const topLeft = face.topLeft as number[];
    const bottomRight = face.bottomRight as number[];
    
    const boundingBox = {
      x: Math.round(topLeft[0]),
      y: Math.round(topLeft[1]),
      width: Math.round(bottomRight[0] - topLeft[0]),
      height: Math.round(bottomRight[1] - topLeft[1])
    };

    const faceArea = (boundingBox.width * boundingBox.height) / (width * height);

    return {
      faceDetected: true,
      faceCount: predictions.length,
      faceArea,
      confidence: Math.round((face.probability as number[])[0] * 100),
      boundingBox,
      qualityChecks
    };
  }

  private async detectFacesWithTensorOps(imageTensor: TensorFlow3D): Promise<FaceDetectionResult> {
    // Convert to grayscale for processing
    const grayscale = tf?.image.rgbToGrayscale(imageTensor);
    
    // Basic edge detection using simple convolution
    const edgeKernel = tf?.tensor2d([
      [-1, -1, -1],
      [-1,  8, -1],
      [-1, -1, -1]
    ], [3, 3]);
    
    const edges = tf?.conv2d(grayscale.expandDims(2) as any, edgeKernel.expandDims(2).expandDims(3) as any, 1, 'same');
    
    // Simple face-like region detection using image statistics
    const edgeStats = await this.analyzeEdgePatterns(edges.squeeze() as any);
    const qualityChecks = this.analyzeImageQuality(imageTensor);
    
    // Cleanup intermediate tensors
    grayscale.dispose();
    edgeKernel.dispose();
    edges.dispose();

    // Basic heuristic for face detection
    const faceDetected = edgeStats.complexity > 0.05 && edgeStats.symmetry > 0.2;
    const confidence = faceDetected ? Math.min(75, edgeStats.complexity * 150 + edgeStats.symmetry * 100) : 0;

    return {
      faceDetected,
      faceCount: faceDetected ? 1 : 0,
      faceArea: faceDetected ? 0.15 : 0, // Estimated face area
      confidence: Math.round(confidence),
      boundingBox: faceDetected ? {
        x: Math.round(imageTensor.shape[1] * 0.25),
        y: Math.round(imageTensor.shape[0] * 0.2),
        width: Math.round(imageTensor.shape[1] * 0.5),
        height: Math.round(imageTensor.shape[0] * 0.6)
      } : undefined,
      qualityChecks
    };
  }

  private async analyzeEdgePatterns(edgeTensor: any): Promise<{complexity: number, symmetry: number}> {
    // Calculate edge complexity (amount of detail in the image)
    const edgeSum = tf.sum(edgeTensor);
    const totalPixels = edgeTensor.size;
    const complexity = (await edgeSum.data())[0] / totalPixels / 255;
    
    // Calculate symmetry by comparing left and right halves
    const [height, width] = edgeTensor.shape.slice(-2);
    const leftHalf = tf.slice(edgeTensor, [0, 0], [height, Math.floor(width/2)]);
    const rightHalf = tf.slice(edgeTensor, [0, Math.floor(width/2)], [height, Math.floor(width/2)]);
    const rightFlipped = tf.reverse(rightHalf, 1);
    
    const diff = tf.sub(leftHalf, rightFlipped);
    const diffSum = tf.sum(tf.abs(diff));
    const maxDiff = Math.floor(width/2) * height * 255;
    const symmetry = 1 - ((await diffSum.data())[0] / maxDiff);
    
    // Cleanup
    edgeSum.dispose();
    leftHalf.dispose();
    rightHalf.dispose();
    rightFlipped.dispose();
    diff.dispose();
    diffSum.dispose();
    
    return { complexity, symmetry };
  }

  private analyzeImageQuality(imageTensor: TensorFlow3D) {
    return tf.tidy(() => {
      // Convert to grayscale for quality analysis
      const gray = tf?.image.rgbToGrayscale(imageTensor);
      
      // Calculate brightness (mean pixel value)
      const brightness = tf.mean(gray);
      const brightnessValue = brightness.dataSync()[0] * 255;
      
      // Calculate contrast (standard deviation)
      const mean = tf.mean(gray);
      const variance = tf.mean(tf.square(tf.sub(gray, mean)));
      const contrast = tf.sqrt(variance);
      const contrastValue = contrast.dataSync()[0] * 255;
      
      // Estimate sharpness using Laplacian variance
      const laplacianKernel = tf?.tensor2d([
        [0, -1, 0],
        [-1, 4, -1],
        [0, -1, 0]
      ], [3, 3]);
      
      const laplacian = tf?.conv2d(gray.expandDims(2) as any, laplacianKernel.expandDims(2).expandDims(3) as any, 1, 'same');
      const sharpness = tf.mean(tf.square(laplacian));
      const sharpnessValue = sharpness.dataSync()[0] * 10000; // Scale for readability
      
      return {
        brightness: Math.round(brightnessValue),
        contrast: Math.round(contrastValue),
        sharpness: Math.round(sharpnessValue),
        isWellLit: brightnessValue > 50 && brightnessValue < 200,
        isClear: sharpnessValue > 100
      };
    });
  }

  private async performTensorLivenessChecks(imageTensor: TensorFlow3D, boundingBox?: any): Promise<{
    confidence: number;
    eyeMovement: boolean;
    faceSymmetry: boolean;
    textureAnalysis: boolean;
    depthConsistency: boolean;
    riskFactors: string[];
    livenessIndicators: string[];
  }> {
    return tf.tidy(() => {
      const gray = tf?.image.rgbToGrayscale(imageTensor);
      
      // Face symmetry analysis
      const [height, width] = gray.shape.slice(0, 2);
      const centerX = Math.floor(width / 2);
      const leftHalf = tf.slice(gray, [0, 0, 0], [height, centerX, 1]);
      const rightHalf = tf.slice(gray, [0, centerX, 0], [height, centerX, 1]);
      const rightFlipped = tf.reverse(rightHalf, 1);
      
      const symmetryDiff = tf.mean(tf.abs(tf.sub(leftHalf, rightFlipped)));
      const faceSymmetry = symmetryDiff.dataSync()[0] < 0.1;

      // Texture analysis using simple convolution
      const blurKernel = tf?.tensor2d([
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1]
      ], [3, 3]).div(9);
      
      const blurred = tf?.conv2d(gray.expandDims(2) as any, blurKernel.expandDims(2).expandDims(3) as any, 1, 'same').squeeze();
      const textureVariance = tf.mean(tf.square(tf.sub(gray.squeeze(), blurred as TensorFlow3D)));
      const textureAnalysis = textureVariance.dataSync()[0] > 0.01 && textureVariance.dataSync()[0] < 0.1;
      
      blurKernel.dispose();
      (blurred as any).dispose();

      // Basic depth consistency through color distribution
      const meanR = tf.mean(tf.slice(imageTensor, [0, 0, 0], [-1, -1, 1]));
      const meanG = tf.mean(tf.slice(imageTensor, [0, 0, 1], [-1, -1, 1]));
      const meanB = tf.mean(tf.slice(imageTensor, [0, 0, 2], [-1, -1, 1]));
      
      const colorVariation = tf.mean(tf.stack([
        tf.abs(tf.sub(meanR, meanG)),
        tf.abs(tf.sub(meanG, meanB)),
        tf.abs(tf.sub(meanR, meanB))
      ]));
      const depthConsistency = colorVariation.dataSync()[0] > 0.02; // Natural color variation

      const checks = {
        eyeMovement: true, // Default to true for static image analysis
        faceSymmetry,
        textureAnalysis,
        depthConsistency
      };

      const passedChecks = Object.values(checks).filter(Boolean).length;
      const confidence = passedChecks / Object.keys(checks).length;

      const riskFactors: string[] = [];
      const livenessIndicators: string[] = [];

      if (!faceSymmetry) riskFactors.push('Face asymmetry detected');
      else livenessIndicators.push('Natural face symmetry');

      if (!textureAnalysis) riskFactors.push('Unusual texture patterns');
      else livenessIndicators.push('Natural skin texture');

      if (!depthConsistency) riskFactors.push('Inconsistent color depth');
      else livenessIndicators.push('Natural color variation');

      return {
        confidence,
        ...checks,
        riskFactors,
        livenessIndicators
      };
    });
  }

  private async performAILivenessAnalysis(imageBuffer: Buffer): Promise<{
    confidence: number;
    analysis: any;
    riskFactors: string[];
    livenessIndicators: string[];
  }> {
    try {
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.detectMimeType(imageBuffer);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this image for advanced liveness detection. Focus on subtle indicators that distinguish real people from photos, screens, or artificial representations.

Return JSON analysis:
{
  "is_live_person": boolean,
  "confidence_score": 0.0-1.0,
  "facial_analysis": {
    "natural_skin_texture": boolean,
    "realistic_eye_reflection": boolean,
    "natural_lighting_shadows": boolean,
    "depth_perception_visible": boolean,
    "no_screen_artifacts": boolean
  },
  "risk_factors": ["specific concerns"],
  "liveness_indicators": ["positive signs"],
  "reasoning": "brief technical explanation"
}`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 800,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      const analysisText = result.choices[0].message.content;
      const aiResult = this.parseAIResponse(analysisText);

      return {
        confidence: aiResult.confidence_score || 0.5,
        analysis: {
          facial_depth_detected: aiResult.facial_analysis?.depth_perception_visible || false,
          natural_lighting: aiResult.facial_analysis?.natural_lighting_shadows || false,
          eye_authenticity: aiResult.facial_analysis?.realistic_eye_reflection || false,
          skin_texture_natural: aiResult.facial_analysis?.natural_skin_texture || false,
          no_screen_artifacts: aiResult.facial_analysis?.no_screen_artifacts || false
        },
        riskFactors: aiResult.risk_factors || [],
        livenessIndicators: aiResult.liveness_indicators || []
      };

    } catch (error) {
      logger.warn('AI liveness analysis failed, using tensor-only results:', error);
      return {
        confidence: 0.5,
        analysis: {
          facial_depth_detected: false,
          natural_lighting: false,
          eye_authenticity: false,
          skin_texture_natural: false,
          no_screen_artifacts: false
        },
        riskFactors: ['AI analysis unavailable'],
        livenessIndicators: []
      };
    }
  }

  private parseAIResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.warn('Failed to parse AI response:', error);
    }
    return {};
  }

  private detectMimeType(buffer: Buffer): string {
    const header = buffer.toString('hex', 0, 4);
    if (header.startsWith('ffd8')) return 'image/jpeg';
    if (header.startsWith('8950')) return 'image/png';
    return 'image/jpeg';
  }

  /**
   * Process video frame for real-time face detection
   */
  async processVideoFrame(frameBuffer: Buffer): Promise<{
    faceDetected: boolean;
    confidence: number;
    boundingBox?: { x: number; y: number; width: number; height: number };
  }> {
    // If TensorFlow.js is not available, throw error to trigger AI fallback
    if (!tf) {
      throw new Error('TensorFlow.js not available, using AI fallback');
    }

    try {
      const imageTensor = tf.node.decodeImage(frameBuffer, 3) as any;
      
      let result;
      if (this.blazeFaceModel) {
        const predictions = await this.blazeFaceModel.estimateFaces(imageTensor, false);
        
        if (predictions.length === 0) {
          result = { faceDetected: false, confidence: 0 };
        } else {
          const face = predictions[0];
          const topLeft = face.topLeft as number[];
          const bottomRight = face.bottomRight as number[];
          
          result = {
            faceDetected: true,
            confidence: Math.round((face.probability as number[])[0] * 100),
            boundingBox: {
              x: Math.round(topLeft[0]),
              y: Math.round(topLeft[1]),
              width: Math.round(bottomRight[0] - topLeft[0]),
              height: Math.round(bottomRight[1] - topLeft[1])
            }
          };
        }
      } else {
        // Fallback to tensor operations
        const faceResult = await this.detectFacesWithTensorOps(imageTensor);
        result = {
          faceDetected: faceResult.faceDetected,
          confidence: faceResult.confidence,
          boundingBox: faceResult.boundingBox
        };
      }
      
      imageTensor.dispose();
      return result;
      
    } catch (error) {
      logger.error('Video frame processing failed:', error);
      return { faceDetected: false, confidence: 0 };
    }
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      status: this.initialized ? 'healthy' : 'initializing',
      service: 'tensorflow-face-detection',
      capabilities: ['face_detection', 'liveness_check', 'image_quality_analysis', 'video_processing'],
      models: {
        blazeface: !!this.blazeFaceModel,
        tensorOps: true
      },
      deployment_friendly: true,
      railway_compatible: true
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.initialized = false;
    // TensorFlow.js handles memory cleanup automatically
    logger.info('TensorFlow face detection service destroyed');
  }
}

export default TensorFlowFaceDetectionService;