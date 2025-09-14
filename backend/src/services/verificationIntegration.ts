import { RobustOCRService } from './robustOcr.js';
import { RobustBarcodeService } from './robustBarcode.js';
import { RobustCrossValidationService } from './robustCrossValidation.js';
import { RobustVerificationManager } from './robustVerificationManager.js';
import { VerificationService } from './verification.js';
import { logger } from '@/utils/logger.js';

/**
 * Integration layer for robust verification services
 * Provides seamless migration from old services to robust implementations
 */
export class VerificationIntegration {
  private robustOCR: RobustOCRService;
  private robustBarcode: RobustBarcodeService;
  private robustCrossValidation: RobustCrossValidationService;
  private robustManager: RobustVerificationManager;
  private verificationService: VerificationService;

  constructor() {
    this.robustOCR = new RobustOCRService();
    this.robustBarcode = new RobustBarcodeService();
    this.robustCrossValidation = new RobustCrossValidationService();
    this.robustManager = new RobustVerificationManager();
    this.verificationService = new VerificationService();

    console.log('🔧 VerificationIntegration initialized with robust services');
  }

  /**
   * Process document with robust OCR
   */
  async processDocument(
    documentId: string,
    filePath: string,
    documentType: string
  ) {
    console.log('🔧 Using robust OCR processing...', {
      documentId,
      filePath,
      documentType
    });

    try {
      const ocrData = await this.robustOCR.processDocument(documentId, filePath, documentType);

      // Update document with OCR data
      await this.verificationService.updateDocument(documentId, {
        ocr_data: ocrData
      });

      console.log('✅ Robust OCR processing completed successfully');
      return ocrData;
    } catch (error) {
      console.error('🚨 Robust OCR processing failed:', error);
      throw error;
    }
  }

  /**
   * Scan back of ID with robust barcode service
   */
  async scanBackOfId(imagePath: string) {
    console.log('🔧 Using robust barcode scanning...', { imagePath });

    try {
      const result = await this.robustBarcode.scanBackOfId(imagePath);
      console.log('✅ Robust barcode scanning completed successfully');
      return result;
    } catch (error) {
      console.error('🚨 Robust barcode scanning failed:', error);
      throw error;
    }
  }

  /**
   * Perform cross-validation with robust service
   */
  async performCrossValidation(frontOCR: any, backPDF417: any, verificationId: string) {
    console.log('🔧 Using robust cross-validation...', { verificationId });

    try {
      const validationInput = {
        frontOCR,
        backPDF417,
        verificationId
      };

      const result = await this.robustCrossValidation.performCrossValidation(validationInput);
      console.log('✅ Robust cross-validation completed successfully');
      return result;
    } catch (error) {
      console.error('🚨 Robust cross-validation failed:', error);
      throw error;
    }
  }

  /**
   * Process live capture completion with robust manager
   */
  async processLiveCaptureCompletion(context: {
    verificationId: string;
    isSandbox: boolean;
    organizationId?: string;
    faceMatchScore?: number;
    livenessScore?: number;
    crossValidationScore?: number;
    ocrQuality?: number;
    documentPhotoQuality?: number;
  }) {
    console.log('🔧 Using robust verification manager for live capture completion...', {
      verificationId: context.verificationId
    });

    try {
      const result = await this.robustManager.processLiveCaptureCompletion(context);
      console.log('✅ Robust live capture processing completed successfully');
      return result;
    } catch (error) {
      console.error('🚨 Robust live capture processing failed:', error);
      throw error;
    }
  }

  /**
   * Force complete stuck verifications
   */
  async forceCompleteVerification(verificationId: string, reason?: string) {
    console.log('🔧 Force completing verification with robust manager...', { verificationId });

    try {
      const result = await this.robustManager.forceCompleteVerification(verificationId, reason);
      console.log('✅ Force completion processed successfully');
      return result;
    } catch (error) {
      console.error('🚨 Force completion failed:', error);
      throw error;
    }
  }

  /**
   * Fix stuck verifications
   */
  async fixStuckVerifications() {
    console.log('🔧 Checking for stuck verifications...');

    try {
      const result = await this.robustManager.fixStuckVerifications();
      console.log('✅ Stuck verification cleanup completed');
      return result;
    } catch (error) {
      console.error('🚨 Stuck verification cleanup failed:', error);
      throw error;
    }
  }
}