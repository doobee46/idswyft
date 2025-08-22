import Tesseract from 'tesseract.js';
import { logger } from '@/utils/logger.js';
import { StorageService } from './storage.js';
import { VerificationService } from './verification.js';
import config from '@/config/index.js';
import { OCRData } from '@/types/index.js';

export class OCRService {
  private storageService: StorageService;
  private verificationService: VerificationService;
  
  constructor() {
    this.storageService = new StorageService();
    this.verificationService = new VerificationService();
  }
  
  async processDocument(
    documentId: string,
    filePath: string,
    documentType: string
  ): Promise<OCRData> {
    console.log('🔍 Starting OCR processing...', {
      documentId,
      filePath,
      documentType
    });
    
    logger.info('Starting OCR processing', {
      documentId,
      filePath,
      documentType
    });
    
    try {
      // Download the file
      console.log('🔍 Downloading file for OCR...', { filePath });
      const fileBuffer = await this.storageService.downloadFile(filePath);
      console.log('🔍 File downloaded successfully', { 
        bufferSize: fileBuffer.length,
        bufferType: Buffer.isBuffer(fileBuffer) ? 'Buffer' : typeof fileBuffer
      });
      
      // Initialize Tesseract worker
      console.log('🔍 Creating Tesseract worker...');
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`🔍 OCR Progress: ${Math.round(m.progress * 100)}%`);
            logger.debug(`OCR Progress: ${Math.round(m.progress * 100)}%`, {
              documentId
            });
          }
        }
      });
      
      console.log('🔍 Tesseract worker created, starting recognition...');
      // Perform OCR
      const { data } = await worker.recognize(fileBuffer);
      console.log('🔍 OCR recognition completed', {
        textLength: data.text.length,
        confidence: data.confidence,
        textPreview: data.text.substring(0, 100) + '...'
      });
      
      await worker.terminate();
      console.log('🔍 Tesseract worker terminated');
      
      // Extract structured data based on document type
      console.log('🔍 Extracting structured data from OCR text...');
      const ocrData = this.extractStructuredData(data.text, documentType);
      console.log('🔍 Structured data extracted', {
        extractedFields: Object.keys(ocrData),
        ocrData
      });
      
      // Update document record
      console.log('🔍 Updating document record...');
      await this.verificationService.updateDocument(documentId, {
        ocr_extracted: true,
        quality_score: this.calculateQualityScore(data)
      });
      
      logger.info('OCR processing completed', {
        documentId,
        confidence: data.confidence,
        extractedFields: Object.keys(ocrData).length
      });
      
      console.log('✅ OCR processing completed successfully');
      return ocrData;
    } catch (error) {
      console.error('🚨 OCR processing failed:', error);
      console.error('🚨 OCR Error details:', {
        documentId,
        filePath,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });
      
      logger.error('OCR processing failed', {
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      await this.verificationService.updateDocument(documentId, {
        ocr_extracted: false,
        quality_score: 0
      });
      
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private extractStructuredData(text: string, documentType: string): OCRData {
    const ocrData: OCRData = {
      raw_text: text,
      confidence_scores: {}
    };
    
    // Clean up the text
    const cleanText = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    
    try {
      switch (documentType) {
        case 'passport':
          this.extractPassportData(cleanText, ocrData);
          break;
        case 'drivers_license':
          this.extractDriversLicenseData(cleanText, ocrData);
          break;
        case 'national_id':
          this.extractNationalIdData(cleanText, ocrData);
          break;
        default:
          this.extractGenericData(cleanText, ocrData);
      }
    } catch (error) {
      logger.warn('Failed to extract structured data, falling back to generic extraction', {
        documentType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      this.extractGenericData(cleanText, ocrData);
    }
    
    return ocrData;
  }
  
  private extractPassportData(text: string, ocrData: OCRData): void {
    // Extract name (usually after "Name" or "Surname")
    const nameMatch = text.match(/(?:Name|Surname|Given Names?)\s*[:\-]?\s*([A-Z][A-Z\s,]+)/i);
    if (nameMatch) {
      ocrData.name = nameMatch[1].trim();
      ocrData.confidence_scores!.name = 0.8;
    }
    
    // Extract date of birth
    const dobMatch = text.match(/(?:Date of birth|Birth|DOB)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
    if (dobMatch) {
      ocrData.date_of_birth = this.standardizeDateFormat(dobMatch[1]);
      ocrData.confidence_scores!.date_of_birth = 0.9;
    }
    
    // Extract passport number
    const passportMatch = text.match(/(?:Passport No|Number)\s*[:\-]?\s*([A-Z0-9]{6,9})/i);
    if (passportMatch) {
      ocrData.document_number = passportMatch[1];
      ocrData.confidence_scores!.document_number = 0.85;
    }
    
    // Extract expiration date
    const expMatch = text.match(/(?:Date of expiry|Expiry|Expires)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
    if (expMatch) {
      ocrData.expiration_date = this.standardizeDateFormat(expMatch[1]);
      ocrData.confidence_scores!.expiration_date = 0.9;
    }
    
    // Extract nationality
    const nationalityMatch = text.match(/(?:Nationality|Country)\s*[:\-]?\s*([A-Z\s]+)/i);
    if (nationalityMatch) {
      ocrData.nationality = nationalityMatch[1].trim();
      ocrData.confidence_scores!.nationality = 0.7;
    }
  }
  
  private extractDriversLicenseData(text: string, ocrData: OCRData): void {
    // Extract name
    const nameMatch = text.match(/(?:Name|Full Name)\s*[:\-]?\s*([A-Z][A-Z\s,]+)/i);
    if (nameMatch) {
      ocrData.name = nameMatch[1].trim();
      ocrData.confidence_scores!.name = 0.8;
    }
    
    // Extract date of birth
    const dobMatch = text.match(/(?:DOB|Date of birth|Birth)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
    if (dobMatch) {
      ocrData.date_of_birth = this.standardizeDateFormat(dobMatch[1]);
      ocrData.confidence_scores!.date_of_birth = 0.9;
    }
    
    // Extract license number
    const licenseMatch = text.match(/(?:License No|Driver License|DL)\s*[:\-]?\s*([A-Z0-9\-]{6,15})/i);
    if (licenseMatch) {
      ocrData.document_number = licenseMatch[1];
      ocrData.confidence_scores!.document_number = 0.85;
    }
    
    // Extract expiration date
    const expMatch = text.match(/(?:Expires|Expiry|Exp)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
    if (expMatch) {
      ocrData.expiration_date = this.standardizeDateFormat(expMatch[1]);
      ocrData.confidence_scores!.expiration_date = 0.9;
    }
    
    // Extract address
    const addressMatch = text.match(/(?:Address|Addr)\s*[:\-]?\s*([A-Z0-9\s,\.\-]+(?:St|Ave|Rd|Dr|Blvd|Lane|Way)[A-Z0-9\s,\.\-]*)/i);
    if (addressMatch) {
      ocrData.address = addressMatch[1].trim();
      ocrData.confidence_scores!.address = 0.6;
    }
  }
  
  private extractNationalIdData(text: string, ocrData: OCRData): void {
    // Extract name
    const nameMatch = text.match(/(?:Name|Full Name)\s*[:\-]?\s*([A-Z][A-Z\s,]+)/i);
    if (nameMatch) {
      ocrData.name = nameMatch[1].trim();
      ocrData.confidence_scores!.name = 0.8;
    }
    
    // Extract date of birth
    const dobMatch = text.match(/(?:DOB|Date of birth|Born)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
    if (dobMatch) {
      ocrData.date_of_birth = this.standardizeDateFormat(dobMatch[1]);
      ocrData.confidence_scores!.date_of_birth = 0.9;
    }
    
    // Extract ID number
    const idMatch = text.match(/(?:ID No|National ID|Identity)\s*[:\-]?\s*([A-Z0-9\-]{6,20})/i);
    if (idMatch) {
      ocrData.document_number = idMatch[1];
      ocrData.confidence_scores!.document_number = 0.85;
    }
    
    // Extract issuing authority
    const authorityMatch = text.match(/(?:Issued by|Authority|Department)\s*[:\-]?\s*([A-Z\s]+)/i);
    if (authorityMatch) {
      ocrData.issuing_authority = authorityMatch[1].trim();
      ocrData.confidence_scores!.issuing_authority = 0.7;
    }
  }
  
  private extractGenericData(text: string, ocrData: OCRData): void {
    // Generic patterns for common fields
    
    // Names (look for title case sequences)
    const nameMatch = text.match(/\b([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/);
    if (nameMatch) {
      ocrData.name = nameMatch[1];
      ocrData.confidence_scores!.name = 0.6;
    }
    
    // Dates (various formats)
    const dateMatches = text.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g);
    if (dateMatches && dateMatches.length >= 1) {
      ocrData.date_of_birth = this.standardizeDateFormat(dateMatches[0]);
      ocrData.confidence_scores!.date_of_birth = 0.5;
      
      if (dateMatches.length >= 2) {
        ocrData.expiration_date = this.standardizeDateFormat(dateMatches[1]);
        ocrData.confidence_scores!.expiration_date = 0.5;
      }
    }
    
    // Document numbers (alphanumeric sequences)
    const numberMatch = text.match(/\b([A-Z0-9]{6,15})\b/);
    if (numberMatch) {
      ocrData.document_number = numberMatch[1];
      ocrData.confidence_scores!.document_number = 0.4;
    }
  }
  
  private standardizeDateFormat(dateStr: string): string {
    // Convert various date formats to YYYY-MM-DD
    const cleaned = dateStr.replace(/[^\d\/\-\.]/g, '');
    const parts = cleaned.split(/[\/\-\.]/);
    
    if (parts.length !== 3) {
      return dateStr; // Return original if can't parse
    }
    
    let [part1, part2, part3] = parts;
    
    // Handle 2-digit years
    if (part3.length === 2) {
      const year = parseInt(part3);
      part3 = year > 30 ? `19${part3}` : `20${part3}`;
    }
    
    // Determine if it's MM/DD/YYYY or DD/MM/YYYY
    // If first part > 12, assume DD/MM/YYYY
    if (parseInt(part1) > 12) {
      return `${part3}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
    } else {
      return `${part3}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`;
    }
  }
  
  private calculateQualityScore(tesseractData: any): number {
    // Calculate quality score based on Tesseract confidence and other factors
    const confidence = tesseractData.confidence || 0;
    const textLength = tesseractData.text?.length || 0;
    
    // Base score from confidence
    let score = confidence / 100;
    
    // Adjust based on text length (very short or very long might indicate issues)
    if (textLength < 50) {
      score *= 0.7; // Too little text
    } else if (textLength > 2000) {
      score *= 0.8; // Too much text might be noisy
    }
    
    // Ensure score is between 0 and 1
    return Math.max(0, Math.min(1, score));
  }
  
  // Method to validate extracted data
  validateExtractedData(ocrData: OCRData): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check required fields
    if (!ocrData.name || ocrData.name.length < 2) {
      errors.push('Name is missing or too short');
    }
    
    if (!ocrData.document_number || ocrData.document_number.length < 4) {
      errors.push('Document number is missing or too short');
    }
    
    // Validate date formats
    if (ocrData.date_of_birth && !this.isValidDate(ocrData.date_of_birth)) {
      errors.push('Invalid date of birth format');
    }
    
    if (ocrData.expiration_date && !this.isValidDate(ocrData.expiration_date)) {
      errors.push('Invalid expiration date format');
    }
    
    // Check if document is expired
    if (ocrData.expiration_date && this.isValidDate(ocrData.expiration_date)) {
      const expDate = new Date(ocrData.expiration_date);
      if (expDate < new Date()) {
        warnings.push('Document appears to be expired');
      }
    }
    
    // Check confidence scores
    const avgConfidence = Object.values(ocrData.confidence_scores || {})
      .reduce((sum, score) => sum + score, 0) / Object.keys(ocrData.confidence_scores || {}).length;
    
    if (avgConfidence < 0.6) {
      warnings.push('Low OCR confidence scores detected');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private isValidDate(dateStr: string): boolean {
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
  }
}