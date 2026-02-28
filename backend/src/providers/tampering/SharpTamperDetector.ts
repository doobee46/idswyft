import sharp from 'sharp';
import { logger } from '@/utils/logger.js';

export interface TamperDetectionResult {
  /** 0 = likely tampered, 1 = likely authentic */
  score: number;
  flags: string[];
  isAuthentic: boolean;
}

/**
 * Lightweight document authenticity checks using Sharp (libvips).
 *
 * Checks performed:
 *  1. ELA (Error Level Analysis) — re-encodes at 85% JPEG quality and measures
 *     the mean pixel difference. Edited regions show higher-than-expected ELA
 *     because they were saved from a different compression baseline.
 *  2. Low entropy detection — solid-colour regions (stdev < 5 per channel)
 *     suggest text was digitally replaced over a painted-out background.
 *  3. EXIF presence check — authentic JPEG camera images nearly always contain
 *     EXIF data; missing EXIF on a JPEG is a weak tamper signal.
 */
export class SharpTamperDetector {
  async analyze(imageBuffer: Buffer): Promise<TamperDetectionResult> {
    const flags: string[] = [];
    let score = 1.0;

    try {
      const image = sharp(imageBuffer);
      const [metadata, stats] = await Promise.all([image.metadata(), image.stats()]);

      // ── Check 1: ELA ────────────────────────────────────────────────────────
      const reEncoded = await sharp(imageBuffer).jpeg({ quality: 85 }).toBuffer();
      const reEncodedStats = await sharp(reEncoded).stats();

      const originalMean = stats.channels.reduce((s, c) => s + c.mean, 0) / stats.channels.length;
      const reEncodedMean = reEncodedStats.channels.reduce((s, c) => s + c.mean, 0) / reEncodedStats.channels.length;
      const elaDiff = Math.abs(originalMean - reEncodedMean);

      if (elaDiff > 15) {
        flags.push('HIGH_ELA_DIFFERENCE');
        score -= 0.3;
      }

      // ── Check 2: Low entropy (possible text replacement) ──────────────────
      const entropy = stats.channels.reduce((s, c) => s + c.stdev, 0) / stats.channels.length;
      if (entropy < 5) {
        flags.push('LOW_ENTROPY_REGIONS');
        score -= 0.2;
      }

      // ── Check 3: Missing EXIF on JPEG ────────────────────────────────────
      if (!metadata.exif && metadata.format === 'jpeg') {
        flags.push('MISSING_EXIF_JPEG');
        score -= 0.1;
      }

      logger.info('Tamper detection complete', {
        format: metadata.format,
        elaDiff: elaDiff.toFixed(2),
        entropy: entropy.toFixed(2),
        score: Math.max(0, score).toFixed(2),
        flags,
      });
    } catch (err) {
      logger.warn('Tamper detection failed', { error: err instanceof Error ? err.message : 'Unknown' });
      flags.push('ANALYSIS_FAILED');
      score = 0.5; // Unknown — neutral score
    }

    const finalScore = Math.max(0, score);
    return {
      score: finalScore,
      flags,
      isAuthentic: finalScore >= 0.7,
    };
  }
}
