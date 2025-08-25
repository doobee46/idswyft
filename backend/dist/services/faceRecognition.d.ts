export declare class FaceRecognitionService {
    private storageService;
    private isInitialized;
    private faceModel;
    private useAiFaceMatching;
    private useAiLivenessDetection;
    constructor();
    private initialize;
    compareFaces(documentPath: string, selfiePath: string): Promise<number>;
    private compareWithAI;
    private compareWithTraditional;
    private extractSimpleFeatures;
    private calculateGradients;
    private calculateCosineSimilarity;
    private mockFaceComparison;
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
    private analyzeEyeRegions;
    private mockLivenessScore;
    private mockLivenessDetection;
    private detectMimeType;
    private parseAIFaceComparison;
    private extractScoreFromText;
    private parseAILivenessResponse;
    private extractLivenessFromText;
    extractFaceImage(imagePath: string): Promise<Buffer | null>;
    healthCheck(): Promise<{
        status: string;
        modelsLoaded: boolean;
        error?: string;
    }>;
}
