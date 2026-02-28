import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock all transitive dependencies before any imports ──────────────────────
vi.mock('@/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/config/database.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    })),
  },
  connectDB: vi.fn(),
}));

vi.mock('@/config/index.js', () => ({
  default: {
    nodeEnv: 'test',
    storage: { provider: 'local' },
    sandbox: { enabled: false },
    supabase: { url: '', anonKey: '', serviceRoleKey: '', storageBucket: '' },
  },
}));

vi.mock('../../services/ocr.js', () => ({
  OCRService: class { processDocument = vi.fn(); },
}));
vi.mock('../../services/barcode.js', () => ({
  BarcodeService: class { scanBackOfId = vi.fn(); },
}));
vi.mock('../../services/verification.js', () => ({
  VerificationService: class {
    getVerificationRequest = vi.fn();
    updateVerificationRequest = vi.fn().mockResolvedValue({});
  },
}));
vi.mock('../../services/faceRecognition.js', () => ({
  FaceRecognitionService: class { compareFaces = vi.fn(); },
}));
vi.mock('../../services/verificationConsistency.js', () => ({
  VerificationConsistencyService: class {},
}));

import { NewVerificationEngine, VerificationStatus } from '../../services/NewVerificationEngine.js';

// ── Helper: build a minimal in-memory VerificationState ──────────────────────
function makeState(overrides: Partial<any> = {}): any {
  return {
    id: 'verification-123',
    status: VerificationStatus.PENDING,
    currentStep: 1,
    totalSteps: 6,
    barcodeExtractionFailed: false,
    documentsMatch: false,
    faceMatchPassed: false,
    livenessPassed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('NewVerificationEngine — state persistence', () => {
  let engine: NewVerificationEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new NewVerificationEngine();
  });

  it('calls persistState after front document is processed', async () => {
    // Spy on the private methods we're NOT testing here
    const persistSpy = vi.spyOn(engine as any, 'persistState').mockResolvedValue(undefined);
    vi.spyOn(engine as any, 'getVerificationState').mockResolvedValue(makeState());
    vi.spyOn(engine as any, 'extractFrontDocumentData').mockResolvedValue({ raw_text: 'JOHN DOE' });
    vi.spyOn(engine as any, 'saveVerificationState').mockResolvedValue(undefined);

    await engine.processFrontDocument('verification-123', 'path/to/doc.jpg');

    expect(persistSpy).toHaveBeenCalled();
    expect(persistSpy).toHaveBeenCalledWith(
      'verification-123',
      expect.objectContaining({ status: expect.any(String) })
    );
  });

  it('calls persistState after back document is processed', async () => {
    const persistSpy = vi.spyOn(engine as any, 'persistState').mockResolvedValue(undefined);
    vi.spyOn(engine as any, 'getVerificationState').mockResolvedValue(
      makeState({ status: VerificationStatus.FRONT_DOCUMENT_PROCESSED })
    );
    vi.spyOn(engine as any, 'extractBackDocumentData').mockResolvedValue({ licenseNumber: 'ABC123' });
    vi.spyOn(engine as any, 'saveVerificationState').mockResolvedValue(undefined);

    await engine.processBackDocument('verification-123', 'path/to/back.jpg');

    expect(persistSpy).toHaveBeenCalled();
  });

  it('persistState writes partials that saveVerificationState omits', async () => {
    // Test the actual persistState implementation by calling it directly
    const { supabase } = await import('@/config/database.js');
    const updateMock = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }));
    (supabase.from as any).mockReturnValue({ update: updateMock });

    await (engine as any).persistState('verification-123', {
      status: VerificationStatus.FRONT_DOCUMENT_PROCESSED,
      frontOcrData: { raw_text: 'JOHN DOE' },
      finalScore: 0.95,
    });

    expect(supabase.from).toHaveBeenCalledWith('verification_requests');
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ocr_data: { raw_text: 'JOHN DOE' },
        confidence_score: 0.95,
      })
    );
  });
});
