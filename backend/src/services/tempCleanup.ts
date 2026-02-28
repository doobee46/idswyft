import fs from 'fs/promises';
import path from 'path';

export class TempCleanupService {
  private tempDir: string;

  constructor(tempDir: string = path.join(process.cwd(), 'temp')) {
    this.tempDir = tempDir;
  }

  async cleanup(options: { maxAgeMs?: number } = {}): Promise<number> {
    const maxAgeMs = options.maxAgeMs ?? 60 * 60 * 1000; // Default: 1 hour
    const cutoff = Date.now() - maxAgeMs;
    let deletedCount = 0;

    try {
      const entries = await fs.readdir(this.tempDir);

      await Promise.all(entries.map(async (entry) => {
        const filePath = path.join(this.tempDir, entry);
        try {
          const stat = await fs.stat(filePath);
          if (stat.isFile() && stat.mtimeMs < cutoff) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        } catch (err) {
          console.warn('[TempCleanup] Failed to clean up temp file', filePath, err);
        }
      }));
    } catch (err) {
      // Directory may not exist yet — that is fine
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('[TempCleanup] Error reading temp directory', err);
      }
    }

    if (deletedCount > 0) {
      console.info(`[TempCleanup] ${deletedCount} file(s) deleted`);
    }

    return deletedCount;
  }
}
