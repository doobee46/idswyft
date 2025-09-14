import express, { Request, Response } from 'express';
import multer from 'multer';
import { body, param, validationResult } from 'express-validator';
import { authenticateAPIKey, authenticateUser, checkSandboxMode } from '@/middleware/auth.js';
import { verificationRateLimit } from '@/middleware/rateLimit.js';
import { catchAsync, ValidationError, FileUploadError } from '@/middleware/errorHandler.js';
import { VerificationService } from '@/services/verification.js';
import { StorageService } from '@/services/storage.js';
import { RobustOCRService } from '@/services/robustOcr.js';
import { RobustBarcodeService } from '@/services/robustBarcode.js';
import { RobustCrossValidationService } from '@/services/robustCrossValidation.js';
import { RobustVerificationManager } from '@/services/robustVerificationManager.js';
import { FaceRecognitionService } from '@/services/faceRecognition.js';
import { logger, logVerificationEvent } from '@/utils/logger.js';
import { supabase } from '@/config/database.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new FileUploadError(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`));
    }
  }
});

// Initialize robust services
const verificationService = new VerificationService();
const storageService = new StorageService();
const robustOCRService = new RobustOCRService();
const robustBarcodeService = new RobustBarcodeService();
const robustCrossValidationService = new RobustCrossValidationService();
const robustVerificationManager = new RobustVerificationManager();
const faceRecognitionService = new FaceRecognitionService();

/**
 * Helper function to get organization ID from request
 */
function getOrganizationId(req: any): string | null {
  return req.developer?.id || null;
}

// Route: POST /api/verify/robust/document - Upload document with robust processing
router.post('/document',
  authenticateAPIKey,
  checkSandboxMode,
  verificationRateLimit,
  upload.single('document'),
  [
    body('verification_id')
      .isUUID()
      .withMessage('Verification ID must be a valid UUID'),
    body('document_type')
      .isIn(['passport', 'drivers_license', 'national_id', 'other'])
      .withMessage('Document type must be one of: passport, drivers_license, national_id, other'),
    body('sandbox')
      .optional()
      .isBoolean()
      .withMessage('Sandbox must be a boolean')
  ],
  catchAsync(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', 'multiple', errors.array());
    }

    const { verification_id, document_type } = req.body;
    const file = req.file;

    if (!file) {
      throw new FileUploadError('Document file is required');
    }

    // Get verification request
    const verificationRequest = await verificationService.getVerificationRequest(verification_id);
    if (!verificationRequest) {
      throw new ValidationError('Verification request not found', 'verification_id', verification_id);
    }

    // Authenticate user
    req.body.user_id = verificationRequest.user_id;
    await new Promise((resolve, reject) => {
      authenticateUser(req as any, res as any, (err: any) => {
        if (err) reject(err);
        else resolve(true);
      });
    });

    logVerificationEvent('robust_document_upload_started', verification_id, {
      userId: verificationRequest.user_id,
      documentType: document_type,
      fileSize: file.size,
      mimeType: file.mimetype,
      developerId: (req as any).developer?.id,
      isSandbox: req.isSandbox
    });

    try {
      // Store document file
      const documentPath = await storageService.storeDocument(
        file.buffer,
        file.originalname,
        file.mimetype,
        verificationRequest.id
      );

      // Create document record
      const document = await verificationService.createDocument({
        verification_request_id: verificationRequest.id,
        file_path: documentPath,
        file_name: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
        document_type
      });

      console.log('🔄 Starting robust OCR processing...', {
        documentId: document.id,
        documentPath,
        documentType: document_type,
        verificationId: verificationRequest.id
      });

      // Process document with robust OCR service
      robustOCRService.processDocument(document.id, documentPath, document_type)
        .then(async (ocrData) => {
          console.log('✅ Robust OCR processing succeeded:', {
            verificationId: verificationRequest.id,
            documentId: document.id,
            extractedFields: Object.keys(ocrData).filter(k => ocrData[k as keyof typeof ocrData]).length
          });

          // Store OCR data in the documents table
          await verificationService.updateDocument(document.id, {
            ocr_data: ocrData
          });

          // Update verification status - let the robust manager handle state transitions
          await verificationService.updateVerificationRequest(verificationRequest.id, {
            status: 'document_uploaded'
          });

          logVerificationEvent('robust_ocr_completed', verificationRequest.id, {
            documentId: document.id,
            extractedFields: Object.keys(ocrData).filter(k => ocrData[k as keyof typeof ocrData]).length,
            hasName: !!ocrData.name,
            hasDocumentNumber: !!ocrData.document_number
          });
        })
        .catch(async (error) => {
          console.error('🚨 Robust OCR processing failed:', error);
          logger.error('Robust OCR processing failed:', error);

          // Use robust verification manager to handle the failure
          const context = {
            verificationId: verificationRequest.id,
            isSandbox: req.isSandbox,
            organizationId: getOrganizationId(req)
          };

          await robustVerificationManager.forceCompleteVerification(
            verificationRequest.id,
            'OCR processing failed - requires manual review'
          );
        });

      res.status(201).json({
        verification_id: verificationRequest.id,
        status: verificationRequest.status,
        message: 'Document uploaded successfully. Robust OCR processing started.',
        document_id: document.id,
        robust_processing: true,
        next_steps: 'Upload a selfie using /api/verify/robust/live-capture or check status'
      });

    } catch (error) {
      logVerificationEvent('robust_document_upload_failed', verification_id, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  })
);

