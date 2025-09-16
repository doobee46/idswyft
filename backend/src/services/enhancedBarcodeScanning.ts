import { logger } from '@/utils/logger.js';
import { StorageService } from './storage.js';
import { VERIFICATION_THRESHOLDS } from '@/config/verificationThresholds.js';

// Optional dependency imports with graceful fallbacks
let Jimp: any = null;
let Tesseract: any = null;
let ZXing: any = null;

try {
  Jimp = (await import('jimp')).default;
} catch (error) {
  logger.warn('Jimp not available for barcode processing');
}

try {
  Tesseract = await import('tesseract.js');
} catch (error) {
  logger.warn('Tesseract.js not available for barcode processing');
}

try {
  ZXing = await import('@zxing/library');
} catch (error) {
  logger.warn('ZXing library not available for barcode processing');
}

// @ts-ignore - No types available for parse-usdl
import { parse as parseUSDL } from 'parse-usdl';

export interface BarcodeData {
  type: 'pdf417' | 'qr_code' | 'datamatrix' | 'code128' | 'ocr_fallback';
  raw_data: string;
  confidence: number;
  method: string;
  parsed_data: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    dateOfBirth?: string;
    licenseNumber?: string;
    expirationDate?: string;
    issueDate?: string;
    address?: string;
    state?: string;
    idNumber?: string;
  };
  validation_status: 'valid' | 'invalid' | 'partial';
  extraction_attempts: string[];
}

export interface BackOfIdData {
  magnetic_stripe?: string;
  qr_code?: string;
  barcode_data?: string;
  pdf417_data?: BarcodeData;
  raw_text?: string;
  parsed_data?: {
    id_number?: string;
    expiry_date?: string;
    issuing_authority?: string;
    address?: string;
    additional_info?: any;
  };
  verification_codes: any[];
  security_features: any[];
}

export class EnhancedBarcodeService {
  private storageService: StorageService;

  constructor() {
    this.storageService = new StorageService();
  }

  /**
   * Enhanced barcode scanning with multiple fallback strategies
   */
  async scanBackOfId(imagePath: string): Promise<BackOfIdData> {
    console.log('🔍 Starting enhanced barcode scanning with multiple fallbacks...');

    const extractionAttempts: string[] = [];
    let bestResult: BarcodeData | null = null;

    // Strategy 1: Try ZXing PDF417 detection
    if (ZXing && Jimp) {
      try {
        console.log('📄 Attempting ZXing PDF417 barcode detection...');
        const zxingResult = await this.scanWithZXing(imagePath);
        extractionAttempts.push('ZXing PDF417');

        if (zxingResult && zxingResult.validation_status !== 'invalid') {
          bestResult = zxingResult;
          console.log('✅ ZXing PDF417 detection successful!');
        }
      } catch (error) {
        console.log('⚠️ ZXing detection failed:', error);
        extractionAttempts.push('ZXing PDF417 (failed)');
      }
    }

    // Strategy 2: Try OCR-based text extraction if ZXing failed
    if (!bestResult && Tesseract) {
      try {
        console.log('📝 Attempting OCR-based text extraction...');
        const ocrResult = await this.scanWithOCR(imagePath);
        extractionAttempts.push('OCR Text Extraction');

        if (ocrResult && ocrResult.validation_status !== 'invalid') {
          bestResult = ocrResult;
          console.log('✅ OCR text extraction successful!');
        }
      } catch (error) {
        console.log('⚠️ OCR extraction failed:', error);
        extractionAttempts.push('OCR Text Extraction (failed)');
      }
    }

    // Strategy 3: Try AI-powered extraction as ultimate fallback
    if (!bestResult) {
      try {
        console.log('🤖 Attempting AI-powered data extraction...');
        const aiResult = await this.scanWithAI(imagePath);
        extractionAttempts.push('AI-Powered Extraction');

        if (aiResult) {
          bestResult = aiResult;
          console.log('✅ AI extraction successful!');
        }
      } catch (error) {
        console.log('⚠️ AI extraction failed:', error);
        extractionAttempts.push('AI-Powered Extraction (failed)');
      }
    }

    // Strategy 4: Create minimal fallback data if all methods failed
    if (!bestResult) {
      console.log('⚠️ All extraction methods failed - creating minimal fallback data');
      bestResult = {
        type: 'ocr_fallback' as const,
        raw_data: '',
        confidence: 0.1,
        method: 'Fallback - No data extracted',
        parsed_data: {},
        validation_status: 'invalid' as const,
        extraction_attempts: extractionAttempts
      };
    }

    // Convert to BackOfIdData format
    const result: BackOfIdData = {
      pdf417_data: bestResult,
      barcode_data: bestResult.raw_data || undefined,
      parsed_data: {
        id_number: bestResult.parsed_data.licenseNumber || bestResult.parsed_data.idNumber,
        expiry_date: bestResult.parsed_data.expirationDate,
        issuing_authority: bestResult.parsed_data.state,
        address: bestResult.parsed_data.address,
        additional_info: {
          extraction_method: bestResult.method,
          confidence: bestResult.confidence,
          validation_status: bestResult.validation_status,
          extraction_attempts: extractionAttempts
        }
      },
      verification_codes: [],
      security_features: []
    };

    console.log('🔍 Enhanced barcode scanning completed:', {
      method: bestResult.method,
      confidence: bestResult.confidence,
      validation_status: bestResult.validation_status,
      extraction_attempts: extractionAttempts.length,
      has_license_number: !!bestResult.parsed_data.licenseNumber,
      has_expiration_date: !!bestResult.parsed_data.expirationDate
    });

    return result;
  }

