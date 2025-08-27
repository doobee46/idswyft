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
export interface PDF417Data {
    raw_data: string;
    parsed_data: {
        firstName?: string;
        lastName?: string;
        middleName?: string;
        dateOfBirth?: string;
        licenseNumber?: string;
        expirationDate?: string;
        issueDate?: string;
        address?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        gender?: string;
        eyeColor?: string;
        height?: string;
        weight?: string;
        endorsements?: string;
        restrictions?: string;
        vehicleClass?: string;
        organ_donor?: boolean;
    };
    confidence: number;
    validation_status: 'valid' | 'invalid' | 'partial';
}
export interface BackOfIdData {
    magnetic_stripe?: string;
    qr_code?: string;
    barcode_data?: string;
    pdf417_data?: PDF417Data;
    raw_text?: string;
    parsed_data?: {
        id_number?: string;
        expiry_date?: string;
        issuing_authority?: string;
        address?: string;
        first_name?: string;
        last_name?: string;
        date_of_birth?: string;
        additional_info?: any;
    };
    verification_codes?: string[];
    security_features?: string[];
}
export declare class BarcodeService {
    private storageService;
    useAiBarcodeReading: boolean;
    constructor();
    /**
     * Parse PDF417 barcode data from driver's license
     * Supports both live scan and uploaded images
     */
    parsePDF417(rawBarcodeData: string): Promise<PDF417Data>;
    scanBackOfId(imagePath: string): Promise<BackOfIdData>;
    /**
     * Combined PDF417 + OCR scanning method
     * First attempts to detect and parse PDF417 barcode, then falls back to OCR
     */
    private scanWithPDF417AndOCR;
    /**
     * Detect and extract PDF417 barcode using OCR and pattern matching
     */
    private detectPDF417WithOCR;
    /**
     * Legacy AI-based PDF417 detection (now unused)
     */
    private detectPDF417WithAI;
    /**
     * Detect and decode PDF417 barcode from image using ZXing library
     */
    private detectPDF417WithZXing;
    /**
     * Manually parse AAMVA field codes from PDF417 raw data
     * Fallback when parse-usdl library doesn't extract sufficient data
     */
    private parseAAMVAFieldCodes;
    /**
     * Convert height from display format (5'-07") to AAMVA format (507)
     */
    private convertToAAMVAHeight;
    /**
     * Calculate similarity between two addresses for flexible matching
     */
    private calculateAddressSimilarity;
    /**
     * Compare height formats (handle various formats like "5'-07"", "507", etc.)
     */
    private compareHeightFormats;
    /**
     * Calculate Levenshtein distance for string similarity
     */
    private levenshteinDistance;
    /**
     * Helper method to combine address components from PDF417 data
     */
    private combineAddress;
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
            name_match?: boolean;
            pdf417_validation?: 'valid' | 'invalid' | 'partial' | 'not_found';
            overall_consistency: boolean;
        };
        discrepancies: string[];
        pdf417_insights?: {
            data_quality: number;
            fields_matched: number;
            critical_data_present: boolean;
        };
    }>;
    private matchIssuingAuthorities;
    healthCheck(): Promise<{
        status: string;
        ai_enabled: boolean;
        error?: string;
    }>;
}