// Route: POST /api/verify/robust/back-of-id - Upload back-of-ID with robust processing
router.post('/back-of-id',
  authenticateAPIKey,
  checkSandboxMode,
  verificationRateLimit,
  upload.single('back_of_id'),
  [
    body('verification_id')
      .isUUID()
      .withMessage('Verification ID must be a valid UUID'),
    body('document_type')
      .isIn(['passport', 'drivers_license', 'national_id', 'other'])
      .withMessage('Document type must match the front-of-ID document type'),
    body('sandbox')
      .optional()
      .isBoolean()
      .withMessage('Sandbox must be a boolean')
  ],
  catchAsync(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', 'multiple', errors.array());
    }

    const { verification_id, document_type } = req.body;
    const file = req.file;

    if (!file) {
      throw new FileUploadError('Back-of-ID file is required');
    }

    // Get verification request
    const verificationRequest = await verificationService.getVerificationRequest(verification_id);
    if (!verificationRequest) {
      throw new ValidationError('Verification request not found', 'verification_id', verification_id);
    }

    // Check if front-of-ID exists
    const frontDocument = await verificationService.getDocumentByVerificationId(verification_id);
    if (!frontDocument) {
      throw new ValidationError('Front-of-ID must be uploaded before back-of-ID', 'front_document', 'missing');
    }

    logVerificationEvent('robust_back_of_id_upload_started', verification_id, {
      userId: verificationRequest.user_id,
      documentType: document_type,
      fileSize: file.size,
      mimeType: file.mimetype
    });

    try {
      // Store back-of-ID file
      const backOfIdPath = await storageService.storeDocument(
        file.buffer,
        `back_${file.originalname}`,
        file.mimetype,
        verificationRequest.id
      );

      // Create back-of-ID document record
      const backOfIdDocument = await verificationService.createDocument({
        verification_request_id: verificationRequest.id,
        file_path: backOfIdPath,
        file_name: `back_${file.originalname}`,
        file_size: file.size,
        mime_type: file.mimetype,
        document_type,
        is_back_of_id: true
      });

      console.log('🔄 Starting robust back-of-ID processing...', {
        backDocumentId: backOfIdDocument.id,
        backOfIdPath,
        verificationId: verificationRequest.id
      });

      // Process back-of-ID with robust barcode service
      robustBarcodeService.scanBackOfId(backOfIdPath)
        .then(async (backOfIdResult) => {
          console.log('✅ Robust barcode scanning succeeded:', {
            verificationId: verificationRequest.id,
            backDocumentId: backOfIdDocument.id,
            barcodeFound: backOfIdResult.barcodeFound,
            verificationCodes: backOfIdResult.verificationCodes
          });

          // Store barcode data
          if (backOfIdResult.pdf417Data) {
            await verificationService.updateDocument(backOfIdDocument.id, {
              barcode_data: {
                pdf417_data: backOfIdResult.pdf417Data,
                verification_codes: backOfIdResult.verificationCodes,
                barcode_found: backOfIdResult.barcodeFound
              }
            });
          }

          // Perform robust cross-validation if front OCR data exists
          if (frontDocument.ocr_data) {
            console.log('🔄 Starting robust cross-validation...');

            const crossValidationInput = {
              frontOCR: frontDocument.ocr_data,
              backPDF417: backOfIdResult.pdf417Data,
              documentPhoto: {
                personFound: true,
                faceExtracted: true,
                quality: 0.8
              },
              verificationId: verificationRequest.id
            };

            const crossValidationResult = await robustCrossValidationService.performCrossValidation(crossValidationInput);

            console.log('✅ Robust cross-validation completed:', {
              verificationId: verificationRequest.id,
              overallConsistency: crossValidationResult.overallConsistency,
              matchScore: crossValidationResult.matchScore,
              requiresManualReview: crossValidationResult.requiresManualReview
            });

            // Update front document with cross-validation results
            await verificationService.updateDocument(frontDocument.id, {
              cross_validation_results: crossValidationResult
            });

            // Determine next status based on cross-validation
            let nextStatus = 'pending';
            let manualReviewReason = undefined;

            if (crossValidationResult.requiresManualReview) {
              nextStatus = 'manual_review';
              manualReviewReason = crossValidationResult.validationNotes.join('; ');
            } else if (crossValidationResult.overallConsistency) {
              nextStatus = 'ocr_processing'; // Ready for live capture
            } else {
              nextStatus = 'failed';
              manualReviewReason = `Cross-validation failed: ${crossValidationResult.validationNotes.join('; ')}`;
            }

            // Update verification request
            await verificationService.updateVerificationRequest(verificationRequest.id, {
              cross_validation_score: crossValidationResult.matchScore,
              enhanced_verification_completed: true,
              status: nextStatus as any,
              manual_review_reason: manualReviewReason
            });

            logVerificationEvent('robust_cross_validation_completed', verificationRequest.id, {
              backDocumentId: backOfIdDocument.id,
              overallConsistency: crossValidationResult.overallConsistency,
              matchScore: crossValidationResult.matchScore,
              nextStatus,
              requiresManualReview: crossValidationResult.requiresManualReview
            });
          }
        })
        .catch(async (error) => {
          console.error('🚨 Robust back-of-ID processing failed:', error);

          // Use robust verification manager to handle the failure gracefully
          await robustVerificationManager.forceCompleteVerification(
            verificationRequest.id,
            'Back-of-ID processing failed - requires manual review'
          );

          logVerificationEvent('robust_back_of_id_processing_failed', verificationRequest.id, {
            backDocumentId: backOfIdDocument.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        });

      res.status(201).json({
        verification_id: verificationRequest.id,
        back_of_id_document_id: backOfIdDocument.id,
        status: 'processing',
        message: 'Back-of-ID uploaded successfully. Robust processing started.',
        robust_processing: true,
        next_steps: [
          'Processing barcode scanning with fallback methods',
          'Cross-validating with front-of-ID data using partial data support',
          `Check results with GET /api/verify/results/${verification_id}`
        ]
      });

    } catch (error) {
      logVerificationEvent('robust_back_of_id_upload_failed', verification_id, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  })
);

// Route: POST /api/verify/robust/live-capture - Live capture with robust processing
router.post('/live-capture',
  authenticateAPIKey,
  checkSandboxMode,
  verificationRateLimit,
  [
    body('verification_id')
      .isUUID()
      .withMessage('Verification ID must be a valid UUID'),
    body('live_image_data')
      .isBase64()
      .withMessage('Live image data must be valid base64'),
    body('challenge_response')
      .optional()
      .isString()
      .withMessage('Challenge response must be a string'),
    body('sandbox')
      .optional()
      .isBoolean()
      .withMessage('Sandbox must be a boolean')
  ],
  catchAsync(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', 'multiple', errors.array());
    }

    const { verification_id, live_image_data, challenge_response } = req.body;

    // Get verification request
    const verificationRequest = await verificationService.getVerificationRequest(verification_id);
    if (!verificationRequest) {
      throw new ValidationError('Verification request not found', 'verification_id', verification_id);
    }

    logVerificationEvent('robust_live_capture_started', verification_id, {
      userId: verificationRequest.user_id,
      challengeProvided: !!challenge_response,
      dataSize: live_image_data.length
    });

    try {
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(live_image_data, 'base64');

      // Store live capture image
      const liveCaptureId = `live_${Date.now()}`;
      const liveCaptureFilename = `${liveCaptureId}.jpg`;
      const liveCapturePath = await storageService.storeSelfie(
        imageBuffer,
        liveCaptureFilename,
        'image/jpeg',
        verification_id
      );

      // Create live capture record
      const liveCapture = await verificationService.createSelfie({
        verification_request_id: verification_id,
        file_path: liveCapturePath,
        file_name: liveCaptureFilename,
        file_size: imageBuffer.length
      });

      console.log('🔄 Starting robust live capture processing...', {
        verificationId: verification_id,
        liveCaptureId: liveCapture.id,
        isSandbox: req.isSandbox
      });

      // Get document for face matching
      const document = await verificationService.getDocumentByVerificationId(verification_id);

      if (document) {
        // Process with face recognition
        const [faceMatchScore, livenessScore] = await Promise.all([
          faceRecognitionService.compareFaces(document.file_path, liveCapturePath),
          faceRecognitionService.detectLiveness(liveCapturePath, challenge_response)
        ]);

        console.log('✅ Face recognition and liveness detection completed:', {
          verificationId: verification_id,
          faceMatchScore,
          livenessScore
        });

        // Use robust verification manager to process completion
        const context = {
          verificationId: verification_id,
          isSandbox: req.isSandbox,
          organizationId: getOrganizationId(req),
          faceMatchScore,
          livenessScore,
          crossValidationScore: verificationRequest.cross_validation_score || undefined,
          ocrQuality: 0.8, // Estimated based on successful OCR
          documentPhotoQuality: 0.8 // Estimated
        };

        const processingResult = await robustVerificationManager.processLiveCaptureCompletion(context);

        console.log('✅ Robust live capture processing completed:', {
          verificationId: verification_id,
          finalStatus: processingResult.finalStatus,
          shouldNotifyUser: processingResult.shouldNotifyUser
        });

        // Update verification request with final results
        await verificationService.updateVerificationRequest(verification_id, {
          face_match_score: faceMatchScore,
          liveness_score: livenessScore,
          live_capture_completed: true,
          status: processingResult.finalStatus as any,
          manual_review_reason: processingResult.error || undefined
        });

        logVerificationEvent('robust_live_capture_processed', verification_id, {
          liveCaptureId: liveCapture.id,
          faceMatchScore,
          livenessScore,
          finalStatus: processingResult.finalStatus,
          processingSuccess: processingResult.success
        });
      } else {
        // No document found
        await verificationService.updateVerificationRequest(verification_id, {
          live_capture_completed: true,
          status: 'pending',
          manual_review_reason: 'Live capture completed but no document found for face matching'
        });
      }

      res.status(201).json({
        verification_id,
        live_capture_id: liveCapture.id,
        status: 'processing',
        message: 'Live capture uploaded successfully. Robust processing with comprehensive validation.',
        robust_processing: true,
        next_steps: [
          'Processing liveness detection and face matching with adaptive thresholds',
          'Applying robust state management and error handling',
          `Check results with GET /api/verify/results/${verification_id}`
        ]
      });

    } catch (error) {
      console.error('🚨 Robust live capture processing failed:', error);

      // Use robust verification manager to handle failures
      await robustVerificationManager.forceCompleteVerification(
        verification_id,
        'Live capture processing failed - technical error'
      );

      logVerificationEvent('robust_live_capture_failed', verification_id, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  })
);

// Route: POST /api/verify/robust/fix-stuck - Fix stuck verifications
router.post('/fix-stuck',
  authenticateAPIKey,
  catchAsync(async (req: Request, res: Response) => {
    console.log('🔧 Manual stuck verification cleanup requested');

    try {
      const result = await robustVerificationManager.fixStuckVerifications();

      res.json({
        success: true,
        message: `Stuck verification cleanup completed: ${result.fixed} fixed, ${result.errors} errors`,
        fixed_count: result.fixed,
        error_count: result.errors
      });

    } catch (error) {
      console.error('🚨 Manual stuck verification cleanup failed:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to fix stuck verifications',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

export default router;