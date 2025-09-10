export declare class FaceRecognitionService {
    private storageService;
    private enhancedFaceService;
    private isInitialized;
    private faceModel;
    private useAiFaceMatching;
    private useAiLivenessDetection;
    private useTensorFlowFaceMatching;
    private useModernFaceRecognition;
    private faceDetector;
    private faceLandmarkDetector;
    constructor();
    private initialize;
    /**
     * Compare faces between front and back of ID documents to ensure they belong to the same person
     * This is a critical security validation to prevent identity fraud
     * @param frontDocumentPath Path to front document image
     * @param backDocumentPath Path to back document image
     * @returns Similarity score between 0-1 (higher = more similar)
     */
    compareDocumentPhotos(frontDocumentPath: string, backDocumentPath: string): Promise<number>;
    compareFaces(documentPath: string, selfiePath: string): Promise<number>;
    private compareWithAI;
    private compareWithTensorFlow;
    private compareWithTraditional;
    private extractEnhancedFeatures;
    private extractLBPFeatures;
    private extractEdgeFeatures;
    private extractTextureFeatures;
    private compareFaceRegions;
    private compareMultiScale;
    private assessImageQuality;
    private extractSimpleFeatures;
    private calculateGradients;
    private calculateCosineSimilarity;
    private secureFaceComparisonFallback;
    detectLiveness(imagePath: string, challengeResponse?: string): Promise<number>;
    private detectLivenessWithAI;
    private detectLivenessWithTraditional;
    detectLivenessDetailed(imagePath: string): Promise<{
        isLive: boolean;
        confidence: number;
        checks: {
            blinkDetected: boolean;
            headMovement: boolean;
            eyeGaze: boolean;
        };
        aiAnalysis?: {
            facial_depth_detected: boolean;
            natural_lighting: boolean;
            eye_authenticity: boolean;
            skin_texture_natural: boolean;
            no_screen_artifacts: boolean;
        };
        risk_factors?: string[];
        liveness_indicators?: string[];
    }>;
    private detectLivenessDetailedWithAI;
    private detectLivenessDetailedWithTraditional;
    private analyzeLivenessFeatures;
    /**
     * Detect motion blur which can indicate natural movement (liveness)
     */
    private detectMotionBlur;
    /**
     * Detect if there's a face within the circular capture area
     */
    private detectFaceInCircularArea;
    /**
     * TensorFlow-based face detection in circular area
     */
    private detectFaceWithTensorFlow;
    /**
     * Traditional face detection methods for circular area
     */
    private detectFaceWithTraditionalMethods;
    /**
     * Create a mask for the circular area
     */
    private createCircularMask;
    /**
     * Detect skin-like colors in the circular area
     */
    private detectSkinInCircularArea;
    /**
     * Simple skin color detection
     */
    private isSkinLikeColor;
    /**
     * Detect facial features like eyes, nose, mouth patterns
     */
    private detectFacialFeatures;
    /**
     * Detect eye-like regions (dark spots in upper face area)
     */
    private detectEyeRegions;
    /**
     * Detect mouth region
     */
    private detectMouthRegion;
    /**
     * Calculate facial symmetry
     */
    private calculateFacialSymmetry;
    private detectImageQuality;
    private analyzeImageSharpness;
    private checkImageNaturalness;
    private validateChallengeResponse;
    private detectEyeActivity;
    private detectHeadMovement;
    private detectSmile;
    private detectGazeDirection;
    private getAverageBrightness;
    private getImageContrast;
    private detectFaceAsymmetry;
    private detectCurvature;
    private analyzeColorDepth;
    private analyzeEyeRegions;
    private secureLivenessFallback;
    private secureDetailedLivenessFallback;
    private detectMimeType;
    private parseAIFaceComparison;
    private extractScoreFromText;
    private parseAILivenessResponse;
    private extractLivenessFromText;
    extractFaceImage(imagePath: string): Promise<Buffer | null>;
    private imageBufferToTensor;
    private extractFaceEmbedding;
    private initializeTensorFlowModels;
    private detectFaces;
    private createFaceEmbedding;
    private calculateEmbeddingSimilarity;
    healthCheck(): Promise<{
        status: string;
        modelsLoaded: boolean;
        error?: string;
    }>;
}
