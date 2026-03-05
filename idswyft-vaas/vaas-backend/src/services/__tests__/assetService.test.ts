import { describe, it, expect, vi } from 'vitest';

vi.mock('../../config/database.js', () => ({
  vaasSupabase: {
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
}));

import { validateAssetFile } from '../assetService.js';

describe('validateAssetFile', () => {
  const makeFile = (mimetype: string, size: number) =>
    ({ mimetype, size, buffer: Buffer.alloc(0) } as Express.Multer.File);

  it('accepts PNG under 2MB', () => {
    expect(() => validateAssetFile(makeFile('image/png', 1_000_000))).not.toThrow();
  });

  it('accepts JPEG under 2MB', () => {
    expect(() => validateAssetFile(makeFile('image/jpeg', 500_000))).not.toThrow();
  });

  it('accepts WebP under 2MB', () => {
    expect(() => validateAssetFile(makeFile('image/webp', 800_000))).not.toThrow();
  });

  it('rejects PDF', () => {
    expect(() => validateAssetFile(makeFile('application/pdf', 100_000))).toThrow(
      'Invalid file type'
    );
  });

  it('rejects file over 2MB', () => {
    expect(() => validateAssetFile(makeFile('image/png', 3_000_000))).toThrow(
      'File too large'
    );
  });

  it('rejects file at limit + 1 byte', () => {
    const maxSize = 2 * 1024 * 1024;
    expect(() => validateAssetFile(makeFile('image/png', maxSize + 1))).toThrow(
      'File too large'
    );
  });

  it('accepts file exactly at the limit', () => {
    const maxSize = 2 * 1024 * 1024;
    expect(() => validateAssetFile(makeFile('image/png', maxSize))).not.toThrow();
  });
});
