import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { body, param, validationResult } from 'express-validator';
import { authenticateAPIKey, authenticateUser, checkSandboxMode } from '../middleware/auth.js';
import { verificationRateLimit } from '../middleware/rateLimit.js';
import { catchAsync, ValidationError, FileUploadError } from '../middleware/errorHandler.js';
import { VerificationService } from '../services/verification.js';
import { StorageService } from '../services/storage.js';
import { OCRService } from '../services/ocr.js';
import { FaceRecognitionService } from '../services/faceRecognition.js';
import { BarcodeService } from '../services/barcode.js';
import { logger, logVerificationEvent } from '../utils/logger.js';
import { supabase } from '../config/database.js';
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
        }
        else {
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
const barcodeService = new BarcodeService();
// Route: POST /api/verify/start - Start a new verification session
router.post('/start', authenticateAPIKey, checkSandboxMode, verificationRateLimit, [
    body('user_id')
        .isUUID()
        .withMessage('User ID must be a valid UUID'),
    body('sandbox')
        .optional()
        .isBoolean()
        .withMessage('Sandbox must be a boolean')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', 'multiple', errors.array());
    }
    const { user_id } = req.body;
    // Authenticate user
    req.body.user_id = user_id;
    await new Promise((resolve, reject) => {
        authenticateUser(req, res, (err) => {
            if (err)
                reject(err);
            else
                resolve(true);
        });
    });
    // Create verification request
    const verificationRequest = await verificationService.createVerificationRequest({
        user_id,
        developer_id: req.developer.id,
        is_sandbox: req.isSandbox
    });
    logVerificationEvent('verification_started', verificationRequest.id, {
        userId: user_id,
        developerId: req.developer.id,
        sandbox: req.isSandbox
    });
    res.status(201).json({
        verification_id: verificationRequest.id,
        status: 'started',
        user_id,
        next_steps: [
            'Upload document with POST /api/verify/document',
            'Complete live capture with POST /api/verify/live-capture',
            'Check results with GET /api/verify/results/:verification_id'
        ],
        created_at: verificationRequest.created_at
    });
}));
// Route: POST /api/verify/document - Upload document to existing verification
router.post('/document', authenticateAPIKey, checkSandboxMode, verificationRateLimit, upload.single('document'), [
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
], catchAsync(async (req, res) => {
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
        authenticateUser(req, res, (err) => {
            if (err)
                reject(err);
            else
                resolve(true);
        });
    });
    logVerificationEvent('document_upload_started', verification_id, {
        userId: verificationRequest.user_id,
        documentType: document_type,
        fileSize: file.size,
        mimeType: file.mimetype,
        developerId: req.developer?.id,
        isSandbox: req.isSandbox
    });
    try {
        // Store document file
        const documentPath = await storageService.storeDocument(file.buffer, file.originalname, file.mimetype, verificationRequest.id);
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
        }
        catch (error) {
            logger.error('Document quality analysis failed:', error);
            // Don't fail the entire verification for quality analysis errors
            logVerificationEvent('quality_analysis_failed', verificationRequest.id, {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
        // Update verification request with document ID
        await verificationService.updateVerificationRequest(verificationRequest.id, {
            document_id: document.id
        });
        // Update document with quality analysis if available
        if (qualityAnalysis) {
            await verificationService.updateDocument(document.id, {
                quality_analysis: qualityAnalysis
            });
        }
        // Start OCR processing asynchronously - always use real OCR
        console.log('🔄 Starting real OCR processing...', {
            documentId: document.id,
            documentPath,
            documentType: document_type,
            verificationId: verificationRequest.id
        });
        ocrService.processDocument(document.id, documentPath, document_type)
            .then(async (ocrData) => {
            console.log('✅ OCR processing succeeded:', {
                verificationId: verificationRequest.id,
                documentId: document.id,
                ocrData
            });
            // Store OCR data in the documents table where it belongs
            await verificationService.updateDocument(document.id, {
                ocr_data: ocrData
            });
            // Update verification status
            await verificationService.updateVerificationRequest(verificationRequest.id, {
                status: 'verified' // Will be updated by database trigger if needed
            });
            logVerificationEvent('ocr_completed', verificationRequest.id, {
                documentId: document.id,
                ocrData
            });
        })
            .catch((error) => {
            console.error('🚨 OCR processing failed in route:', error);
            logger.error('OCR processing failed:', error);
            verificationService.updateVerificationRequest(verificationRequest.id, {
                status: 'manual_review',
                manual_review_reason: 'OCR processing failed'
            });
        });
        const response = {
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
    }
    catch (error) {
        logVerificationEvent('document_upload_failed', verification_id, {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}));
// Route: POST /api/verify/selfie
router.post('/selfie', authenticateAPIKey, checkSandboxMode, upload.single('selfie'), validateSelfieUpload, catchAsync(async (req, res) => {
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
        authenticateUser(req, res, (err) => {
            if (err)
                reject(err);
            else
                resolve(true);
        });
    });
    logVerificationEvent('selfie_upload_started', verification_id, {
        userId: verificationRequest.user_id,
        fileSize: file.size,
        mimeType: file.mimetype
    });
    try {
        // Store selfie file
        const selfiePath = await storageService.storeSelfie(file.buffer, file.originalname, file.mimetype, verification_id);
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
                        status: matchScore > 0.85 ? 'verified' : 'failed'
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
        }
        else {
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
    }
    catch (error) {
        logVerificationEvent('selfie_upload_failed', verification_id, {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}));
// Route: POST /api/verify/back-of-id - Upload back-of-ID for enhanced verification
router.post('/back-of-id', authenticateAPIKey, checkSandboxMode, verificationRateLimit, upload.single('back_of_id'), [
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
], catchAsync(async (req, res) => {
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
    // Authenticate user
    req.body.user_id = verificationRequest.user_id;
    await new Promise((resolve, reject) => {
        authenticateUser(req, res, (err) => {
            if (err)
                reject(err);
            else
                resolve(true);
        });
    });
    // Check if front-of-ID exists
    const frontDocument = await verificationService.getDocumentByVerificationId(verification_id);
    if (!frontDocument) {
        throw new ValidationError('Front-of-ID must be uploaded before back-of-ID', 'front_document', 'missing');
    }
    if (frontDocument.document_type !== document_type) {
        throw new ValidationError('Back-of-ID document type must match front-of-ID', 'document_type', document_type);
    }
    logVerificationEvent('back_of_id_upload_started', verification_id, {
        userId: verificationRequest.user_id,
        documentType: document_type,
        fileSize: file.size,
        mimeType: file.mimetype,
        developerId: req.developer?.id,
        isSandbox: req.isSandbox
    });
    try {
        // Store back-of-ID file
        const backOfIdPath = await storageService.storeDocument(file.buffer, `back_${file.originalname}`, file.mimetype, verificationRequest.id);
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
        // Process back-of-ID scanning asynchronously
        if (!req.isSandbox && file.mimetype.startsWith('image/')) {
            console.log('🔄 Starting back-of-ID barcode/QR scanning...', {
                backDocumentId: backOfIdDocument.id,
                backOfIdPath,
                documentType: document_type,
                verificationId: verificationRequest.id
            });
            barcodeService.scanBackOfId(backOfIdPath)
                .then(async (backOfIdData) => {
                console.log('✅ Back-of-ID scanning succeeded:', {
                    verificationId: verificationRequest.id,
                    backDocumentId: backOfIdDocument.id,
                    qrCodeFound: !!backOfIdData.qr_code,
                    barcodeFound: !!backOfIdData.barcode_data,
                    verificationCodes: backOfIdData.verification_codes?.length || 0
                });
                // Store barcode data in the back-of-ID document
                await verificationService.updateDocument(backOfIdDocument.id, {
                    barcode_data: backOfIdData
                });
                // Cross-validate with front-of-ID
                if (frontDocument.ocr_data) {
                    const crossValidation = await barcodeService.crossValidateWithFrontId(frontDocument.ocr_data, backOfIdData);
                    console.log('🔄 Cross-validation completed:', {
                        verificationId: verificationRequest.id,
                        matchScore: crossValidation.match_score,
                        overallConsistency: crossValidation.validation_results.overall_consistency,
                        discrepancies: crossValidation.discrepancies.length
                    });
                    // Update front document with cross-validation results
                    await verificationService.updateDocument(frontDocument.id, {
                        cross_validation_results: crossValidation
                    });
                    // Update verification request with cross-validation score
                    const finalStatus = crossValidation.validation_results.overall_consistency &&
                        crossValidation.match_score >= 0.7 ? 'verified' : 'failed';
                    await verificationService.updateVerificationRequest(verificationRequest.id, {
                        cross_validation_score: crossValidation.match_score,
                        enhanced_verification_completed: true,
                        status: finalStatus,
                        manual_review_reason: finalStatus === 'failed' ?
                            `Back-of-ID cross-validation failed (score: ${crossValidation.match_score}): ${crossValidation.discrepancies.join('; ')}` :
                            verificationRequest.manual_review_reason
                    });
                    logVerificationEvent('enhanced_verification_completed', verificationRequest.id, {
                        backDocumentId: backOfIdDocument.id,
                        crossValidationScore: crossValidation.match_score,
                        finalStatus,
                        discrepancies: crossValidation.discrepancies
                    });
                }
            })
                .catch((error) => {
                console.error('🚨 Back-of-ID scanning failed:', error);
                logger.error('Back-of-ID scanning failed:', error);
                verificationService.updateVerificationRequest(verificationRequest.id, {
                    status: 'manual_review',
                    manual_review_reason: 'Back-of-ID scanning failed'
                });
                logVerificationEvent('back_of_id_scanning_failed', verificationRequest.id, {
                    backDocumentId: backOfIdDocument.id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            });
        }
        else if (req.isSandbox) {
            // For sandbox: Use PDF417 barcode scanning only, fallback to mock data if it fails
            console.log('🔧 Sandbox mode: Attempting real PDF417 barcode scanning...');
            try {
                const backOfIdData = await barcodeService.scanBackOfId(backOfIdPath);
                console.log('✅ Sandbox PDF417 barcode scanning succeeded:', {
                    verificationId: verificationRequest.id,
                    backDocumentId: backOfIdDocument.id,
                    qrCodeFound: !!backOfIdData.qr_code,
                    barcodeFound: !!backOfIdData.barcode_data,
                    securityFeatures: backOfIdData.security_features?.length || 0
                });
                await verificationService.updateDocument(backOfIdDocument.id, {
                    barcode_data: backOfIdData
                });
                // Cross-validation with front document (if available)
                if (frontDocument?.ocr_data) {
                    const crossValidation = await barcodeService.crossValidateWithFrontId(frontDocument.ocr_data, backOfIdData);
                    await verificationService.updateDocument(backOfIdDocument.id, {
                        cross_validation_results: crossValidation
                    });
                    await verificationService.updateVerificationRequest(verificationRequest.id, {
                        cross_validation_score: crossValidation.match_score,
                        enhanced_verification_completed: true,
                        status: crossValidation.match_score >= 0.7 ? 'verified' : 'failed'
                    });
                    logVerificationEvent('back_of_id_cross_validation_completed', verificationRequest.id, {
                        backDocumentId: backOfIdDocument.id,
                        crossValidationScore: crossValidation.match_score,
                        finalStatus: crossValidation.match_score >= 0.7 ? 'verified' : 'failed',
                        discrepancies: crossValidation.discrepancies
                    });
                }
                else {
                    // No front document to cross-validate, just complete with back-of-ID data
                    await verificationService.updateVerificationRequest(verificationRequest.id, {
                        enhanced_verification_completed: true,
                        status: 'verified'
                    });
                }
            }
            catch (error) {
                console.error('🔧 Sandbox AI barcode scanning failed, using mock data:', error);
                // Fallback to mock data for sandbox
                setTimeout(async () => {
                    const mockBackOfIdData = {
                        qr_code: 'MOCK_QR_CODE_DATA_ABC123',
                        barcode_data: 'MOCK_BARCODE_456789',
                        parsed_data: {
                            id_number: frontDocument.ocr_data?.id_number || 'MOCK123456',
                            expiry_date: frontDocument.ocr_data?.expiry_date || '2025-12-31',
                            issuing_authority: 'Mock Department of Motor Vehicles'
                        },
                        verification_codes: ['VER123', 'CHK456'],
                        security_features: ['Mock security pattern', 'Mock hologram']
                    };
                    await verificationService.updateDocument(backOfIdDocument.id, {
                        barcode_data: mockBackOfIdData
                    });
                    // Mock cross-validation with perfect match
                    const mockCrossValidation = {
                        match_score: 0.95,
                        validation_results: {
                            id_number_match: true,
                            expiry_date_match: true,
                            issuing_authority_match: true,
                            overall_consistency: true
                        },
                        discrepancies: []
                    };
                    await verificationService.updateDocument(frontDocument.id, {
                        cross_validation_results: mockCrossValidation
                    });
                    await verificationService.updateVerificationRequest(verificationRequest.id, {
                        cross_validation_score: mockCrossValidation.match_score,
                        enhanced_verification_completed: true,
                        status: 'verified'
                    });
                    logVerificationEvent('mock_enhanced_verification_completed', verificationRequest.id, {
                        backDocumentId: backOfIdDocument.id,
                        crossValidationScore: mockCrossValidation.match_score
                    });
                }, 2000);
            }
        }
        const response = {
            verification_id: verificationRequest.id,
            back_of_id_document_id: backOfIdDocument.id,
            status: 'processing',
            message: 'Back-of-ID uploaded successfully. Enhanced verification processing started.',
            next_steps: [
                'Processing barcode/QR code scanning',
                'Cross-validating with front-of-ID data',
                `Check results with GET /api/verify/results/${verification_id}`
            ],
            enhanced_verification: {
                barcode_scanning_enabled: true,
                cross_validation_enabled: true,
                ai_powered: barcodeService.useAiBarcodeReading || false
            }
        };
        res.status(201).json(response);
    }
    catch (error) {
        logVerificationEvent('back_of_id_upload_failed', verification_id, {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}));
// Route: GET /api/verify/results/:verification_id - Get complete verification results
router.get('/results/:verification_id', authenticateAPIKey, [
    param('verification_id')
        .isUUID()
        .withMessage('Verification ID must be a valid UUID')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', 'multiple', errors.array());
    }
    const { verification_id } = req.params;
    // Get verification request
    const verificationRequest = await verificationService.getVerificationRequest(verification_id);
    if (!verificationRequest) {
        return res.status(404).json({
            status: 'not_found',
            message: 'Verification not found',
            verification_id
        });
    }
    // Get all documents for this verification
    const { data: documents } = await supabase
        .from('documents')
        .select('*')
        .eq('verification_request_id', verification_id)
        .order('created_at', { ascending: true });
    // Separate front and back documents
    // First document is front, second is back (if exists)
    const document = documents?.[0] || null;
    const backOfIdDocument = documents?.[1] || null;
    // Build comprehensive response
    const responseData = {
        verification_id,
        user_id: verificationRequest.user_id,
        status: verificationRequest.status,
        created_at: verificationRequest.created_at,
        updated_at: verificationRequest.updated_at,
        // Document verification results
        document_uploaded: !!document,
        document_type: document?.document_type || null,
        ocr_data: document?.ocr_data || null,
        quality_analysis: document?.quality_analysis || null,
        // Back-of-ID verification results
        back_of_id_uploaded: !!backOfIdDocument,
        barcode_data: backOfIdDocument?.barcode_data || null,
        cross_validation_results: document?.cross_validation_results || null,
        cross_validation_score: verificationRequest.cross_validation_score || null,
        enhanced_verification_completed: verificationRequest.enhanced_verification_completed || false,
        // Live capture results
        live_capture_completed: verificationRequest.live_capture_completed || false,
        liveness_score: verificationRequest.liveness_score || null,
        face_match_score: verificationRequest.face_match_score || null,
        // Overall assessment
        confidence_score: verificationRequest.confidence_score || null,
        manual_review_reason: verificationRequest.manual_review_reason || null,
        // Next steps based on current state
        next_steps: getNextSteps(verificationRequest, document, backOfIdDocument)
    };
    res.json(responseData);
}));
// Helper function to determine next steps
function getNextSteps(verification, document, backOfIdDocument) {
    const steps = [];
    if (!document) {
        steps.push('Upload document with POST /api/verify/document');
    }
    else if (!backOfIdDocument) {
        steps.push('Upload back-of-ID for enhanced verification with POST /api/verify/back-of-id (optional)');
    }
    if (!verification.live_capture_completed) {
        steps.push('Complete live capture with POST /api/verify/live-capture');
    }
    if (verification.status === 'pending' && document && verification.live_capture_completed) {
        steps.push('Verification processing - check again in a few moments');
    }
    if (verification.status === 'manual_review') {
        steps.push('Manual review required - results will be updated when review is complete');
    }
    if (verification.status === 'verified' || verification.status === 'failed') {
        if (backOfIdDocument && verification.enhanced_verification_completed) {
            steps.push('Enhanced verification complete with back-of-ID cross-validation');
        }
        else {
            steps.push('Verification complete');
        }
    }
    return steps;
}
// Route: GET /api/verify/status/:user_id - Get latest verification for user (deprecated but kept for backward compatibility)
router.get('/status/:user_id', authenticateAPIKey, validateStatusQuery, catchAsync(async (req, res) => {
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
    // Redirect to new results endpoint
    return res.json({
        message: 'This endpoint is deprecated. Use GET /api/verify/results/:verification_id instead.',
        verification_id: verificationRequest.id,
        redirect_url: `/api/verify/results/${verificationRequest.id}`
    });
}));
// Route: GET /api/verify/status-legacy/:user_id - Legacy status check
router.get('/status-legacy/:user_id', authenticateAPIKey, validateStatusQuery, catchAsync(async (req, res) => {
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
    // Get associated document to retrieve OCR data
    const document = await verificationService.getDocumentByVerificationId(verificationRequest.id);
    // Build response data
    const responseData = {
        face_match_score: verificationRequest.face_match_score,
        manual_review_reason: verificationRequest.manual_review_reason
    };
    if (document?.ocr_data) {
        responseData.ocr_data = document.ocr_data;
    }
    if (document?.quality_analysis) {
        responseData.quality_analysis = document.quality_analysis;
    }
    res.json({
        verification_id: verificationRequest.id,
        user_id,
        status: verificationRequest.status,
        created_at: verificationRequest.created_at,
        updated_at: verificationRequest.updated_at,
        data: responseData
    });
}));
// Route: GET /api/verify/history/:user_id
router.get('/history/:user_id', authenticateAPIKey, validateStatusQuery, catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', 'multiple', errors.array());
    }
    const { user_id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const verificationHistory = await verificationService.getVerificationHistory(user_id, page, limit);
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
}));
// Route: POST /api/verify/live-capture
router.post('/live-capture', authenticateAPIKey, checkSandboxMode, verificationRateLimit, [
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
], catchAsync(async (req, res) => {
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
    // Authenticate user
    req.body.user_id = verificationRequest.user_id;
    await new Promise((resolve, reject) => {
        authenticateUser(req, res, (err) => {
            if (err)
                reject(err);
            else
                resolve(true);
        });
    });
    logVerificationEvent('live_capture_started', verification_id, {
        userId: verificationRequest.user_id,
        challengeProvided: !!challenge_response,
        dataSize: live_image_data.length
    });
    try {
        // Convert base64 to buffer
        const imageBuffer = Buffer.from(live_image_data, 'base64');
        // Store live capture image
        const liveCaptureId = crypto.randomUUID();
        const liveCaptureFilename = `live_${liveCaptureId}.jpg`;
        const liveCapturePath = await storageService.storeSelfie(imageBuffer, liveCaptureFilename, 'image/jpeg', verification_id);
        // Create live capture record
        const liveCapture = await verificationService.createSelfie({
            verification_request_id: verification_id,
            file_path: liveCapturePath,
            file_name: liveCaptureFilename,
            file_size: imageBuffer.length
            // Note: is_live_capture and challenge_response columns don't exist in current schema
        });
        // Update verification request with live capture ID
        await verificationService.updateVerificationRequest(verification_id, {
            selfie_id: liveCapture.id,
            live_capture_completed: true
        });
        // Process liveness detection and face matching
        if (!req.isSandbox) {
            try {
                // Get document for face matching
                const document = await verificationService.getDocumentByVerificationId(verification_id);
                if (document) {
                    // Run face recognition with liveness checks
                    const [matchScore, livenessScore] = await Promise.all([
                        faceRecognitionService.compareFaces(document.file_path, liveCapturePath),
                        faceRecognitionService.detectLiveness(liveCapturePath, challenge_response)
                    ]);
                    // Determine final status based on both scores with detailed logging
                    const isLive = livenessScore > 0.75; // Raised from 0.7
                    const faceMatch = matchScore > 0.85; // Raised from 0.8
                    const finalStatus = isLive && faceMatch ? 'verified' : 'failed';
                    // Comprehensive score analysis logging
                    console.log(`📊 Verification Score Analysis for ${verification_id}:`);
                    console.log(`   🎯 Face Match Score: ${matchScore.toFixed(3)} (threshold: 0.85) - ${faceMatch ? '✅ PASS' : '❌ FAIL'}`);
                    console.log(`   🔍 Liveness Score: ${livenessScore.toFixed(3)} (threshold: 0.75) - ${isLive ? '✅ PASS' : '❌ FAIL'}`);
                    console.log(`   📝 Final Status: ${finalStatus.toUpperCase()}`);
                    console.log(`   🔗 Document Path: ${document.file_path}`);
                    console.log(`   📸 Live Capture Path: ${liveCapturePath}`);
                    // Log specific failure reasons for debugging
                    if (!isLive && !faceMatch) {
                        console.log(`   ⚠️  Both liveness and face matching failed`);
                    }
                    else if (!isLive) {
                        console.log(`   ⚠️  Liveness detection failed (score too low)`);
                    }
                    else if (!faceMatch) {
                        console.log(`   ⚠️  Face matching failed (score too low)`);
                    }
                    // Calculate how close scores are to thresholds
                    const livenessGap = livenessScore - 0.75;
                    const faceMatchGap = matchScore - 0.85;
                    console.log(`   📏 Score Gaps: Liveness ${livenessGap >= 0 ? '+' : ''}${livenessGap.toFixed(3)}, Face Match ${faceMatchGap >= 0 ? '+' : ''}${faceMatchGap.toFixed(3)}`);
                    await verificationService.updateVerificationRequest(verification_id, {
                        face_match_score: matchScore,
                        liveness_score: livenessScore,
                        status: finalStatus,
                        manual_review_reason: !isLive ? 'Liveness detection failed' :
                            !faceMatch ? 'Face matching failed' : undefined
                    });
                    logVerificationEvent('live_capture_processed', verification_id, {
                        liveCapture: liveCapture.id,
                        matchScore,
                        livenessScore,
                        finalStatus
                    });
                }
                else {
                    // No document found - this means user hasn't uploaded a document yet
                    logger.info('No document found for face matching. User needs to upload document first.', {
                        verificationId: verification_id
                    });
                    // Update verification status to indicate missing document
                    await verificationService.updateVerificationRequest(verification_id, {
                        status: 'pending',
                        manual_review_reason: 'Live capture completed, but document upload is still required for face matching'
                    });
                    logVerificationEvent('live_capture_partial', verification_id, {
                        liveCapture: liveCapture.id,
                        reason: 'Document not uploaded yet - face matching skipped',
                        status: 'pending'
                    });
                }
            }
            catch (error) {
                logger.error('Live capture processing failed:', error);
                await verificationService.updateVerificationRequest(verification_id, {
                    status: 'manual_review',
                    manual_review_reason: 'Live capture processing failed'
                });
            }
        }
        else {
            // Sandbox mode - perform REAL face matching but with additional logging
            try {
                console.log('🧪 Sandbox mode: Performing REAL face matching and liveness detection...');
                // Get document for face matching
                const document = await verificationService.getDocumentByVerificationId(verification_id);
                if (document) {
                    // Run REAL face recognition with liveness checks - no mocking!
                    const [matchScore, livenessScore] = await Promise.all([
                        faceRecognitionService.compareFaces(document.file_path, liveCapturePath),
                        faceRecognitionService.detectLiveness(liveCapturePath, challenge_response)
                    ]);
                    console.log('🧪 Sandbox REAL results:', {
                        matchScore,
                        livenessScore,
                        document: document.file_path,
                        selfie: liveCapturePath
                    });
                    // Determine final status based on REAL scores with sandbox-specific thresholds
                    const isLive = livenessScore > 0.65; // More lenient threshold for sandbox testing
                    const faceMatch = matchScore > 0.8; // Tightened threshold for sandbox testing
                    const finalStatus = isLive && faceMatch ? 'verified' : 'failed';
                    // Comprehensive sandbox score analysis logging
                    console.log(`🧪📊 Sandbox Verification Score Analysis for ${verification_id}:`);
                    console.log(`   🎯 Face Match Score: ${matchScore.toFixed(3)} (sandbox threshold: 0.8) - ${faceMatch ? '✅ PASS' : '❌ FAIL'}`);
                    console.log(`   🔍 Liveness Score: ${livenessScore.toFixed(3)} (sandbox threshold: 0.65) - ${isLive ? '✅ PASS' : '❌ FAIL'}`);
                    console.log(`   📝 Final Status: ${finalStatus.toUpperCase()}`);
                    console.log(`   🔗 Document Path: ${document.file_path}`);
                    console.log(`   📸 Live Capture Path: ${liveCapturePath}`);
                    // Compare against production thresholds for reference
                    const prodLiveness = livenessScore > 0.75;
                    const prodFaceMatch = matchScore > 0.85;
                    console.log(`   🏭 Production Comparison: Liveness ${prodLiveness ? '✅' : '❌'} (0.75), Face Match ${prodFaceMatch ? '✅' : '❌'} (0.85)`);
                    // Log specific failure reasons for debugging
                    if (!isLive && !faceMatch) {
                        console.log(`   ⚠️  Both liveness and face matching failed (sandbox thresholds)`);
                    }
                    else if (!isLive) {
                        console.log(`   ⚠️  Liveness detection failed (score below 0.7)`);
                    }
                    else if (!faceMatch) {
                        console.log(`   ⚠️  Face matching failed (score below 0.8)`);
                    }
                    // Calculate how close scores are to both sandbox and production thresholds
                    const sandboxLivenessGap = livenessScore - 0.65;
                    const sandboxFaceMatchGap = matchScore - 0.8;
                    const prodLivenessGap = livenessScore - 0.75;
                    const prodFaceMatchGap = matchScore - 0.85;
                    console.log(`   📏 Sandbox Gaps: Liveness ${sandboxLivenessGap >= 0 ? '+' : ''}${sandboxLivenessGap.toFixed(3)}, Face Match ${sandboxFaceMatchGap >= 0 ? '+' : ''}${sandboxFaceMatchGap.toFixed(3)}`);
                    console.log(`   📏 Production Gaps: Liveness ${prodLivenessGap >= 0 ? '+' : ''}${prodLivenessGap.toFixed(3)}, Face Match ${prodFaceMatchGap >= 0 ? '+' : ''}${prodFaceMatchGap.toFixed(3)}`);
                    await verificationService.updateVerificationRequest(verification_id, {
                        face_match_score: matchScore,
                        liveness_score: livenessScore,
                        status: finalStatus,
                        manual_review_reason: !isLive ? 'Sandbox: Liveness detection failed' :
                            !faceMatch ? 'Sandbox: Face matching failed' : undefined
                    });
                    logVerificationEvent('sandbox_live_capture_processed', verification_id, {
                        liveCaptureId: liveCapture.id,
                        matchScore,
                        livenessScore,
                        finalStatus,
                        realComparison: true
                    });
                }
                else {
                    // No document found - this means user hasn't uploaded a document yet
                    console.log('🧪 Sandbox: No document found for face matching. User needs to upload document first.');
                    // Update verification status to indicate missing document
                    await verificationService.updateVerificationRequest(verification_id, {
                        status: 'pending',
                        manual_review_reason: 'Sandbox: Live capture completed, but document upload is still required for face matching'
                    });
                    logVerificationEvent('sandbox_live_capture_partial', verification_id, {
                        liveCaptureId: liveCapture.id,
                        reason: 'Document not uploaded yet - face matching skipped',
                        status: 'pending'
                    });
                }
            }
            catch (error) {
                console.error('🧪 Sandbox face matching failed:', error);
                await verificationService.updateVerificationRequest(verification_id, {
                    status: 'failed',
                    manual_review_reason: 'Sandbox: Face matching processing failed'
                });
                logVerificationEvent('sandbox_live_capture_failed', verification_id, {
                    liveCaptureId: liveCapture.id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        res.status(201).json({
            verification_id,
            live_capture_id: liveCapture.id,
            status: 'processing',
            message: 'Live capture uploaded successfully. Processing liveness detection and face matching.',
            next_steps: [
                'Processing liveness detection and face matching',
                `Check results with GET /api/verify/results/${verification_id}`
            ],
            liveness_check_enabled: true,
            face_matching_enabled: true,
            results_url: `/api/verify/results/${verification_id}`
        });
    }
    catch (error) {
        logVerificationEvent('live_capture_failed', verification_id, {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}));
// Route: POST /api/verify/generate-live-token
router.post('/generate-live-token', authenticateAPIKey, [
    body('user_id')
        .isUUID()
        .withMessage('User ID must be a valid UUID'),
    body('verification_id')
        .optional()
        .isUUID()
        .withMessage('Verification ID must be a valid UUID if provided')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', 'multiple', errors.array());
    }
    const { user_id, verification_id } = req.body;
    // Authenticate user
    await new Promise((resolve, reject) => {
        authenticateUser(req, res, (err) => {
            if (err)
                reject(err);
            else
                resolve(true);
        });
    });
    // Generate secure token for live capture session
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minute expiry
    // Generate challenge for liveness detection
    const challenges = [
        'blink_twice',
        'turn_head_left',
        'turn_head_right',
        'smile',
        'look_up',
        'look_down'
    ];
    const selectedChallenge = challenges[Math.floor(Math.random() * challenges.length)];
    // Store token in database (you would need to create a live_capture_tokens table)
    // For now, we'll return the token directly
    logVerificationEvent('live_capture_token_generated', verification_id || user_id, {
        userId: user_id,
        verificationId: verification_id,
        challenge: selectedChallenge,
        expiresAt: expiresAt.toISOString()
    });
    res.json({
        live_capture_token: token,
        expires_at: expiresAt.toISOString(),
        live_capture_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/live-capture?token=${token}`,
        liveness_challenge: {
            type: selectedChallenge,
            instruction: getChallengeInstruction(selectedChallenge)
        },
        user_id,
        verification_id: verification_id || null,
        expires_in_seconds: 1800
    });
}));
// Helper function for challenge instructions
function getChallengeInstruction(challenge) {
    const instructions = {
        'blink_twice': 'Please blink twice slowly when prompted',
        'turn_head_left': 'Please turn your head to the left when prompted',
        'turn_head_right': 'Please turn your head to the right when prompted',
        'smile': 'Please smile when prompted',
        'look_up': 'Please look up when prompted',
        'look_down': 'Please look down when prompted'
    };
    return instructions[challenge] || 'Follow the on-screen instructions';
}
// Route: POST /api/verify/test-pdf417 - Test PDF417 barcode parsing from raw data
router.post('/test-pdf417', authenticateAPIKey, body('raw_barcode_data')
    .isString()
    .isLength({ min: 10 })
    .withMessage('Raw barcode data must be a string with at least 10 characters'), catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', 'multiple', errors.array());
    }
    const { raw_barcode_data } = req.body;
    logger.info('PDF417 test parsing requested', {
        dataLength: raw_barcode_data.length,
        apiKey: req.apiKey?.id
    });
    // Initialize barcode service
    const barcodeService = new BarcodeService();
    try {
        // Parse PDF417 data
        const pdf417Result = await barcodeService.parsePDF417(raw_barcode_data);
        logger.info('PDF417 test parsing completed', {
            validation_status: pdf417Result.validation_status,
            confidence: pdf417Result.confidence,
            apiKey: req.apiKey?.id
        });
        res.json({
            success: true,
            pdf417_data: pdf417Result,
            message: `PDF417 parsing completed with ${pdf417Result.validation_status} status`
        });
    }
    catch (error) {
        logger.error('PDF417 test parsing failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            apiKey: req.apiKey?.id
        });
        res.status(500).json({
            success: false,
            error: 'PDF417 parsing failed',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
}));
export default router;
