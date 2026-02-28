import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock heavy optional deps required by TesseractProvider
vi.mock('tesseract.js', () => ({
  default: {
    createWorker: vi.fn().mockResolvedValue({
      setParameters: vi.fn().mockResolvedValue(undefined),
      recognize: vi.fn().mockResolvedValue({ data: { text: '' } }),
      terminate: vi.fn().mockResolvedValue(undefined),
    }),
    PSM: { SINGLE_BLOCK: 6 },
  },
}));

vi.mock('jimp', () => ({
  default: {
    read: vi.fn().mockResolvedValue({
      getWidth: vi.fn().mockReturnValue(100),
      getHeight: vi.fn().mockReturnValue(100),
      scaleToFit: vi.fn().mockReturnThis(),
      greyscale: vi.fn().mockReturnThis(),
      contrast: vi.fn().mockReturnThis(),
      brightness: vi.fn().mockReturnThis(),
      normalize: vi.fn().mockReturnThis(),
      blur: vi.fn().mockReturnThis(),
      convolute: vi.fn().mockReturnThis(),
      getBufferAsync: vi.fn().mockResolvedValue(Buffer.from('fake')),
    }),
    MIME_PNG: 'image/png',
  },
}));

vi.mock('@/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../services/storage.js', () => ({
  StorageService: class {
    downloadFile = vi.fn().mockResolvedValue(Buffer.from('fake-image-data'));
  },
}));

vi.mock('../../services/verification.js', () => ({
  VerificationService: class {
    updateDocument = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('@/config/index.js', () => ({
  default: { nodeEnv: 'test', ocr: { tesseractPath: '/usr/bin/tesseract' } },
}));

vi.mock('../../services/providerMetrics.js', () => ({
  ProviderMetricsService: class {
    record = vi.fn().mockResolvedValue(undefined);
    getProviderSummary = vi.fn().mockResolvedValue({ totalRequests: 0, successRate: 0, avgLatencyMs: 0, avgConfidence: 0 });
  },
}));

describe('OCRService provider delegation', () => {
  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OCR_PROVIDER;
    vi.restoreAllMocks();
  });

  it('falls back to TesseractProvider when primary provider throws', async () => {
    process.env.OPENAI_API_KEY = 'test-key'; // triggers openai provider by default

    const { TesseractProvider } = await import('@/providers/ocr/TesseractProvider.js');
    const tesseractSpy = vi.spyOn(TesseractProvider.prototype, 'processDocument')
      .mockResolvedValue({ raw_text: 'JOHN DOE', confidence_scores: {} });

    const { OpenAIProvider } = await import('@/providers/ocr/OpenAIProvider.js');
    vi.spyOn(OpenAIProvider.prototype, 'processDocument')
      .mockRejectedValue(new Error('OpenAI rate limit exceeded'));

    const { OCRService } = await import('../../services/ocr.js');
    const service = new OCRService();

    const result = await service.processDocument('doc-1', '/fake/path.jpg', 'passport');

    expect(tesseractSpy).toHaveBeenCalledOnce();
    expect(result.raw_text).toBe('JOHN DOE');
    expect(result.confidence_scores).toHaveProperty('fallback_used');
  });

  it('uses TesseractProvider directly when OPENAI_API_KEY is not set', async () => {
    delete process.env.OPENAI_API_KEY;

    const { TesseractProvider } = await import('@/providers/ocr/TesseractProvider.js');
    const tesseractSpy = vi.spyOn(TesseractProvider.prototype, 'processDocument')
      .mockResolvedValue({ raw_text: 'JANE SMITH', confidence_scores: {} });

    const { OpenAIProvider } = await import('@/providers/ocr/OpenAIProvider.js');
    const openaiSpy = vi.spyOn(OpenAIProvider.prototype, 'processDocument');

    const { OCRService } = await import('../../services/ocr.js');
    const service = new OCRService();

    const result = await service.processDocument('doc-2', '/fake/path.jpg', 'drivers_license');

    expect(openaiSpy).not.toHaveBeenCalled();
    expect(tesseractSpy).toHaveBeenCalledOnce();
    expect(result.raw_text).toBe('JANE SMITH');
  });
});
