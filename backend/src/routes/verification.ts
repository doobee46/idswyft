import express from 'express';
import multer from 'multer';
import { body, param, validationResult } from 'express-validator';
import { authenticateAPIKey, authenticateUser, checkSandboxMode } from '@/middleware/auth.js';
import { verificationRateLimit } from '@/middleware/rateLimit.js';
import { catchAsync, ValidationError, FileUploadError } from '@/middleware/errorHandler.js';
import { VerificationService } from '@/services/verification.js';
import { StorageService } from '@/services/storage.js';
import { OCRService } from '@/services/ocr.js';
import { FaceRecognitionService } from '@/services/faceRecognition.js';
import { logger, logVerificationEvent } from '@/utils/logger.js';

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

// Validation middleware
const validateDocumentUpload = [
  body('user_id')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  body('document_type')
    .isIn(['passport', 'drivers_license', 'national_id', 'other'])
    .withMessage('Document type must be one of: passport, drivers_license, national_id, other'),
  body('sandbox')
    .optional()
    .isBoolean()
    .withMessage('Sandbox must be a boolean')
];

const validateSelfieUpload = [
  body('verification_id')
    .isUUID()
    .withMessage('Verification ID must be a valid UUID'),
  body('sandbox')
    .optional()
    .isBoolean()
    .withMessage('Sandbox must be a boolean')
];

const validateStatusQuery = [
  param('user_id')
    .isUUID()
    .withMessage('User ID must be a valid UUID')
];

// Initialize services
const verificationService = new VerificationService();
const storageService = new StorageService();
const ocrService = new OCRService();
const faceRecognitionService = new FaceRecognitionService();

