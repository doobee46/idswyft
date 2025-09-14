import Tesseract from 'tesseract.js';
import { logger } from '@/utils/logger.js';
import { StorageService } from './storage.js';
import { VerificationService } from './verification.js';
import config from '@/config/index.js';
import { OCRData } from '@/types/index.js';
import Jimp from 'jimp';

/**
 * Robust OCR Service - Fixes critical empty text extraction issues
 * Implements multiple preprocessing approaches and fallback mechanisms
 */
export class RobustOCRService {
  private storageService: StorageService;
  private verificationService: VerificationService;
  private useAiOcr: boolean;

  constructor() {
    this.storageService = new StorageService();
    this.verificationService = new VerificationService();
    this.useAiOcr = !!process.env.OPENAI_API_KEY;

    console.log('🔍 RobustOCR initialized -', this.useAiOcr ? 'AI+Fallback' : 'Tesseract Multi-approach');
  }

  /**
   * Main OCR processing with multiple approaches for robustness
   */
  async processDocument(
    documentId: string,
    filePath: string,
    documentType: string
  ): Promise<OCRData> {
    console.log('🔍 Starting robust OCR processing...', {
      documentId, filePath, documentType
    });

    try {
      // Download file
      const fileBuffer = await this.storageService.downloadFile(filePath);
      console.log('🔍 File downloaded:', { sizeKB: Math.round(fileBuffer.length / 1024) });

      let ocrData: OCRData;

      if (this.useAiOcr) {
        try {
          console.log('🤖 Attempting AI-powered OCR first...');
          ocrData = await this.processWithAI(fileBuffer, documentType);
        } catch (aiError) {
          console.warn('🤖 AI OCR failed, falling back to robust Tesseract:', aiError);
          ocrData = await this.processWithRobustTesseract(fileBuffer, documentType);
        }
      } else {
        ocrData = await this.processWithRobustTesseract(fileBuffer, documentType);
      }

      // Update document record
      await this.verificationService.updateDocument(documentId, {
        ocr_extracted: true,
        quality_score: this.calculateQualityScore(ocrData)
      });

      logger.info('Robust OCR completed successfully', {
        documentId,
        extractedFields: Object.keys(ocrData).length,
        hasText: !!ocrData.name || !!ocrData.document_number
      });

      return ocrData;

    } catch (error) {
      logger.error('Robust OCR processing failed:', error);
      throw new Error(`OCR processing failed: ${error}`);
    }
  }

