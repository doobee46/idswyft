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
declare class TensorFlowFaceDetectionService {
    private storageService;
    private initialized;
    private blazeFaceModel;
    constructor();
    private initialize;
    private loadBlazeFaceModel;
    /**
     * Detect faces using TensorFlow.js
     */
    detectFaces(imageBuffer: Buffer): Promise<FaceDetectionResult>;
    /**
     * Perform liveness detection using TensorFlow.js and AI analysis
     */
    performLivenessCheck(imageBuffer: Buffer): Promise<LivenessResult>;
    private detectFacesWithBlazeFace;
    private detectFacesWithTensorOps;
    private analyzeEdgePatterns;
    private analyzeImageQuality;
    private performTensorLivenessChecks;
    private performAILivenessAnalysis;
    private parseAIResponse;
    private detectMimeType;
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
        models: {
            blazeface: boolean;
            tensorOps: boolean;
        };
        deployment_friendly: boolean;
        railway_compatible: boolean;
    };
    /**
     * Cleanup resources
     */
    destroy(): void;
}
export default TensorFlowFaceDetectionService;
