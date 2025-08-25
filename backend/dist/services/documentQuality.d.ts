export interface DocumentQualityResult {
    isBlurry: boolean;
    blurScore: number;
    brightness: number;
    contrast: number;
    resolution: {
        width: number;
        height: number;
        isHighRes: boolean;
    };
    fileSize: {
        bytes: number;
        isReasonableSize: boolean;
    };
    overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
    issues: string[];
    recommendations: string[];
}
export declare class DocumentQualityService {
    private static readonly MIN_WIDTH;
    private static readonly MIN_HEIGHT;
    private static readonly MAX_FILE_SIZE;
    private static readonly MIN_FILE_SIZE;
    private static readonly BLUR_THRESHOLD;
    private static readonly MIN_BRIGHTNESS;
    private static readonly MAX_BRIGHTNESS;
    static analyzeDocument(filePath: string): Promise<DocumentQualityResult>;
    private static calculateImageStats;
    private static calculateBlurScore;
    private static determineOverallQuality;
}
