import express, { Request, Response } from 'express';
import multer from 'multer';
import { body, param, validationResult } from 'express-validator';
import { authenticateAPIKey, authenticateUser, checkSandboxMode } from '@/middleware/auth.js';
import { verificationRateLimit } from '@/middleware/rateLimit.js';
import { catchAsync, ValidationError, FileUploadError } from '@/middleware/errorHandler.js';
import { NewVerificationEngine, VerificationStatus } from '@/services/NewVerificationEngine.js';
import { StorageService } from '@/services/storage.js';
import { logger, logVerificationEvent } from '@/utils/logger.js';

const router = express.Router();

// Initialize services
const verificationEngine = new NewVerificationEngine();
const storageService = new StorageService();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }
  },
});

/**
 * STEP 1: Initialize new verification session
 */
router.post('/initialize',
  authenticateAPIKey,
  verificationRateLimit,
  [
    body('user_id').notEmpty().withMessage('User ID is required'),
    body('document_type').optional().isIn(['passport', 'drivers_license', 'national_id']).withMessage('Invalid document type'),
  ],
  catchAsync(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', 'multiple', errors.array());
    }

    const { user_id, document_type = 'drivers_license' } = req.body;

    logger.info('🚀 Initializing new verification', {
      userId: user_id,
      documentType: document_type,
      developerId: (req as any).developer.id
    });

    try {
      // Initialize verification with clean state machine
      const verificationState = await verificationEngine.initializeVerification(user_id);

      logVerificationEvent('verification_initialized', verificationState.id, {
        userId: user_id,
        documentType: document_type,
        developerId: (req as any).developer.id
      });

      res.json({
        success: true,
        verification_id: verificationState.id,
        status: verificationState.status,
        current_step: verificationState.currentStep,
        total_steps: verificationState.totalSteps,
        message: 'Verification initialized successfully - ready to upload front document'
      });

    } catch (error) {
      logger.error('Failed to initialize verification', { userId: user_id, error });
      res.status(500).json({
        success: false,
        error: 'Failed to initialize verification',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * STEP 2: Upload and process front document
 */
router.post('/:verification_id/front-document',
  authenticateAPIKey,
  verificationRateLimit,
  upload.single('document'),
  [
    param('verification_id').isUUID().withMessage('Invalid verification ID'),
    body('document_type').optional().isIn(['passport', 'drivers_license', 'national_id']).withMessage('Invalid document type'),
  ],
  catchAsync(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', 'multiple', errors.array());
    }

    if (!req.file) {
      throw new FileUploadError('No document file provided');
    }

    const { verification_id } = req.params;
    const { document_type = 'drivers_license' } = req.body;

    logger.info('📄 Processing front document upload', {
      verificationId: verification_id,
      documentType: document_type,
      fileSize: req.file.size
    });

    try {
      // Upload file to storage
      const documentPath = await storageService.storeDocument(
        req.file.buffer,
        req.file.originalname || 'front_document.jpg',
        req.file.mimetype,
        verification_id
      );

      // Process front document with OCR
      const verificationState = await verificationEngine.processFrontDocument(
        verification_id,
        documentPath
      );

      logVerificationEvent('front_document_processed', verification_id, {
        documentPath,
        status: verificationState.status
      });

      res.json({
        success: true,
        verification_id: verification_id,
        status: verificationState.status,
        current_step: verificationState.currentStep,
        document_path: documentPath,
        ocr_data: verificationState.frontOcrData,
        message: 'Front document processed successfully - ready to upload back document'
      });

    } catch (error) {
      logger.error('Failed to process front document', { verificationId: verification_id, error });
      res.status(500).json({
        success: false,
        error: 'Failed to process front document',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * STEP 3: Upload and process back document
 */
router.post('/:verification_id/back-document',
  authenticateAPIKey,
  verificationRateLimit,
  upload.single('document'),
  [
    param('verification_id').isUUID().withMessage('Invalid verification ID'),
  ],
  catchAsync(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', 'multiple', errors.array());
    }

    if (!req.file) {
      throw new FileUploadError('No document file provided');
    }

    const { verification_id } = req.params;

    logger.info('📄 Processing back document upload', {
      verificationId: verification_id,
      fileSize: req.file.size
    });

    try {
      // Upload file to storage
      const documentPath = await storageService.storeDocument(
        req.file.buffer,
        req.file.originalname || 'back_document.jpg',
        req.file.mimetype,
        verification_id
      );

      // Process back document with barcode scanning
      const verificationState = await verificationEngine.processBackDocument(
        verification_id,
        documentPath
      );

      logVerificationEvent('back_document_processed', verification_id, {
        documentPath,
        status: verificationState.status,
        barcodeExtractionFailed: verificationState.barcodeExtractionFailed
      });

      res.json({
        success: true,
        verification_id: verification_id,
        status: verificationState.status,
        current_step: verificationState.currentStep,
        document_path: documentPath,
        barcode_data: verificationState.backBarcodeData,
        barcode_extraction_failed: verificationState.barcodeExtractionFailed,
        message: 'Back document processed successfully - starting cross-validation'
      });

    } catch (error) {
      logger.error('Failed to process back document', { verificationId: verification_id, error });
      res.status(500).json({
        success: false,
        error: 'Failed to process back document',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * STEP 4: Perform cross-validation
 */
router.post('/:verification_id/cross-validation',
  authenticateAPIKey,
  verificationRateLimit,
  [
    param('verification_id').isUUID().withMessage('Invalid verification ID'),
  ],
  catchAsync(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', 'multiple', errors.array());
    }

    const { verification_id } = req.params;

    logger.info('🔍 Starting cross-validation', {
      verificationId: verification_id
    });

    try {
      // Perform cross-validation
      const verificationState = await verificationEngine.performCrossValidation(verification_id);

      logVerificationEvent('cross_validation_completed', verification_id, {
        status: verificationState.status,
        documentsMatch: verificationState.documentsMatch,
        score: verificationState.crossValidationResults?.score
      });

      if (verificationState.status === VerificationStatus.FAILED) {
        // Documents don't match - automatic failure
        res.json({
          success: true,
          verification_id: verification_id,
          status: verificationState.status,
          documents_match: false,
          failure_reason: verificationState.failureReason,
          message: 'Cross-validation failed - documents do not match'
        });
      } else {
        // Cross-validation passed - ready for live capture
        res.json({
          success: true,
          verification_id: verification_id,
          status: verificationState.status,
          current_step: verificationState.currentStep,
          documents_match: true,
          cross_validation_results: verificationState.crossValidationResults,
          message: 'Cross-validation passed - ready for live capture'
        });
      }

    } catch (error) {
      logger.error('Failed to perform cross-validation', { verificationId: verification_id, error });
      res.status(500).json({
        success: false,
        error: 'Failed to perform cross-validation',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * STEP 5: Upload and process live capture
 */
router.post('/:verification_id/live-capture',
  authenticateAPIKey,
  verificationRateLimit,
  upload.single('selfie'),
  [
    param('verification_id').isUUID().withMessage('Invalid verification ID'),
  ],
  catchAsync(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', 'multiple', errors.array());
    }

    if (!req.file) {
      throw new FileUploadError('No selfie file provided');
    }

    const { verification_id } = req.params;

    logger.info('🎥 Processing live capture upload', {
      verificationId: verification_id,
      fileSize: req.file.size
    });

    try {
      // Upload file to storage
      const selfiePath = await storageService.storeSelfie(
        req.file.buffer,
        req.file.originalname || 'selfie.jpg',
        req.file.mimetype,
        verification_id
      );

      // Process live capture with face matching and liveness detection
      const verificationState = await verificationEngine.processLiveCapture(
        verification_id,
        selfiePath
      );

      logVerificationEvent('live_capture_processed', verification_id, {
        selfiePath,
        status: verificationState.status,
        faceMatchPassed: verificationState.faceMatchPassed,
        livenessPassed: verificationState.livenessPassed
      });

      res.json({
        success: true,
        verification_id: verification_id,
        status: verificationState.status,
        current_step: verificationState.currentStep,
        selfie_path: selfiePath,
        face_match_results: verificationState.faceMatchResults,
        liveness_results: verificationState.livenessResults,
        message: 'Live capture processed successfully - making final decision'
      });

    } catch (error) {
      logger.error('Failed to process live capture', { verificationId: verification_id, error });
      res.status(500).json({
        success: false,
        error: 'Failed to process live capture',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * STEP 6: Get final verification result
 */
router.post('/:verification_id/finalize',
  authenticateAPIKey,
  verificationRateLimit,
  [
    param('verification_id').isUUID().withMessage('Invalid verification ID'),
  ],
  catchAsync(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', 'multiple', errors.array());
    }

    const { verification_id } = req.params;

    logger.info('⚖️ Making final verification decision', {
      verificationId: verification_id
    });

    try {
      // Make final decision based on all collected data
      const verificationState = await verificationEngine.makeFinalDecision(verification_id);

      logVerificationEvent('verification_completed', verification_id, {
        status: verificationState.status,
        finalResult: verificationState.status,
        failureReason: verificationState.failureReason,
        manualReviewReason: verificationState.manualReviewReason
      });

      res.json({
        success: true,
        verification_id: verification_id,
        status: verificationState.status,
        current_step: verificationState.currentStep,
        final_result: verificationState.status,
        failure_reason: verificationState.failureReason,
        manual_review_reason: verificationState.manualReviewReason,
        message: getFinalMessage(verificationState.status, verificationState.failureReason, verificationState.manualReviewReason)
      });

    } catch (error) {
      logger.error('Failed to make final decision', { verificationId: verification_id, error });
      res.status(500).json({
        success: false,
        error: 'Failed to make final decision',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * Get verification status and current state
 */
router.get('/:verification_id/status',
  authenticateAPIKey,
  [
    param('verification_id').isUUID().withMessage('Invalid verification ID'),
  ],
  catchAsync(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', 'multiple', errors.array());
    }

    const { verification_id } = req.params;

    try {
      // Get current verification state
      const verificationState = await verificationEngine.getVerificationState(verification_id);

      res.json({
        success: true,
        verification_id: verification_id,
        status: verificationState.status,
        current_step: verificationState.currentStep,
        total_steps: verificationState.totalSteps,

        // Document states
        front_document_uploaded: !!verificationState.frontDocumentId,
        back_document_uploaded: !!verificationState.backDocumentId,
        live_capture_uploaded: !!verificationState.liveCaptureId,

        // Processing results
        ocr_data: verificationState.frontOcrData,
        barcode_data: verificationState.backBarcodeData,
        cross_validation_results: verificationState.crossValidationResults,
        face_match_results: verificationState.faceMatchResults,
        liveness_results: verificationState.livenessResults,

        // Algorithm decisions
        barcode_extraction_failed: verificationState.barcodeExtractionFailed,
        documents_match: verificationState.documentsMatch,
        face_match_passed: verificationState.faceMatchPassed,
        liveness_passed: verificationState.livenessPassed,

        // Final result
        final_result: verificationState.status === VerificationStatus.VERIFIED ? 'verified' :
                     verificationState.status === VerificationStatus.FAILED ? 'failed' :
                     verificationState.status === VerificationStatus.MANUAL_REVIEW ? 'manual_review' : null,
        failure_reason: verificationState.failureReason,
        manual_review_reason: verificationState.manualReviewReason,

        // Timestamps
        created_at: verificationState.createdAt,
        updated_at: verificationState.updatedAt
      });

    } catch (error) {
      logger.error('Failed to get verification status', { verificationId: verification_id, error });
      res.status(404).json({
        success: false,
        error: 'Verification not found',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * Helper function to get appropriate final message
 */
function getFinalMessage(status: VerificationStatus, failureReason?: string, manualReviewReason?: string): string {
  switch (status) {
    case VerificationStatus.VERIFIED:
      return 'Verification completed successfully! Identity has been verified.';
    case VerificationStatus.FAILED:
      return `Verification failed: ${failureReason || 'Please try again with valid documents.'}`;
    case VerificationStatus.MANUAL_REVIEW:
      return `Verification requires manual review: ${manualReviewReason || 'You will be notified of the result within 24 hours.'}`;
    default:
      return 'Verification is still in progress.';
  }
}

export default router;