  /**
   * Robust Tesseract processing with multiple approaches
   */
  private async processWithRobustTesseract(imageBuffer: Buffer, documentType: string): Promise<OCRData> {
    console.log('🔍 Starting multi-approach Tesseract processing...');

    const approaches = [
      { name: 'enhanced', preprocessing: 'enhanced', psm: Tesseract.PSM.SINGLE_BLOCK },
      { name: 'auto_osd', preprocessing: 'minimal', psm: Tesseract.PSM.AUTO_OSD },
      { name: 'single_column', preprocessing: 'enhanced', psm: Tesseract.PSM.SINGLE_COLUMN },
      { name: 'raw_auto', preprocessing: 'none', psm: Tesseract.PSM.AUTO },
      { name: 'raw_block', preprocessing: 'none', psm: Tesseract.PSM.SINGLE_BLOCK }
    ];

    let bestResult = { text: '', confidence: 0, data: this.createEmptyOCRData() };

    for (const approach of approaches) {
      try {
        console.log(`🔍 Trying ${approach.name} (PSM: ${approach.psm})...`);

        // Apply preprocessing based on approach
        let processedBuffer = imageBuffer;
        if (approach.preprocessing === 'enhanced') {
          processedBuffer = await this.preprocessImageEnhanced(imageBuffer);
        } else if (approach.preprocessing === 'minimal') {
          processedBuffer = await this.preprocessImageMinimal(imageBuffer);
        }
        // 'none' uses raw buffer

        // Run OCR with this approach
        const result = await this.runTesseractOCR(processedBuffer, approach.psm, approach.name);

        // Evaluate result quality
        const quality = this.evaluateOCRQuality(result.text);
        console.log(`🔍 ${approach.name} quality:`, {
          textLength: result.text.length,
          confidence: result.confidence,
          qualityScore: quality
        });

        // Keep best result based on text length and confidence
        if (quality > this.evaluateOCRQuality(bestResult.text) ||
            (quality === this.evaluateOCRQuality(bestResult.text) && result.confidence > bestResult.confidence)) {

          console.log(`✅ ${approach.name} produced better results`);
          bestResult = {
            text: result.text,
            confidence: result.confidence,
            data: this.extractStructuredData(result.text, documentType)
          };

          // If we get very good results, stop trying more approaches
          if (quality >= 0.8 && result.confidence > 75 && result.text.length > 100) {
            console.log(`🎯 Excellent results with ${approach.name}, stopping here`);
            break;
          }
        }

      } catch (error) {
        console.error(`🚨 ${approach.name} failed:`, error);
        continue;
      }
    }

    // Validate we got usable results
    if (this.evaluateOCRQuality(bestResult.text) < 0.1) {
      console.error('🚨 All OCR approaches failed to extract meaningful text');
      throw new Error('OCR extraction failed: No readable text found in image');
    }

    console.log('✅ Best OCR result:', {
      approach: 'multi-approach',
      textLength: bestResult.text.length,
      confidence: bestResult.confidence,
      extractedFields: Object.keys(bestResult.data).filter(k => bestResult.data[k as keyof OCRData]).length
    });

    return bestResult.data;
  }

  /**
   * Enhanced image preprocessing for OCR
   */
  private async preprocessImageEnhanced(imageBuffer: Buffer): Promise<Buffer> {
    try {
      const image = await Jimp.read(imageBuffer);

      return await image
        .resize(1600, Jimp.AUTO) // Optimal size for OCR
        .greyscale()
        .contrast(0.25)
        .brightness(0.1)
        .normalize()
        .getBufferAsync(Jimp.MIME_PNG);

    } catch (error) {
      console.warn('Enhanced preprocessing failed, using original:', error);
      return imageBuffer;
    }
  }

  /**
   * Minimal image preprocessing
   */
  private async preprocessImageMinimal(imageBuffer: Buffer): Promise<Buffer> {
    try {
      const image = await Jimp.read(imageBuffer);

      return await image
        .resize(1200, Jimp.AUTO)
        .greyscale()
        .getBufferAsync(Jimp.MIME_PNG);

    } catch (error) {
      console.warn('Minimal preprocessing failed, using original:', error);
      return imageBuffer;
    }
  }