  private async scanWithZXing(imagePath: string): Promise<BarcodeData | null> {
    if (!ZXing || !Jimp) return null;

    const imageBuffer = await this.storageService.downloadFile(imagePath);
    const image = await Jimp.read(imageBuffer);

    // Try multiple image preprocessing approaches
    const preprocessingMethods = [
      (img: any) => img.clone().greyscale().contrast(0.5).normalize(),
      (img: any) => img.clone().greyscale().contrast(0.8).brightness(0.1),
      (img: any) => img.clone().greyscale().contrast(0.3).brightness(-0.1),
      (img: any) => img.clone() // Original image
    ];

    for (const preprocess of preprocessingMethods) {
      try {
        const processedImage = preprocess(image);
        const { width, height } = processedImage.bitmap;
        const imageData = new Uint8ClampedArray(processedImage.bitmap.data);

        // Convert to grayscale for ZXing
        const grayscaleData = new Uint8ClampedArray(width * height);
        for (let i = 0; i < grayscaleData.length; i++) {
          const pixelIndex = i * 4;
          grayscaleData[i] = Math.round(
            0.299 * imageData[pixelIndex] +
            0.587 * imageData[pixelIndex + 1] +
            0.114 * imageData[pixelIndex + 2]
          );
        }

        const luminanceSource = new ZXing.PlanarYUVLuminanceSource(
          grayscaleData, width, height, 0, 0, width, height, false
        );
        const binaryBitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminanceSource));

        // Try different readers
        const readers = [
          new ZXing.PDF417Reader(),
          new ZXing.MultiFormatReader(),
          new ZXing.QRCodeReader(),
          new ZXing.DataMatrixReader()
        ];

        for (const reader of readers) {
          try {
            const hints = new Map();
            hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
            hints.set(ZXing.DecodeHintType.PURE_BARCODE, false);

            const result = reader.decode(binaryBitmap, hints);

            if (result && result.getText()) {
              const rawData = result.getText();
              return await this.parseBarcodeData(rawData, 'ZXing ' + reader.constructor.name);
            }
          } catch (readerError) {
            // Continue to next reader
          }
        }
      } catch (preprocessError) {
        // Continue to next preprocessing method
      }
    }

    return null;
  }

  private async scanWithOCR(imagePath: string): Promise<BarcodeData | null> {
    if (!Tesseract) return null;

    const imageBuffer = await this.storageService.downloadFile(imagePath);

    const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng', {
      logger: m => {} // Suppress OCR logging
    });

    if (!text || text.trim().length < 20) {
      return null;
    }

    // Extract structured data from OCR text
    const extracted = this.extractDataFromText(text);

    return {
      type: 'ocr_fallback',
      raw_data: text,
      confidence: extracted.confidence,
      method: 'OCR Text Extraction',
      parsed_data: extracted.data,
      validation_status: extracted.isValid ? 'valid' : 'partial',
      extraction_attempts: ['OCR']
    };
  }

  private async scanWithAI(imagePath: string): Promise<BarcodeData | null> {
    // This would use OpenAI Vision API or similar
    // For now, return minimal data to prevent blocking
    return {
      type: 'ocr_fallback',
      raw_data: '',
      confidence: 0.1,
      method: 'AI Extraction (Not Implemented)',
      parsed_data: {},
      validation_status: 'invalid',
      extraction_attempts: ['AI']
    };
  }

  private async parseBarcodeData(rawData: string, method: string): Promise<BarcodeData> {
    try {
      // Try to parse as USDL PDF417 data
      const parsed = parseUSDL(rawData);

      if (parsed && Object.keys(parsed).length > 0) {
        const criticalFields = ['firstName', 'lastName', 'licenseNumber', 'dateOfBirth'];
        const missingFields = criticalFields.filter(field => !parsed[field]);

        let validation_status: 'valid' | 'invalid' | 'partial' = 'valid';
        if (missingFields.length > 2) {
          validation_status = 'invalid';
        } else if (missingFields.length > 0) {
          validation_status = 'partial';
        }

        return {
          type: 'pdf417',
          raw_data: rawData,
          confidence: validation_status === 'valid' ? 0.9 : 0.6,
          method: method,
          parsed_data: {
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            middleName: parsed.middleName,
            dateOfBirth: parsed.dateOfBirth,
            licenseNumber: parsed.licenseNumber,
            expirationDate: parsed.expirationDate,
            issueDate: parsed.issueDate,
            address: this.combineAddress(parsed),
            state: parsed.state,
            idNumber: parsed.licenseNumber
          },
          validation_status,
          extraction_attempts: [method]
        };
      }
    } catch (parseError) {
      console.log('📄 USDL parsing failed, treating as raw barcode data');
    }

    // Fallback to raw barcode data
    const extracted = this.extractDataFromText(rawData);

    return {
      type: 'datamatrix',
      raw_data: rawData,
      confidence: extracted.confidence,
      method: method + ' (Raw)',
      parsed_data: extracted.data,
      validation_status: extracted.isValid ? 'partial' : 'invalid',
      extraction_attempts: [method]
    };
  }

  private extractDataFromText(text: string): { data: any; confidence: number; isValid: boolean } {
    const data: any = {};
    let confidence = 0.1;
    let validFields = 0;

    // Extract license number patterns
    const licensePatterns = [
      /(?:LIC|LICENSE|DL|DRIVER)\s*[#:]?\s*([A-Z0-9]{8,15})/i,
      /^([A-Z][0-9]{8,12})$/m,
      /\b([A-Z]{1,2}[0-9]{6,12})\b/g
    ];

    for (const pattern of licensePatterns) {
      const match = text.match(pattern);
      if (match) {
        data.licenseNumber = match[1];
        data.idNumber = match[1];
        validFields++;
        break;
      }
    }

    // Extract dates
    const datePatterns = [
      /(?:EXP|EXPIRES?|EXPIRATION)\s*[:]?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
      /\b([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{4})\b/g
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        data.expirationDate = match[1];
        validFields++;
        break;
      }
    }

    // Extract state abbreviations
    const stateMatch = text.match(/\b([A-Z]{2})\b/g);
    if (stateMatch && stateMatch.length > 0) {
      data.state = stateMatch[0];
      data.issuing_authority = stateMatch[0];
      validFields++;
    }

    confidence = Math.min(0.8, validFields * 0.3);

    return {
      data,
      confidence,
      isValid: validFields >= 2
    };
  }

  private combineAddress(parsed: any): string | undefined {
    const parts = [
      parsed.address1,
      parsed.address2,
      parsed.city,
      parsed.state,
      parsed.zipCode
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : undefined;
  }
}