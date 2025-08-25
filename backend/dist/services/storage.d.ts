export declare class StorageService {
    private generateSecureFileName;
    private ensureDirectoryExists;
    storeDocument(buffer: Buffer, originalName: string, mimeType: string, verificationId: string): Promise<string>;
    storeSelfie(buffer: Buffer, originalName: string, mimeType: string, verificationId: string): Promise<string>;
    private storeInSupabase;
    private storeLocally;
    private storeInS3;
    getFileUrl(filePath: string, expiresIn?: number): Promise<string>;
    downloadFile(filePath: string): Promise<Buffer>;
    deleteFile(filePath: string): Promise<void>;
    deleteUserFiles(userId: string): Promise<void>;
    getLocalFilePath(filePath: string): Promise<string>;
    healthCheck(): Promise<{
        status: string;
        provider: string;
        error?: string;
    }>;
}
