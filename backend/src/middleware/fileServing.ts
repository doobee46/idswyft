import path from 'path';
import fs from 'fs/promises';
import { Request, Response } from 'express';

const UPLOADS_BASE = path.resolve(process.cwd(), 'uploads');

/**
 * Returns true if the given relative path resolves within UPLOADS_BASE.
 * Rejects absolute paths and path traversal attempts (e.g., ../../etc/passwd).
 */
export function isPathSafe(filePath: string): boolean {
  // Reject absolute paths immediately
  if (filePath.startsWith('/')) return false;

  // Decode percent-encoded characters before resolving
  let decoded: string;
  try {
    decoded = decodeURIComponent(filePath);
  } catch {
    return false;
  }

  const resolved = path.resolve(UPLOADS_BASE, decoded);
  return resolved.startsWith(UPLOADS_BASE + path.sep) || resolved === UPLOADS_BASE;
}

/**
 * Express handler that serves a file from the uploads directory.
 * Only registered when STORAGE_PROVIDER=local.
 * Requires API key authentication (applied in server.ts).
 */
export async function serveLocalFile(req: Request, res: Response): Promise<void> {
  const requestedPath = (req.params as any)[0]; // everything after /api/files/

  if (!requestedPath || !isPathSafe(requestedPath)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const absolutePath = path.join(UPLOADS_BASE, decodeURIComponent(requestedPath));

  try {
    await fs.access(absolutePath);
    res.sendFile(absolutePath);
  } catch {
    res.status(404).json({ error: 'File not found' });
  }
}
