import { VerificationRequest, Document, Selfie, VerificationStatus } from '../types/index.js';
import { DocumentQualityResult } from './documentQuality.js';
export declare class VerificationService {
    createVerificationRequest(data: {
        user_id: string;
        developer_id: string;
        is_sandbox?: boolean;
    }): Promise<VerificationRequest>;
    getVerificationRequest(id: string): Promise<VerificationRequest | null>;
    updateVerificationRequest(id: string, updates: Partial<VerificationRequest>): Promise<VerificationRequest>;
    getLatestVerificationByUserId(userId: string): Promise<VerificationRequest | null>;
    getVerificationHistory(userId: string, page?: number, limit?: number): Promise<{
        verifications: VerificationRequest[];
        total: number;
    }>;
    createDocument(data: {
        verification_request_id: string;
        file_path: string;
        file_name: string;
        file_size: number;
        mime_type: string;
        document_type: string;
        is_back_of_id?: boolean;
    }): Promise<Document>;
    getDocumentByVerificationId(verificationId: string): Promise<Document | null>;
    updateDocument(id: string, updates: Partial<Document>): Promise<Document>;
    analyzeDocumentQuality(filePath: string): Promise<DocumentQualityResult>;
    createSelfie(data: {
        verification_request_id: string;
        file_path: string;
        file_name: string;
        file_size: number;
        liveness_score?: number;
    }): Promise<Selfie>;
    updateSelfie(id: string, updates: Partial<Selfie>): Promise<Selfie>;
    getVerificationRequestsForAdmin(filters?: {
        status?: VerificationStatus;
        developerId?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        verifications: VerificationRequest[];
        total: number;
    }>;
    approveVerification(verificationId: string, adminUserId: string): Promise<VerificationRequest>;
    rejectVerification(verificationId: string, adminUserId: string, reason: string): Promise<VerificationRequest>;
    getVerificationStats(developerId?: string): Promise<{
        total: number;
        verified: number;
        failed: number;
        pending: number;
        manual_review: number;
    }>;
}
