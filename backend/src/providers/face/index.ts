import { FaceMatchingProvider } from '../types.js';
import { TensorFlowProvider } from './TensorFlowProvider.js';

export function createFaceProvider(): FaceMatchingProvider {
  const name = process.env.FACE_PROVIDER ?? 'tensorflow';

  switch (name) {
    case 'aws-rekognition':
      throw new Error('AWS Rekognition provider not yet implemented. Set FACE_PROVIDER=tensorflow');
    case 'tensorflow':
    default:
      return new TensorFlowProvider();
  }
}

export { TensorFlowProvider } from './TensorFlowProvider.js';
