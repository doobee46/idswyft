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
 * AI-powered face detection service using OpenAI Vision API
 * Provides cloud-friendly computer vision capabilities
 */
declare class AIFaceDetectionService {
    private storageService;
    private initialized;
    constructor();
    private initialize;
    /**
     * Detect faces using AI vision API
     */
    detectFaces(imageBuffer: Buffer): Promise<FaceDetectionResult>;
    /**
     * Perform liveness detection using AI
     */
    performLivenessCheck(imageBuffer: Buffer): Promise<LivenessResult>;
    /**
     * AI-powered face detection using OpenAI Vision API
     */
    private detectFacesWithAI;
    /**
     * Fallback face detection using image analysis
     */
    private detectFacesWithImageAnalysis;
    private parseAIFaceResponse;
    private parseAILivenessResponse;
    private detectMimeType;
    private calculateBrightness;
    private calculateContrast;
    /**
     * Process video frame for real-time face detection
     */
    processVideoFrame(frameBuffer: Buffer): Promise<{
        faceDetected: boolean;
        confidence: number;
        boundingBox?: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    }>;
    /**
     * Get service health status
     */
    getHealthStatus(): {
        status: string;
        service: string;
        capabilities: string[];
    };
}
export default AIFaceDetectionService;
