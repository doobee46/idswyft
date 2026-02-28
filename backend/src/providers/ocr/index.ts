import { OCRProvider } from '../types.js';
import { TesseractProvider } from './TesseractProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';

export function createOCRProvider(): OCRProvider {
  const name = process.env.OCR_PROVIDER ?? (process.env.OPENAI_API_KEY ? 'openai' : 'tesseract');

  switch (name) {
    case 'openai':
      return new OpenAIProvider();
    case 'azure':
      throw new Error('Azure Vision provider not yet implemented. Set OCR_PROVIDER=openai or OCR_PROVIDER=tesseract');
    case 'aws-textract':
      throw new Error('AWS Textract provider not yet implemented.');
    case 'tesseract':
    default:
      return new TesseractProvider();
  }
}

export { TesseractProvider } from './TesseractProvider.js';
export { OpenAIProvider } from './OpenAIProvider.js';
