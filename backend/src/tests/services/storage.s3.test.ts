import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock heavy transitive imports before loading StorageService
vi.mock('@/config/database.js', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        createSignedUrl: vi.fn(),
        download: vi.fn(),
        remove: vi.fn(),
        list: vi.fn(),
      })),
    },
    from: vi.fn(),
  },
  connectDB: vi.fn(),
}));

vi.mock('@/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/config/index.js', () => ({
  default: {
    nodeEnv: 'test',
    storage: {
      provider: 's3',
      awsRegion: 'us-east-1',
      awsAccessKey: 'test-key',
      awsSecretKey: 'test-secret',
      awsS3Bucket: 'test-bucket',
    },
    supabase: { storageBucket: 'identity-documents' },
    sandbox: { enabled: false },
  },
}));

// Use class syntax so vitest v4 doesn't warn about non-function/class constructors
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class MockS3Client {
    send = vi.fn().mockResolvedValue({});
  },
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.example.com/signed-url'),
}));

import { StorageService } from '../../services/storage.js';

describe('StorageService — S3 provider', () => {
  let service: StorageService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StorageService();
  });

  it('stores a document and returns an S3 key path', async () => {
    // storeInS3 is private — test via the public storeDocument method
    vi.spyOn(service as any, 'storeInS3').mockResolvedValue('documents/verification-123_timestamp_random.jpg');

    const result = await service.storeDocument(
      Buffer.from('fake-image'),
      'test.jpg',
      'image/jpeg',
      'verification-123'
    );
    expect(result).toMatch(/^documents\//);
  });

  it('stores a selfie and returns an S3 key path', async () => {
    vi.spyOn(service as any, 'storeInS3').mockResolvedValue('selfies/verification-456_timestamp_random.jpg');

    const result = await service.storeSelfie(
      Buffer.from('fake-selfie'),
      'selfie.jpg',
      'image/jpeg',
      'verification-456'
    );
    expect(result).toMatch(/^selfies\//);
  });

  it('generates a presigned URL for S3 objects', async () => {
    const url = await service.getFileUrl('documents/test.jpg', 3600);
    expect(url).toBe('https://s3.example.com/signed-url');
  });

  it('storeDocument delegates to storeInS3 with correct folder and mimeType', async () => {
    const spy = vi.spyOn(service as any, 'storeInS3').mockResolvedValue('documents/x.jpg');

    await service.storeDocument(Buffer.from('img'), 'doc.jpg', 'image/jpeg', 'ver-1');

    expect(spy).toHaveBeenCalledWith(
      Buffer.from('img'),
      expect.any(String), // secure generated filename
      'documents',
      'image/jpeg'
    );
  });
});
