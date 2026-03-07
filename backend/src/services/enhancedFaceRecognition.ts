/**
 * Stub for EnhancedFaceRecognitionService.
 * The real implementation requires optional heavy dependencies (TensorFlow, Sharp)
 * that are not bundled by default. Code that imports this should always do so
 * inside a try/catch so callers fall back to lighter heuristics.
 */
export class EnhancedFaceRecognitionService {
  async compareBuffers(_face1: Buffer, _face2: Buffer): Promise<number> {
    throw new Error('EnhancedFaceRecognitionService: optional dependencies not installed');
  }
}