  /**
   * Run Tesseract OCR with specific configuration
   */
  private async runTesseractOCR(imageBuffer: Buffer, psm: string, approachName: string) {
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`🔍 ${approachName} progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    try {
      await worker.setParameters({
        tessedit_pageseg_mode: psm as any,
        preserve_interword_spaces: '1',
        tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
        tessedit_char_blacklist: ''
      });

      const { data } = await worker.recognize(imageBuffer);
      return { text: data.text, confidence: data.confidence };

    } finally {
      await worker.terminate();
    }
  }

  /**
   * Evaluate OCR result quality (0.0 to 1.0)
   */
  private evaluateOCRQuality(text: string): number {
    if (!text || text.length === 0) return 0;

    let score = 0;

    // Length score
    if (text.length > 50) score += 0.3;
    else if (text.length > 20) score += 0.2;
    else if (text.length > 5) score += 0.1;

    // Word count
    const words = text.trim().split(/\s+/).length;
    if (words > 10) score += 0.3;
    else if (words > 5) score += 0.2;

    // Character variety (indicates real text vs noise)
    const uniqueChars = new Set(text.toLowerCase()).size;
    if (uniqueChars > 15) score += 0.2;
    else if (uniqueChars > 10) score += 0.1;

    // Look for document-like patterns
    if (/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(text)) score += 0.1; // Dates
    if (/\b[A-Z]{2,}\b/.test(text)) score += 0.1; // Uppercase words

    return Math.min(score, 1.0);
  }

  /**
   * Calculate quality score for document record
   */
  private calculateQualityScore(ocrData: OCRData): number {
    let score = 0.3; // Base score for successful extraction

    if (ocrData.name) score += 0.2;
    if (ocrData.document_number) score += 0.2;
    if (ocrData.date_of_birth) score += 0.15;
    if (ocrData.expiration_date) score += 0.15;

    return Math.min(score, 1.0);
  }

  /**
   * Create empty OCR data structure
   */
  private createEmptyOCRData(): OCRData {
    return {
      name: '',
      document_number: '',
      date_of_birth: '',
      expiration_date: '',
      nationality: '',
      address: '',
      confidence_scores: {},
      raw_text: ''
    };
  }

  /**
   * AI OCR processing (placeholder - would use existing implementation)
   */
  private async processWithAI(imageBuffer: Buffer, documentType: string): Promise<OCRData> {
    // This would use the existing AI OCR implementation
    // For now, throw to force fallback to robust Tesseract
    throw new Error('AI OCR temporarily disabled for robust processing');
  }

  /**
   * Extract structured data from OCR text
   */
  private extractStructuredData(text: string, documentType: string): OCRData {
    const ocrData = this.createEmptyOCRData();
    ocrData.raw_text = text;

    if (documentType === 'drivers_license') {
      this.extractDriversLicenseData(text, ocrData);
    } else if (documentType === 'passport') {
      this.extractPassportData(text, ocrData);
    } else {
      this.extractGenericIdData(text, ocrData);
    }

    return ocrData;
  }

  /**
   * Extract driver's license specific data
   */
  private extractDriversLicenseData(text: string, ocrData: OCRData): void {
    // Name extraction
    const namePatterns = [
      /(?:Name|LN|FN)\s*:?\s*([A-Z][A-Za-z\s,]{2,})/i,
      /\b([A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,})?)\b/,
      /^\s*([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/m
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1].length > 3) {
        ocrData.name = match[1].trim().replace(/\s+/g, ' ');
        break;
      }
    }

    // Date of birth
    const dobMatch = text.match(/(?:DOB|Birth|Born)\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
    if (dobMatch) {
      ocrData.date_of_birth = dobMatch[1];
    }

    // License number
    const licenseMatch = text.match(/(?:License|DL|ID)\s*:?\s*([A-Z0-9\-]{6,15})/i);
    if (licenseMatch) {
      ocrData.document_number = licenseMatch[1];
    }

    // Expiration
    const expMatch = text.match(/(?:Exp|Expires)\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
    if (expMatch) {
      ocrData.expiration_date = expMatch[1];
    }
  }

  /**
   * Extract passport specific data
   */
  private extractPassportData(text: string, ocrData: OCRData): void {
    // Similar patterns but adapted for passport format
    const nameMatch = text.match(/(?:Name|Surname)\s*:?\s*([A-Z][A-Za-z\s,]{2,})/i);
    if (nameMatch) {
      ocrData.name = nameMatch[1].trim();
    }

    const passportMatch = text.match(/(?:Passport)\s*:?\s*([A-Z0-9]{6,9})/i);
    if (passportMatch) {
      ocrData.document_number = passportMatch[1];
    }
  }

  /**
   * Generic ID data extraction
   */
  private extractGenericIdData(text: string, ocrData: OCRData): void {
    // Generic patterns for any ID document
    const nameMatch = text.match(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/);
    if (nameMatch) {
      ocrData.name = nameMatch[1];
    }

    const dateMatch = text.match(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/);
    if (dateMatch) {
      ocrData.date_of_birth = dateMatch[1];
    }
  }
}