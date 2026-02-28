import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { TempCleanupService } from '../../services/tempCleanup.js';

const TEST_TEMP_DIR = path.join(process.cwd(), 'test-temp');

describe('TempCleanupService', () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_TEMP_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_TEMP_DIR, { recursive: true, force: true });
  });

  it('deletes files older than maxAgeMs', async () => {
    const filePath = path.join(TEST_TEMP_DIR, 'old-file.jpg');
    await fs.writeFile(filePath, 'test');
    // Backdate mtime by 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await fs.utimes(filePath, twoHoursAgo, twoHoursAgo);

    const service = new TempCleanupService(TEST_TEMP_DIR);
    const deleted = await service.cleanup({ maxAgeMs: 60 * 60 * 1000 }); // 1 hour threshold

    expect(deleted).toBe(1);
    await expect(fs.access(filePath)).rejects.toThrow();
  });

  it('keeps files newer than maxAgeMs', async () => {
    const filePath = path.join(TEST_TEMP_DIR, 'new-file.jpg');
    await fs.writeFile(filePath, 'test');

    const service = new TempCleanupService(TEST_TEMP_DIR);
    const deleted = await service.cleanup({ maxAgeMs: 60 * 60 * 1000 });

    expect(deleted).toBe(0);
    await expect(fs.access(filePath)).resolves.toBeUndefined();
  });

  it('returns 0 when temp dir does not exist', async () => {
    const service = new TempCleanupService('/nonexistent/path/to/temp');
    const deleted = await service.cleanup();
    expect(deleted).toBe(0);
  });
});
