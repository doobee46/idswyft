import { OCRData } from '../types/index.js';
export declare class OCRService {
    private storageService;
    private verificationService;
    private useAiOcr;
    constructor();
    processDocument(documentId: string, filePath: string, documentType: string): Promise<OCRData>;
    private preprocessImage;
    private extractStructuredData;
    private extractPassportData;
    private extractDriversLicenseData;
    private extractNationalIdData;
    private extractGenericData;
    private standardizeDateFormat;
    private calculateQualityScore;
    validateExtractedData(ocrData: OCRData): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    };
    private isValidDate;
    private processWithAI;
    private processWithTesseract;
    private detectMimeType;
    private createAIPrompt;
    private parseAIResponse;
    private extractFromAIText;
}
