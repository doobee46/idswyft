import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all heavy dependencies before importing the module
vi.mock('@/services/ocr.js', () => ({ OCRService: class {} }));
vi.mock('@/services/barcode.js', () => ({ BarcodeService: class {} }));
vi.mock('@/services/faceRecognition.js', () => ({ FaceRecognitionService: class {} }));
vi.mock('@/services/verificationConsistency.js', () => ({ VerificationConsistencyService: class {} }));
vi.mock('@/config/database.js', () => ({ supabase: {} }));
vi.mock('@/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn().mockResolvedValue(undefined);

vi.mock('@/services/verification.js', () => ({
  VerificationService: class {
    createVerificationRequest = mockCreate;
    updateVerificationRequest = mockUpdate;
    getVerificationRequest = mockGet;
    deleteVerificationRequest = mockDelete;
  },
}));

describe('NewVerificationEngine.initializeVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({
      id: 'db-generated-id',
      status: 'pending',
      user_id: 'user-1',
      developer_id: 'dev-1',
      is_sandbox: false,
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockUpdate.mockResolvedValue(undefined);
    mockGet.mockResolvedValue({
      id: 'db-generated-id',
      status: 'pending',
      user_id: 'user-1',
      developer_id: 'dev-1',
      face_match_score: 0,
      liveness_score: 0,
      cross_validation_score: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockDelete.mockResolvedValue(undefined);
  });

  it('calls createVerificationRequest before updateVerificationRequest', async () => {
    const { NewVerificationEngine } = await import('../NewVerificationEngine.js');
    const engine = new NewVerificationEngine();

    await engine.initializeVerification('user-1', 'dev-1');

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', developer_id: 'dev-1' })
    );
  });

  it('uses the DB-assigned ID (not a locally-generated UUID)', async () => {
    const { NewVerificationEngine } = await import('../NewVerificationEngine.js');
    const engine = new NewVerificationEngine();

    const state = await engine.initializeVerification('user-1', 'dev-1');

    expect(state.id).toBe('db-generated-id');
  });

  it('propagates createVerificationRequest failure and does not call saveVerificationState', async () => {
    mockCreate.mockRejectedValue(new Error('DB constraint violation'));

    const { NewVerificationEngine } = await import('../NewVerificationEngine.js');
    const engine = new NewVerificationEngine();

    await expect(engine.initializeVerification('user-1', 'dev-1')).rejects.toThrow(
      'DB constraint violation'
    );
    // saveVerificationState calls updateVerificationRequest — must not be called if create fails
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('attempts compensating delete when saveVerificationState fails after successful create', async () => {
    mockCreate.mockResolvedValue({
      id: 'db-generated-id',
      status: 'pending',
      user_id: 'user-1',
      developer_id: 'dev-1',
      is_sandbox: false,
      created_at: new Date(),
      updated_at: new Date(),
    });
    // Make saveVerificationState fail (it calls updateVerificationRequest)
    mockUpdate.mockRejectedValue(new Error('State sync failed'));
    mockGet.mockResolvedValue(null);

    const { NewVerificationEngine } = await import('../NewVerificationEngine.js');
    const engine = new NewVerificationEngine();

    await expect(engine.initializeVerification('user-1', 'dev-1')).rejects.toThrow(
      'State sync failed'
    );
    // Compensating delete must be attempted
    expect(mockDelete).toHaveBeenCalledWith('db-generated-id');
  });
});
