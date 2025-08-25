import { supabase } from '../config/database.js';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
export class StorageService {
    generateSecureFileName(originalName, verificationId) {
        const timestamp = Date.now();
        const random = crypto.randomBytes(8).toString('hex');
        const extension = path.extname(originalName);
        return `${verificationId}_${timestamp}_${random}${extension}`;
    }
    async ensureDirectoryExists(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        }
        catch (error) {
            logger.error('Failed to create directory:', error);
            throw new Error('Failed to create storage directory');
        }
    }
    async storeDocument(buffer, originalName, mimeType, verificationId) {
        const fileName = this.generateSecureFileName(originalName, verificationId);
        try {
            if (config.storage.provider === 'supabase') {
                return await this.storeInSupabase(buffer, fileName, 'documents', mimeType);
            }
            else if (config.storage.provider === 'local') {
                return await this.storeLocally(buffer, fileName, 'documents');
            }
            else if (config.storage.provider === 's3') {
                return await this.storeInS3(buffer, fileName, 'documents', mimeType);
            }
            else {
                throw new Error(`Unsupported storage provider: ${config.storage.provider}`);
            }
        }
        catch (error) {
            logger.error('Failed to store document:', error);
            throw new Error('Failed to store document');
        }
    }
    async storeSelfie(buffer, originalName, mimeType, verificationId) {
        const fileName = this.generateSecureFileName(originalName, verificationId);
        try {
            if (config.storage.provider === 'supabase') {
                return await this.storeInSupabase(buffer, fileName, 'selfies', mimeType);
            }
            else if (config.storage.provider === 'local') {
                return await this.storeLocally(buffer, fileName, 'selfies');
            }
            else if (config.storage.provider === 's3') {
                return await this.storeInS3(buffer, fileName, 'selfies', mimeType);
            }
            else {
                throw new Error(`Unsupported storage provider: ${config.storage.provider}`);
            }
        }
        catch (error) {
            logger.error('Failed to store selfie:', error);
            throw new Error('Failed to store selfie');
        }
    }
    async storeInSupabase(buffer, fileName, folder, mimeType) {
        const filePath = `${folder}/${fileName}`;
        const { data, error } = await supabase.storage
            .from(config.supabase.storageBucket)
            .upload(filePath, buffer, {
            contentType: mimeType,
            duplex: 'half'
        });
        if (error) {
            logger.error('Supabase storage error:', error);
            throw new Error('Failed to upload to Supabase storage');
        }
        logger.info('File stored in Supabase', {
            path: data.path,
            folder,
            fileName
        });
        return data.path;
    }
    async storeLocally(buffer, fileName, folder) {
        const uploadDir = path.join(process.cwd(), 'uploads', folder);
        await this.ensureDirectoryExists(uploadDir);
        const filePath = path.join(uploadDir, fileName);
        await fs.writeFile(filePath, buffer);
        logger.info('File stored locally', {
            path: filePath,
            folder,
            fileName
        });
        return `uploads/${folder}/${fileName}`;
    }
    async storeInS3(buffer, fileName, folder, mimeType) {
        // This would require AWS SDK implementation
        // For now, throwing an error to indicate it's not implemented
        throw new Error('S3 storage provider not implemented yet');
        // Implementation would look like:
        /*
        const AWS = require('aws-sdk');
        const s3 = new AWS.S3({
          accessKeyId: config.storage.awsAccessKey,
          secretAccessKey: config.storage.awsSecretKey,
          region: config.storage.awsRegion
        });
        
        const params = {
          Bucket: config.storage.awsS3Bucket!,
          Key: `${folder}/${fileName}`,
          Body: buffer,
          ContentType: mimeType
        };
        
        const result = await s3.upload(params).promise();
        return result.Location;
        */
    }
    async getFileUrl(filePath, expiresIn = 3600) {
        try {
            if (config.storage.provider === 'supabase') {
                const { data } = await supabase.storage
                    .from(config.supabase.storageBucket)
                    .createSignedUrl(filePath, expiresIn);
                if (!data?.signedUrl) {
                    throw new Error('Failed to generate signed URL');
                }
                return data.signedUrl;
            }
            else if (config.storage.provider === 'local') {
                // For local storage, return a relative path
                // In production, this should be served through a secure endpoint
                return `/files/${filePath}`;
            }
            else if (config.storage.provider === 's3') {
                // S3 signed URL implementation would go here
                throw new Error('S3 signed URLs not implemented yet');
            }
            else {
                throw new Error(`Unsupported storage provider: ${config.storage.provider}`);
            }
        }
        catch (error) {
            logger.error('Failed to get file URL:', error);
            throw new Error('Failed to get file URL');
        }
    }
    async downloadFile(filePath) {
        try {
            if (config.storage.provider === 'supabase') {
                const { data, error } = await supabase.storage
                    .from(config.supabase.storageBucket)
                    .download(filePath);
                if (error || !data) {
                    throw new Error('Failed to download from Supabase storage');
                }
                return Buffer.from(await data.arrayBuffer());
            }
            else if (config.storage.provider === 'local') {
                const fullPath = path.join(process.cwd(), filePath);
                return await fs.readFile(fullPath);
            }
            else if (config.storage.provider === 's3') {
                // S3 download implementation would go here
                throw new Error('S3 download not implemented yet');
            }
            else {
                throw new Error(`Unsupported storage provider: ${config.storage.provider}`);
            }
        }
        catch (error) {
            logger.error('Failed to download file:', error);
            throw new Error('Failed to download file');
        }
    }
    async deleteFile(filePath) {
        try {
            if (config.storage.provider === 'supabase') {
                const { error } = await supabase.storage
                    .from(config.supabase.storageBucket)
                    .remove([filePath]);
                if (error) {
                    throw new Error('Failed to delete from Supabase storage');
                }
            }
            else if (config.storage.provider === 'local') {
                const fullPath = path.join(process.cwd(), filePath);
                await fs.unlink(fullPath);
            }
            else if (config.storage.provider === 's3') {
                // S3 delete implementation would go here
                throw new Error('S3 delete not implemented yet');
            }
            logger.info('File deleted', { filePath });
        }
        catch (error) {
            logger.error('Failed to delete file:', error);
            throw new Error('Failed to delete file');
        }
    }
    // GDPR compliance: Delete all files for a user
    async deleteUserFiles(userId) {
        try {
            // Get all verification requests for the user
            const { data: verifications, error } = await supabase
                .from('verification_requests')
                .select(`
          id,
          documents(file_path),
          selfies(file_path)
        `)
                .eq('user_id', userId);
            if (error) {
                logger.error('Failed to get user files for deletion:', error);
                throw new Error('Failed to get user files');
            }
            const filesToDelete = [];
            verifications.forEach((verification) => {
                verification.documents?.forEach((doc) => {
                    if (doc.file_path)
                        filesToDelete.push(doc.file_path);
                });
                verification.selfies?.forEach((selfie) => {
                    if (selfie.file_path)
                        filesToDelete.push(selfie.file_path);
                });
            });
            // Delete files
            for (const filePath of filesToDelete) {
                try {
                    await this.deleteFile(filePath);
                }
                catch (error) {
                    logger.error(`Failed to delete file ${filePath}:`, error);
                    // Continue with other files even if one fails
                }
            }
            logger.info('User files deleted for GDPR compliance', {
                userId,
                filesDeleted: filesToDelete.length
            });
        }
        catch (error) {
            logger.error('Failed to delete user files:', error);
            throw new Error('Failed to delete user files');
        }
    }
    async getLocalFilePath(filePath) {
        try {
            if (config.storage.provider === 'local') {
                // For local storage, just return the full path
                return path.join(process.cwd(), filePath);
            }
            else if (config.storage.provider === 'supabase') {
                // For Supabase, download to temp directory for processing
                const tempDir = path.join(process.cwd(), 'temp');
                await this.ensureDirectoryExists(tempDir);
                const fileName = path.basename(filePath);
                const tempFilePath = path.join(tempDir, `temp_${Date.now()}_${fileName}`);
                // Download file from Supabase
                const buffer = await this.downloadFile(filePath);
                await fs.writeFile(tempFilePath, buffer);
                return tempFilePath;
            }
            else {
                throw new Error(`Local file path not available for provider: ${config.storage.provider}`);
            }
        }
        catch (error) {
            logger.error('Failed to get local file path:', error);
            throw new Error('Failed to get local file path');
        }
    }
    // Health check for storage service
    async healthCheck() {
        try {
            if (config.storage.provider === 'supabase') {
                // Try to list files to test connection
                const { error } = await supabase.storage
                    .from(config.supabase.storageBucket)
                    .list('', { limit: 1 });
                return {
                    status: error ? 'error' : 'healthy',
                    provider: 'supabase',
                    error: error?.message
                };
            }
            else if (config.storage.provider === 'local') {
                // Check if upload directory exists and is writable
                const uploadDir = path.join(process.cwd(), 'uploads');
                await this.ensureDirectoryExists(uploadDir);
                return {
                    status: 'healthy',
                    provider: 'local'
                };
            }
            else {
                return {
                    status: 'unknown',
                    provider: config.storage.provider
                };
            }
        }
        catch (error) {
            return {
                status: 'error',
                provider: config.storage.provider,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
