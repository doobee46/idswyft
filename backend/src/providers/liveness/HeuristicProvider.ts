import { LivenessProvider } from '../types.js';
import { logger } from '@/utils/logger.js';

/**
 * HeuristicProvider uses image-quality heuristics to estimate liveness.
 * It acts as a safe, dependency-free fallback when no ML-based liveness
 * service is available.
 *
 * Heuristics used:
 * - File size: very small images are suspicious (screenshots, thumbnails)
 * - Byte entropy: high entropy (many unique byte values) is consistent with a natural photo
 * - Pixel variance proxy: natural photos have more variance than flat colours or reprinted images
 */
export class HeuristicProvider implements LivenessProvider {
  readonly name = 'heuristic';

  async assessLiveness(imageData: {
    buffer: Buffer;
    width?: number;
    height?: number;
    pixelData?: number[];
  }): Promise<number> {
    const { buffer, pixelData } = imageData;
    let score = 0.5; // Neutral starting point

    // ── Heuristic 1: file size ──────────────────────────────────────────────
    // Real photos are generally > 10 KB; screenshots can be smaller
    const fileSizeKb = buffer.length / 1024;
    if (fileSizeKb < 5) {
      score -= 0.3;
    } else if (fileSizeKb > 50) {
      score += 0.1;
    }

    // ── Heuristic 2: byte entropy ───────────────────────────────────────────
    const entropy = this.byteEntropy(buffer);
    // Natural photos have entropy > 7 bits/byte; flat images are lower
    if (entropy > 7.0) {
      score += 0.2;
    } else if (entropy < 4.0) {
      score -= 0.2;
    }

    // ── Heuristic 3: pixel variance from raw pixel data ─────────────────────
    if (pixelData && pixelData.length > 0) {
      const variance = this.pixelVariance(pixelData);
      // High variance = natural texture/lighting
      if (variance > 1000) {
        score += 0.2;
      } else if (variance < 200) {
        score -= 0.15;
      }
    }

    const clamped = Math.max(0, Math.min(1, score));
    logger.info('HeuristicProvider: liveness assessment', {
      fileSizeKb: fileSizeKb.toFixed(1),
      entropy: entropy.toFixed(2),
      score: clamped.toFixed(2),
    });

    return clamped;
  }

  private byteEntropy(buffer: Buffer): number {
    const freq = new Float64Array(256).fill(0);
    const sampleSize = Math.min(buffer.length, 8192);
    const step = Math.max(1, Math.floor(buffer.length / sampleSize));

    for (let i = 0; i < buffer.length; i += step) freq[buffer[i]]++;

    const total = freq.reduce((a, b) => a + b, 0) || 1;
    let entropy = 0;
    for (const f of freq) {
      if (f > 0) {
        const p = f / total;
        entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  }

  private pixelVariance(pixels: number[]): number {
    const n = pixels.length;
    if (n === 0) return 0;
    const mean = pixels.reduce((a, b) => a + b, 0) / n;
    const variance = pixels.reduce((sum, p) => sum + (p - mean) ** 2, 0) / n;
    return variance;
  }
}
