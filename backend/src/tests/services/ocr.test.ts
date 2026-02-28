import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all heavy/uninstalled dependencies before importing the service
vi.mock('tesseract.js', () => ({
  default: { recognize: vi.fn() },
}));

vi.mock('jimp', () => ({
  default: {
    read: vi.fn().mockResolvedValue({
      greyscale: vi.fn().mockReturnThis(),
      contrast: vi.fn().mockReturnThis(),
      brightness: vi.fn().mockReturnThis(),
      normalize: vi.fn().mockReturnThis(),
      blur: vi.fn().mockReturnThis(),
      convolute: vi.fn().mockReturnThis(),
      getBufferAsync: vi.fn().mockResolvedValue(Buffer.from('fake')),
    }),
  },
}));

vi.mock('@/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../services/storage.js', () => ({
  StorageService: class MockStorageService {
    getFile = vi.fn();
    downloadFile = vi.fn().mockResolvedValue(Buffer.from('fake-image-data'));
    storeFile = vi.fn();
    deleteFile = vi.fn();
  },
}));

vi.mock('../../services/verification.js', () => ({
  VerificationService: class MockVerificationService {
    updateDocument = vi.fn().mockResolvedValue(undefined);
    getVerificationRequest = vi.fn();
  },
}));

vi.mock('@/config/index.js', () => ({
  default: {
    nodeEnv: 'test',
    ocr: { tesseractPath: '/usr/bin/tesseract' },
  },
}));

describe('OCRService fallback behavior', () => {
  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    vi.restoreAllMocks();
  });

  it('falls back to Tesseract when OpenAI OCR throws', async () => {
    process.env.OPENAI_API_KEY = 'test-key';

    const { OCRService } = await import('../../services/ocr.js');
    const service = new OCRService() as any;

    const processWithAISpy = vi.spyOn(service, 'processWithAI')
      .mockRejectedValue(new Error('OpenAI rate limit exceeded'));

    const fakeOcrResult = { raw_text: 'JOHN DOE', confidence_scores: {} };
    const processWithTesseractSpy = vi.spyOn(service, 'processWithTesseract')
      .mockResolvedValue(fakeOcrResult);

    const result = await service.processDocument('doc-1', '/fake/path.jpg', 'passport');

    expect(processWithAISpy).toHaveBeenCalledOnce();
    expect(processWithTesseractSpy).toHaveBeenCalledOnce();
    expect(result.raw_text).toBe('JOHN DOE');
    expect(result.confidence_scores).toHaveProperty('fallback_used');
  });

  it('uses Tesseract directly when OPENAI_API_KEY is not set', async () => {
    delete process.env.OPENAI_API_KEY;

    const { OCRService } = await import('../../services/ocr.js');
    const service = new OCRService() as any;

    const processWithAISpy = vi.spyOn(service, 'processWithAI');
    const fakeOcrResult = { raw_text: 'JANE SMITH', confidence_scores: {} };
    const processWithTesseractSpy = vi.spyOn(service, 'processWithTesseract')
      .mockResolvedValue(fakeOcrResult);

    const result = await service.processDocument('doc-2', '/fake/path.jpg', 'drivers_license');

    expect(processWithAISpy).not.toHaveBeenCalled();
    expect(processWithTesseractSpy).toHaveBeenCalledOnce();
    expect(result.raw_text).toBe('JANE SMITH');
  });
});
