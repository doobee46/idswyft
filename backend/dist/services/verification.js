import { supabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { DocumentQualityService } from './documentQuality.js';
export class VerificationService {
    async createVerificationRequest(data) {
        const { data: verification, error } = await supabase
            .from('verification_requests')
            .insert({
            user_id: data.user_id,
            developer_id: data.developer_id,
            status: 'pending'
        })
            .select('*')
            .single();
        if (error) {
            logger.error('Failed to create verification request:', error);
            throw new Error('Failed to create verification request');
        }
        return verification;
    }
    async getVerificationRequest(id) {
        const { data: verification, error } = await supabase
            .from('verification_requests')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            logger.error('Failed to get verification request:', error);
            throw new Error('Failed to get verification request');
        }
        return verification;
    }
    async updateVerificationRequest(id, updates) {
        const { data: verification, error } = await supabase
            .from('verification_requests')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single();
        if (error) {
            logger.error('Failed to update verification request:', error);
            throw new Error('Failed to update verification request');
        }
        return verification;
    }
    async getLatestVerificationByUserId(userId) {
        const { data: verification, error } = await supabase
            .from('verification_requests')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            logger.error('Failed to get latest verification:', error);
            throw new Error('Failed to get latest verification');
        }
        return verification;
    }
    async getVerificationHistory(userId, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const { data: verifications, error } = await supabase
            .from('verification_requests')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        const { count, error: countError } = await supabase
            .from('verification_requests')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
        if (error || countError) {
            logger.error('Failed to get verification history:', error || countError);
            throw new Error('Failed to get verification history');
        }
        return {
            verifications: verifications,
            total: count || 0
        };
    }
    async createDocument(data) {
        const { data: document, error } = await supabase
            .from('documents')
            .insert(data)
            .select('*')
            .single();
        if (error) {
            logger.error('Failed to create document:', error);
            throw new Error('Failed to create document');
        }
        return document;
    }
    async getDocumentByVerificationId(verificationId) {
        // First try to get the front document (main document, not back-of-id)
        const { data: documents, error } = await supabase
            .from('documents')
            .select('*')
            .eq('verification_request_id', verificationId)
            .order('created_at', { ascending: true }); // Get the first uploaded document (front)
        if (error) {
            logger.error('Failed to get documents:', error);
            throw new Error('Failed to get documents');
        }
        if (!documents || documents.length === 0) {
            console.log('❌ No documents found for verification_id:', verificationId);
            return null;
        }
        // Return the first document (should be the front document)
        const frontDocument = documents[0];
        console.log('✅ Found front document:', {
            id: frontDocument.id,
            verification_request_id: frontDocument.verification_request_id,
            file_name: frontDocument.file_name,
            created_at: frontDocument.created_at
        });
        return frontDocument;
    }
    async updateDocument(id, updates) {
        const { data: document, error } = await supabase
            .from('documents')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single();
        if (error) {
            logger.error('Failed to update document:', error);
            throw new Error('Failed to update document');
        }
        return document;
    }
    async analyzeDocumentQuality(filePath) {
        try {
            logger.info('Starting document quality analysis', { filePath });
            const qualityResult = await DocumentQualityService.analyzeDocument(filePath);
            logger.info('Document quality analysis completed', {
                filePath,
                overallQuality: qualityResult.overallQuality,
                issues: qualityResult.issues.length
            });
            return qualityResult;
        }
        catch (error) {
            logger.error('Document quality analysis failed:', error);
            throw new Error('Failed to analyze document quality');
        }
    }
    async createSelfie(data) {
        const { data: selfie, error } = await supabase
            .from('selfies')
            .insert({
            verification_request_id: data.verification_request_id,
            file_path: data.file_path,
            file_name: data.file_name,
            file_size: data.file_size,
            liveness_score: data.liveness_score,
            face_detected: false // Will be updated by face recognition service
        })
            .select('*')
            .single();
        if (error) {
            logger.error('Failed to create selfie:', error);
            throw new Error('Failed to create selfie');
        }
        return selfie;
    }
    async updateSelfie(id, updates) {
        const { data: selfie, error } = await supabase
            .from('selfies')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single();
        if (error) {
            logger.error('Failed to update selfie:', error);
            throw new Error('Failed to update selfie');
        }
        return selfie;
    }
    // Admin methods
    async getVerificationRequestsForAdmin(filters = {}) {
        const { status, developerId, page = 1, limit = 50 } = filters;
        const offset = (page - 1) * limit;
        let query = supabase
            .from('verification_requests')
            .select(`
        *,
        user:users(*),
        developer:developers(*),
        document:documents(*),
        selfie:selfies(*)
      `);
        if (status) {
            query = query.eq('status', status);
        }
        if (developerId) {
            query = query.eq('developer_id', developerId);
        }
        const { data: verifications, error } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        // Get total count
        let countQuery = supabase
            .from('verification_requests')
            .select('*', { count: 'exact', head: true });
        if (status) {
            countQuery = countQuery.eq('status', status);
        }
        if (developerId) {
            countQuery = countQuery.eq('developer_id', developerId);
        }
        const { count, error: countError } = await countQuery;
        if (error || countError) {
            logger.error('Failed to get verification requests for admin:', error || countError);
            throw new Error('Failed to get verification requests');
        }
        return {
            verifications: verifications,
            total: count || 0
        };
    }
    async approveVerification(verificationId, adminUserId) {
        const { data: verification, error } = await supabase
            .from('verification_requests')
            .update({
            status: 'verified',
            manual_review_reason: `Manually approved by admin ${adminUserId}`
        })
            .eq('id', verificationId)
            .select('*')
            .single();
        if (error) {
            logger.error('Failed to approve verification:', error);
            throw new Error('Failed to approve verification');
        }
        logger.info('Verification manually approved', {
            verificationId,
            adminUserId
        });
        return verification;
    }
    async rejectVerification(verificationId, adminUserId, reason) {
        const { data: verification, error } = await supabase
            .from('verification_requests')
            .update({
            status: 'failed',
            manual_review_reason: `Manually rejected by admin ${adminUserId}: ${reason}`
        })
            .eq('id', verificationId)
            .select('*')
            .single();
        if (error) {
            logger.error('Failed to reject verification:', error);
            throw new Error('Failed to reject verification');
        }
        logger.info('Verification manually rejected', {
            verificationId,
            adminUserId,
            reason
        });
        return verification;
    }
    // Analytics methods
    async getVerificationStats(developerId) {
        let query = supabase
            .from('verification_requests')
            .select('status');
        if (developerId) {
            query = query.eq('developer_id', developerId);
        }
        const { data: verifications, error } = await query;
        if (error) {
            logger.error('Failed to get verification stats:', error);
            throw new Error('Failed to get verification stats');
        }
        const stats = {
            total: verifications.length,
            verified: 0,
            failed: 0,
            pending: 0,
            manual_review: 0
        };
        verifications.forEach(v => {
            stats[v.status]++;
        });
        return stats;
    }
}