// Route: POST /api/verify/document
router.post('/document',
  authenticateAPIKey,
  checkSandboxMode,
  verificationRateLimit,
  upload.single('document'),
  validateDocumentUpload,
  catchAsync(async (req, res) => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', 'multiple', errors.array());
    }
    
    const { user_id, document_type } = req.body;
    const file = req.file;
    
    if (!file) {
      throw new FileUploadError('Document file is required');
    }
    
    // Authenticate user
    req.body.user_id = user_id;
    await new Promise((resolve, reject) => {
      authenticateUser(req as any, res as any, (err: any) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
    
    logVerificationEvent('document_upload_started', `${user_id}_${Date.now()}`, {
      userId: user_id,
      documentType: document_type,
      fileSize: file.size,
      mimeType: file.mimetype,
      developerId: req.developer?.id,
      isSandbox: req.isSandbox
    });
    
    try {
      // Create verification request
      const verificationRequest = await verificationService.createVerificationRequest({
        user_id,
        developer_id: req.developer!.id
      });
      
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
      
      // Analyze document quality
      let qualityAnalysis = null;
      try {
        if (!req.isSandbox && (file.mimetype.startsWith('image/'))) {
          // Get the actual file path for quality analysis
          const localFilePath = await storageService.getLocalFilePath(documentPath);
          qualityAnalysis = await verificationService.analyzeDocumentQuality(localFilePath);
          
          logVerificationEvent('quality_analysis_completed', verificationRequest.id, {
            documentId: document.id,
            overallQuality: qualityAnalysis.overallQuality,
            issues: qualityAnalysis.issues.length
          });
        }
      } catch (error) {
        logger.error('Document quality analysis failed:', error);
        // Don't fail the entire verification for quality analysis errors
        logVerificationEvent('quality_analysis_failed', verificationRequest.id, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Update verification request with document ID and quality analysis
      await verificationService.updateVerificationRequest(verificationRequest.id, {
        document_id: document.id,
        quality_analysis: qualityAnalysis
      });
      
      // Start OCR processing asynchronously
      if (!req.isSandbox) {
        // Real OCR processing
        ocrService.processDocument(document.id, documentPath, document_type)
          .then(async (ocrData) => {
            await verificationService.updateVerificationRequest(verificationRequest.id, {
              ocr_data: ocrData,
              status: 'verified' // Will be updated by database trigger if needed
            });
            
            logVerificationEvent('ocr_completed', verificationRequest.id, {
              documentId: document.id,
              ocrData
            });
          })
          .catch((error) => {
            logger.error('OCR processing failed:', error);
            verificationService.updateVerificationRequest(verificationRequest.id, {
              status: 'manual_review',
              manual_review_reason: 'OCR processing failed'
            });
          });
      } else {
        // Mock OCR for sandbox
        setTimeout(async () => {
          const mockOcrData = {
            name: 'John Doe',
            date_of_birth: '1990-01-01',
            document_number: 'A12345678',
            expiration_date: '2025-01-01',
            confidence_scores: { name: 0.95, date_of_birth: 0.92 }
          };
          
          await verificationService.updateVerificationRequest(verificationRequest.id, {
            ocr_data: mockOcrData,
            status: 'verified'
          });
          
          logVerificationEvent('mock_ocr_completed', verificationRequest.id, {
            documentId: document.id,
            ocrData: mockOcrData
          });
        }, 2000);
      }
      
      const response: any = {
        verification_id: verificationRequest.id,
        status: verificationRequest.status,
        message: 'Document uploaded successfully. Processing started.',
        document_id: document.id,
        next_steps: 'Upload a selfie using /api/verify/selfie or check status with /api/verify/status/:user_id'
      };
      
      // Include quality analysis in response if available
      if (qualityAnalysis) {
        response.quality_analysis = {
          overall_quality: qualityAnalysis.overallQuality,
          issues: qualityAnalysis.issues,
          recommendations: qualityAnalysis.recommendations,
          quality_scores: {
            blur_score: qualityAnalysis.blurScore,
            brightness: qualityAnalysis.brightness,
            contrast: qualityAnalysis.contrast,
            resolution: qualityAnalysis.resolution,
            file_size: qualityAnalysis.fileSize
          }
        };
      }
      
      res.status(201).json(response);
      
    } catch (error) {
      logVerificationEvent('document_upload_failed', `${user_id}_${Date.now()}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  })
);

// Route: POST /api/verify/selfie
router.post('/selfie',
  authenticateAPIKey,
  checkSandboxMode,
  upload.single('selfie'),
  validateSelfieUpload,
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', 'multiple', errors.array());
    }
    
    const { verification_id } = req.body;
    const file = req.file;
    
    if (!file) {
      throw new FileUploadError('Selfie file is required');
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
    
    logVerificationEvent('selfie_upload_started', verification_id, {
      userId: verificationRequest.user_id,
      fileSize: file.size,
      mimeType: file.mimetype
    });
    
    try {
      // Store selfie file
      const selfiePath = await storageService.storeSelfie(
        file.buffer,
        file.originalname,
        file.mimetype,
        verification_id
      );
      
      // Create selfie record
      const selfie = await verificationService.createSelfie({
        verification_request_id: verification_id,
        file_path: selfiePath,
        file_name: file.originalname,
        file_size: file.size
      });
      
      // Update verification request with selfie ID
      await verificationService.updateVerificationRequest(verification_id, {
        selfie_id: selfie.id
      });
      
      // Start face recognition processing asynchronously
      if (!req.isSandbox) {
        // Real face recognition
        const document = await verificationService.getDocumentByVerificationId(verification_id);
        if (document) {
          faceRecognitionService.compareFaces(document.file_path, selfiePath)
            .then(async (matchScore) => {
              await verificationService.updateVerificationRequest(verification_id, {
                face_match_score: matchScore,
                status: matchScore > 0.8 ? 'verified' : 'failed'
              });
              
              logVerificationEvent('face_recognition_completed', verification_id, {
                selfieId: selfie.id,
                matchScore
              });
            })
            .catch((error) => {
              logger.error('Face recognition failed:', error);
              verificationService.updateVerificationRequest(verification_id, {
                status: 'manual_review',
                manual_review_reason: 'Face recognition failed'
              });
            });
        }
      } else {
        // Mock face recognition for sandbox
        setTimeout(async () => {
          const mockMatchScore = 0.95;
          await verificationService.updateVerificationRequest(verification_id, {
            face_match_score: mockMatchScore,
            status: 'verified'
          });
          
          logVerificationEvent('mock_face_recognition_completed', verification_id, {
            selfieId: selfie.id,
            matchScore: mockMatchScore
          });
        }, 1500);
      }
      
      res.status(201).json({
        verification_id,
        status: 'processing',
        message: 'Selfie uploaded successfully. Face recognition started.',
        selfie_id: selfie.id,
        next_steps: 'Check verification status with /api/verify/status/:user_id'
      });
      
    } catch (error) {
      logVerificationEvent('selfie_upload_failed', verification_id, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  })
);

// Route: GET /api/verify/status/:user_id
router.get('/status/:user_id',
  authenticateAPIKey,
  validateStatusQuery,
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', 'multiple', errors.array());
    }
    
    const { user_id } = req.params;
    
    // Get latest verification request for user
    const verificationRequest = await verificationService.getLatestVerificationByUserId(user_id);
    
    if (!verificationRequest) {
      return res.status(404).json({
        status: 'not_verified',
        message: 'No verification found for this user',
        user_id
      });
    }
    
    // Build response data
    const responseData: any = {
      face_match_score: verificationRequest.face_match_score,
      manual_review_reason: verificationRequest.manual_review_reason
    };
    
    if (verificationRequest.ocr_data) {
      responseData.ocr_data = verificationRequest.ocr_data;
    }
    
    if (verificationRequest.quality_analysis) {
      responseData.quality_analysis = verificationRequest.quality_analysis;
    }
    
    res.json({
      verification_id: verificationRequest.id,
      user_id,
      status: verificationRequest.status,
      created_at: verificationRequest.created_at,
      updated_at: verificationRequest.updated_at,
      data: responseData
    });
  })
);

// Route: GET /api/verify/history/:user_id
router.get('/history/:user_id',
  authenticateAPIKey,
  validateStatusQuery,
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', 'multiple', errors.array());
    }
    
    const { user_id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    
    const verificationHistory = await verificationService.getVerificationHistory(
      user_id,
      page,
      limit
    );
    
    res.json({
      user_id,
      page,
      limit,
      total: verificationHistory.total,
      verifications: verificationHistory.verifications.map(v => ({
        verification_id: v.id,
        status: v.status,
        created_at: v.created_at,
        updated_at: v.updated_at,
        has_document: !!v.document_id,
        has_selfie: !!v.selfie_id,
        face_match_score: v.face_match_score
      }))
    });
  })
);

export default router;