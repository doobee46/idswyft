import { Router, Request, Response } from 'express';
import multer from 'multer';
import { vaasSupabase } from '../config/database.js';
import { VaasApiResponse } from '../types/index.js';

const router = Router();

// Configure multer for file uploads (store in memory for now)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'));
    }
  }
});

// Upload document for verification session
router.post('/sessions/:sessionToken/documents', upload.single('document') as any, async (req: Request, res: Response) => {
  try {
    const { sessionToken } = req.params;
    const { type } = req.body; // 'front', 'back', or 'selfie'
    const file = req.file;

    if (!file) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'NO_FILE_UPLOADED',
          message: 'No file was uploaded'
        }
      };
      return res.status(400).json(response);
    }

    if (!type || !['front', 'back', 'selfie'].includes(type)) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'INVALID_DOCUMENT_TYPE',
          message: 'Document type must be front, back, or selfie'
        }
      };
      return res.status(400).json(response);
    }

    // Find verification session by token
    const { data: session, error: sessionError } = await vaasSupabase
      .from('vaas_verification_sessions')
      .select('id, status, organization_id')
      .eq('session_token', sessionToken)
      .single();

    if (sessionError || !session) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Invalid verification session'
        }
      };
      return res.status(404).json(response);
    }

    // Check if session is in a valid state for document upload
    if (!['pending', 'document_uploaded'].includes(session.status)) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'INVALID_SESSION_STATUS',
          message: 'Cannot upload documents to this verification session'
        }
      };
      return res.status(400).json(response);
    }

    // For now, store file metadata in database (in production, upload to S3)
    // This is a simplified implementation for the MVP
    const documentData = {
      verification_session_id: session.id,
      document_type: type,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      // In production, this would be the S3 URL
      file_path: `temp://${session.id}/${type}/${file.originalname}`,
      uploaded_at: new Date().toISOString()
    };

    // Insert document record
    const { data: document, error: docError } = await vaasSupabase
      .from('vaas_verification_documents')
      .insert([documentData])
      .select('*')
      .single();

    if (docError) {
      console.error('[PublicRoutes] Document upload error:', docError);
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'DOCUMENT_UPLOAD_FAILED',
          message: 'Failed to save document'
        }
      };
      return res.status(500).json(response);
    }

    // Update session status to document_uploaded if this is the first document
    if (session.status === 'pending') {
      await vaasSupabase
        .from('vaas_verification_sessions')
        .update({ status: 'document_uploaded', updated_at: new Date().toISOString() })
        .eq('id', session.id);
    }

    const response: VaasApiResponse = {
      success: true,
      data: {
        document_id: document.id,
        processing_status: 'uploaded'
      }
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('[PublicRoutes] Document upload failed:', error);
    
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'DOCUMENT_UPLOAD_FAILED',
        message: error.message || 'Failed to upload document'
      }
    };
    
    res.status(500).json(response);
  }
});

// Submit verification for processing
router.post('/sessions/:sessionToken/submit', async (req: Request, res: Response) => {
  try {
    const { sessionToken } = req.params;

    // Find verification session by token
    const { data: session, error: sessionError } = await vaasSupabase
      .from('vaas_verification_sessions')
      .select('id, status, organization_id, idswyft_verification_id')
      .eq('session_token', sessionToken)
      .single();

    if (sessionError || !session) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Invalid verification session'
        }
      };
      return res.status(404).json(response);
    }

    // Check if session has documents uploaded
    if (session.status !== 'document_uploaded') {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'NO_DOCUMENTS_UPLOADED',
          message: 'Please upload required documents before submitting'
        }
      };
      return res.status(400).json(response);
    }

    // Update session status to processing
    const { error: updateError } = await vaasSupabase
      .from('vaas_verification_sessions')
      .update({ 
        status: 'processing', 
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      })
      .eq('id', session.id);

    if (updateError) {
      throw new Error('Failed to update session status');
    }

    // In a real implementation, this would trigger the verification processing
    // For now, we'll simulate processing by updating to completed after a delay
    // This would normally be handled by a background job or webhook from main Idswyft API

    const response: VaasApiResponse = {
      success: true,
      data: {
        message: 'Verification submitted for processing'
      }
    };

    res.json(response);
  } catch (error: any) {
    console.error('[PublicRoutes] Submit verification failed:', error);
    
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'SUBMIT_VERIFICATION_FAILED',
        message: error.message || 'Failed to submit verification'
      }
    };
    
    res.status(500).json(response);
  }
});

// Get verification status
router.get('/sessions/:sessionToken/status', async (req: Request, res: Response) => {
  try {
    const { sessionToken } = req.params;

    // Find verification session by token
    const { data: session, error: sessionError } = await vaasSupabase
      .from('vaas_verification_sessions')
      .select(`
        id,
        status,
        results,
        submitted_at,
        completed_at,
        expires_at
      `)
      .eq('session_token', sessionToken)
      .single();

    if (sessionError || !session) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Invalid verification session'
        }
      };
      return res.status(404).json(response);
    }

    // Count uploaded documents
    const { data: documents, error: docError } = await vaasSupabase
      .from('vaas_verification_documents')
      .select('id, document_type')
      .eq('verification_session_id', session.id);

    if (docError) {
      console.error('[PublicRoutes] Error fetching documents:', docError);
    }

    const statusResponse = {
      status: session.status,
      confidence_score: session.results?.confidence_score,
      results: session.results ? {
        face_match_score: session.results.face_match_score,
        liveness_score: session.results.liveness_score,
        document_validity: session.results.document_validity,
        failure_reasons: session.results.failure_reasons
      } : undefined,
      documents_uploaded: documents?.length || 0,
      submitted_at: session.submitted_at,
      completed_at: session.completed_at,
      expires_at: session.expires_at
    };

    res.json(statusResponse);
  } catch (error: any) {
    console.error('[PublicRoutes] Get status failed:', error);
    
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'GET_STATUS_FAILED',
        message: error.message || 'Failed to get verification status'
      }
    };
    
    res.status(500).json(response);
  }
});

// Perform liveness check
router.post('/sessions/:sessionToken/liveness', async (req: Request, res: Response) => {
  try {
    const { sessionToken } = req.params;
    const livenessData = req.body;

    // Find verification session by token
    const { data: session, error: sessionError } = await vaasSupabase
      .from('vaas_verification_sessions')
      .select('id, status')
      .eq('session_token', sessionToken)
      .single();

    if (sessionError || !session) {
      const response: VaasApiResponse = {
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Invalid verification session'
        }
      };
      return res.status(404).json(response);
    }

    // Store liveness data (this would normally trigger liveness detection processing)
    const { error: updateError } = await vaasSupabase
      .from('vaas_verification_sessions')
      .update({ 
        liveness_data: livenessData,
        updated_at: new Date().toISOString() 
      })
      .eq('id', session.id);

    if (updateError) {
      throw new Error('Failed to store liveness data');
    }

    const response: VaasApiResponse = {
      success: true,
      data: {
        message: 'Liveness data received'
      }
    };

    res.json(response);
  } catch (error: any) {
    console.error('[PublicRoutes] Liveness check failed:', error);
    
    const response: VaasApiResponse = {
      success: false,
      error: {
        code: 'LIVENESS_CHECK_FAILED',
        message: error.message || 'Failed to process liveness check'
      }
    };
    
    res.status(500).json(response);
  }
});

export default router;