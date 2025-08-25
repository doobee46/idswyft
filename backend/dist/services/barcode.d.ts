export interface BarcodeResult {
    type: 'qr_code' | 'barcode' | 'pdf417' | 'datamatrix';
    data: string;
    decoded_data?: any;
    confidence: number;
    location?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
export interface BackOfIdData {
    magnetic_stripe?: string;
    qr_code?: string;
    barcode_data?: string;
    parsed_data?: {
        id_number?: string;
        expiry_date?: string;
        issuing_authority?: string;
        address?: string;
        additional_info?: any;
    };
    verification_codes?: string[];
    security_features?: string[];
}
export declare class BarcodeService {
    private storageService;
    useAiBarcodeReading: boolean;
    constructor();
    scanBackOfId(imagePath: string): Promise<BackOfIdData>;
    private scanWithAI;
    private scanWithTraditional;
    private detectBarcodesInImage;
    private detectQRCodesInImage;
    private analyzeHorizontalLine;
    private detectSquareCorners;
    private isSquarePattern;
    private extractTextFromBackOfId;
    private extractVerificationCodes;
    private detectSecurityFeatures;
    private getAverageBrightness;
    private getImageContrast;
    private hasRepeatingPatterns;
    private compareSections;
    private detectMimeType;
    private parseAIBarcodeResponse;
    private extractDataFromText;
    private scanWithLocalOCR;
    private preprocessImageForBackOfId;
    private extractBackOfIdStructuredData;
    private parseDate;
    private standardizeDateFormat;
    private normalizeDateForComparison;
    crossValidateWithFrontId(frontOcrData: any, backOfIdData: BackOfIdData): Promise<{
        match_score: number;
        validation_results: {
            id_number_match?: boolean;
            expiry_date_match?: boolean;
            issuing_authority_match?: boolean;
            overall_consistency: boolean;
        };
        discrepancies: string[];
    }>;
    private matchIssuingAuthorities;
    healthCheck(): Promise<{
        status: string;
        ai_enabled: boolean;
        error?: string;
    }>;
}
