import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock file-type so tests don't need the package installed
vi.mock('file-type', () => ({
  fileTypeFromBuffer: vi.fn(),
}));

// Mock logger to avoid requiring winston (not installed in worktree)
vi.mock('@/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { fileTypeFromBuffer } from 'file-type';
import { validateFileType } from '../../middleware/fileValidation.js';

const mockFileTypeFromBuffer = fileTypeFromBuffer as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('validateFileType', () => {
  it('accepts a valid JPEG buffer', async () => {
    mockFileTypeFromBuffer.mockResolvedValue({ mime: 'image/jpeg', ext: 'jpg' });

    const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    const result = await validateFileType(jpegBuffer, ['image/jpeg', 'image/png']);

    expect(result.valid).toBe(true);
    expect(result.detectedType).toBe('image/jpeg');
  });

  it('accepts a valid PNG buffer', async () => {
    mockFileTypeFromBuffer.mockResolvedValue({ mime: 'image/png', ext: 'png' });

    const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
    const result = await validateFileType(pngBuffer, ['image/jpeg', 'image/png']);

    expect(result.valid).toBe(true);
    expect(result.detectedType).toBe('image/png');
  });

  it('rejects an EXE disguised as a JPEG', async () => {
    // MZ header — Windows executable
    mockFileTypeFromBuffer.mockResolvedValue({ mime: 'application/x-msdownload', ext: 'exe' });

    const exeBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00]);
    const result = await validateFileType(exeBuffer, ['image/jpeg', 'image/png']);

    expect(result.valid).toBe(false);
    expect(result.detectedType).toBe('application/x-msdownload');
    expect(result.reason).toContain('not in allowed types');
  });

  it('rejects a buffer with unrecognizable magic bytes', async () => {
    mockFileTypeFromBuffer.mockResolvedValue(undefined);

    const randomBuffer = Buffer.from('just some text content');
    const result = await validateFileType(randomBuffer, ['image/jpeg']);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Could not determine file type');
  });

  it('uses default allowed types when none provided', async () => {
    mockFileTypeFromBuffer.mockResolvedValue({ mime: 'image/jpeg', ext: 'jpg' });

    const result = await validateFileType(Buffer.from([0xFF, 0xD8, 0xFF]));
    expect(result.valid).toBe(true);
  });
});
