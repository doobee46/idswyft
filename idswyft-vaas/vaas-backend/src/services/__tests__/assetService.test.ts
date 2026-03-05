import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/database.js', () => ({
  vaasSupabase: {
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
}));

import { validateAssetFile, uploadOrgAsset, getOrgAssets } from '../assetService.js';
import { vaasSupabase } from '../../config/database.js';

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

describe('uploadOrgAsset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when org is not found', async () => {
    const mockStorage = {
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/logo' } }),
    };
    (vaasSupabase.storage.from as ReturnType<typeof vi.fn>).mockReturnValue(mockStorage);

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
    (vaasSupabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

    const file = { mimetype: 'image/png', size: 100_000, buffer: Buffer.alloc(0) } as Express.Multer.File;
    await expect(uploadOrgAsset('nonexistent-id', 'logo', file)).rejects.toThrow('Organization not found');
  });
});

describe('getOrgAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when org is not found', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
    (vaasSupabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

    await expect(getOrgAssets('nonexistent-id')).rejects.toThrow('Organization not found');
  });

  it('returns null fields when branding is empty', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { branding: null }, error: null }),
        }),
      }),
    });
    (vaasSupabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

    const result = await getOrgAssets('some-id');
    expect(result.logo_url).toBeNull();
    expect(result.favicon_url).toBeNull();
  });
});
