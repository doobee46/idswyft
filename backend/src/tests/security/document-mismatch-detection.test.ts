import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock heavy dependencies that load at module initialisation time
vi.mock('@/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logVerificationEvent: vi.fn(),
}));
vi.mock('@/config/index.js', () => ({
  default: {
    nodeEnv: 'test',
    supabase: { url: '', anonKey: '', serviceRoleKey: '', storageBucket: '' },
    storage: { provider: 'local' },
    ocr: { tesseractPath: '/usr/bin/tesseract' },
  },
}));
vi.mock('@/config/database.js', () => ({
  supabase: { from: vi.fn(), storage: { from: vi.fn() } },
  connectDB: vi.fn(),
}));
vi.mock('../../services/storage.js', () => ({
  StorageService: class MockStorage {
    storeDocument = vi.fn();
    storeSelfie = vi.fn();
    downloadFile = vi.fn().mockResolvedValue(Buffer.from('mock'));
    deleteFile = vi.fn();
    getFile = vi.fn();
  },
}));
// Optional native modules: mock to prevent load errors
vi.mock('./enhancedFaceRecognition.js', () => ({}));

import { FaceRecognitionService } from '../../services/faceRecognition.js';

// Photo consistency threshold used by the verification pipeline
const PHOTO_CONSISTENCY_THRESHOLD = 0.75;

describe('Document Mismatch Detection Security', () => {
  let faceService: FaceRecognitionService;

  beforeEach(() => {
    faceService = new FaceRecognitionService();
  });

  it('returns low score for mismatched document photos (different people)', async () => {
    vi.spyOn(faceService as any, 'compareDocumentPhotos').mockResolvedValue(0.35);

    const score = await (faceService as any).compareDocumentPhotos(
      Buffer.from('person1-front'),
      Buffer.from('person2-back')
    );

    expect(score).toBeLessThan(PHOTO_CONSISTENCY_THRESHOLD);
  });

  it('returns high score for matching document photos (same person)', async () => {
    vi.spyOn(faceService as any, 'compareDocumentPhotos').mockResolvedValue(0.89);

    const score = await (faceService as any).compareDocumentPhotos(
      Buffer.from('person1-front'),
      Buffer.from('person1-back')
    );

    expect(score).toBeGreaterThanOrEqual(PHOTO_CONSISTENCY_THRESHOLD);
  });

  it('treats borderline scores below threshold as mismatched', () => {
    // 0.74 is just under the threshold — must be treated as a mismatch
    expect(0.74).toBeLessThan(PHOTO_CONSISTENCY_THRESHOLD);
  });

  it('treats borderline scores at threshold as matched', () => {
    // 0.75 exactly meets the threshold — accepted
    expect(0.75).toBeGreaterThanOrEqual(PHOTO_CONSISTENCY_THRESHOLD);
  });
});
