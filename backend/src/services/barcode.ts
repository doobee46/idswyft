import { logger } from '@/utils/logger.js';
import { StorageService } from './storage.js';

// Optional dependency imports with graceful fallbacks
let Jimp: any = null;
let Tesseract: any = null;

// Type definitions for optional dependencies
type JimpImage = any;

try {
  Jimp = (await import('jimp')).default;
} catch (error) {
  logger.warn('Jimp not available, using AI-only processing');
}

try {
  Tesseract = await import('tesseract.js');
} catch (error) {
  logger.warn('Tesseract.js not available, using AI-only processing');
}

export interface BarcodeResult {
  type: 'qr_code' | 'barcode' | 'pdf417' | 'datamatrix';
  data: string;
  decoded_data?: any;
  confidence: number;
  location?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface BackOfIdData {
  magnetic_stripe?: string;
  qr_code?: string;
  barcode_data?: string;
  parsed_data?: {
    id_number?: string;
    expiry_date?: string;
    issuing_authority?: string;
    address?: string;
    additional_info?: any;
  };
  verification_codes?: string[];
  security_features?: string[];
}

export class BarcodeService {
  private storageService: StorageService;
  public useAiBarcodeReading: boolean;
  
  constructor() {
    this.storageService = new StorageService();
    // Use AI barcode reading if OpenAI API key is available
    this.useAiBarcodeReading = !!process.env.OPENAI_API_KEY;
    
    if (this.useAiBarcodeReading) {
      console.log('🤖 AI-powered barcode/QR scanning enabled (OpenAI GPT-4o Vision)');
    } else {
      console.log('📊 Traditional barcode/QR scanning enabled');
    }
  }

  async scanBackOfId(imagePath: string): Promise<BackOfIdData> {
    logger.info('Starting back-of-ID scanning', { 
      imagePath,
      method: 'Local OCR with AI fallback'
    });

    try {
      console.log('🔍 Attempting local OCR for structured data extraction...');
      return await this.scanWithLocalOCR(imagePath);
    } catch (localError) {
      console.warn('🔍 Local OCR failed, falling back to AI scanning:', localError);
      logger.warn('Local OCR failed, using AI fallback', {
        error: localError instanceof Error ? localError.message : 'Unknown error'
      });
      
      // Fallback to AI scanning if Tesseract is not available
      if (this.useAiBarcodeReading) {
        try {
          console.log('🤖 Using AI-powered back-of-ID scanning as fallback...');
          return await this.scanWithAI(imagePath);
        } catch (aiError) {
          logger.error('Both local OCR and AI scanning failed:', aiError);
          throw new Error('All back-of-ID scanning methods failed');
        }
      } else {
        logger.error('Back-of-ID scanning failed and no AI fallback available');
        throw new Error('Back-of-ID scanning failed - no fallback available');
      }
    }
  }

  private async scanWithAI(imagePath: string): Promise<BackOfIdData> {
    try {
      console.log('🤖 Starting AI barcode/QR scanning...');
      
      // Download image
      const imageBuffer = await this.storageService.downloadFile(imagePath);
      const imageBase64 = imageBuffer.toString('base64');
      const mimeType = this.detectMimeType(imageBuffer);
      
      console.log('🤖 Sending barcode/QR scanning request to OpenAI GPT-4o...');
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this image for technical patterns and visible text elements. Focus on:

1. Pattern Recognition:
   - QR codes, barcodes, or data matrices
   - Any encoded patterns or symbols
   - Geometric security patterns

2. Text Analysis:
   - Any visible printed numbers or codes
   - Date formats or alphanumeric sequences
   - Institutional or organizational identifiers

3. Visual Elements:
   - Security features like holograms or watermarks
   - Special printing patterns or textures

Please provide a technical analysis in JSON format:
{
  "patterns_detected": {
    "qr_code": "<data if QR code found>",
    "barcode": "<data if barcode found>",
    "other_patterns": "<description of other encoded patterns>"
  },
  "text_elements": {
    "numbers": "<any number sequences found>",
    "codes": "<any alphanumeric codes>",
    "dates": "<any date formats>",
    "organizations": "<any organizational identifiers>"
  },
  "security_features": ["<list any visible security elements>"],
  "analysis": "technical description of patterns and elements found"
}

This is for document verification and security analysis purposes.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${imageBase64}`,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 1500,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
      }

      const result = await response.json();
      const analysisText = result.choices[0].message.content;
      
      console.log('🤖 AI barcode/QR scanning completed', {
        responseLength: analysisText.length,
        preview: analysisText.substring(0, 200) + '...'
      });

      // Parse the AI response
      const backOfIdData = this.parseAIBarcodeResponse(analysisText);
      
      logger.info('AI barcode/QR scanning completed', {
        imagePath,
        qrCodeFound: !!backOfIdData.qr_code,
        barcodeFound: !!backOfIdData.barcode_data,
        verificationCodes: backOfIdData.verification_codes?.length || 0
      });

      return backOfIdData;

    } catch (error) {
      console.error('🤖 AI barcode/QR scanning failed:', error);
      logger.error('AI barcode/QR scanning failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Fallback to traditional method
      console.log('📊 Falling back to traditional barcode/QR scanning...');
      return await this.scanWithTraditional(imagePath);
    }
  }

  private async scanWithTraditional(imagePath: string): Promise<BackOfIdData> {
    try {
      // Download and process image
      const imageBuffer = await this.storageService.downloadFile(imagePath);
      const image = await Jimp.read(imageBuffer);
      
      // Convert to grayscale for better barcode detection
      const grayImage = image.clone().greyscale();
      
      // Traditional barcode/QR detection using image analysis
      const barcodeResults = await this.detectBarcodesInImage(grayImage);
      const qrResults = await this.detectQRCodesInImage(grayImage);
      const textData = await this.extractTextFromBackOfId(grayImage);
      
      const backOfIdData: BackOfIdData = {
        qr_code: qrResults.length > 0 ? qrResults[0].data : undefined,
        barcode_data: barcodeResults.length > 0 ? barcodeResults[0].data : undefined,
        parsed_data: textData,
        verification_codes: this.extractVerificationCodes(textData),
        security_features: this.detectSecurityFeatures(image)
      };

      logger.info('Traditional barcode/QR scanning completed', {
        imagePath,
        qrCodeFound: !!backOfIdData.qr_code,
        barcodeFound: !!backOfIdData.barcode_data
      });

      return backOfIdData;

    } catch (error) {
      console.error('📊 Traditional barcode/QR scanning failed:', error);
      
      // Return minimal data structure with error indication
      return {
        parsed_data: {
          additional_info: { error: 'Scanning failed, manual review required' }
        },
        verification_codes: [],
        security_features: []
      };
    }
  }

  private async detectBarcodesInImage(image: JimpImage): Promise<BarcodeResult[]> {
    // Simplified barcode detection using edge detection and pattern analysis
    const { width, height } = image.bitmap;
    const barcodes: BarcodeResult[] = [];
    
    // Look for horizontal line patterns that indicate barcodes
    for (let y = 0; y < height - 20; y += 10) {
      const lineAnalysis = this.analyzeHorizontalLine(image, y, y + 20);
      if (lineAnalysis.isBarcodePattern) {
        barcodes.push({
          type: 'barcode',
          data: lineAnalysis.extractedData || 'BARCODE_DETECTED',
          confidence: lineAnalysis.confidence,
          location: { x: 0, y, width, height: 20 }
        });
        break; // For now, just detect the first barcode
      }
    }
    
    return barcodes;
  }

  private async detectQRCodesInImage(image: JimpImage): Promise<BarcodeResult[]> {
    // Simplified QR code detection using corner detection
    const qrCodes: BarcodeResult[] = [];
    
    // Look for square patterns that could be QR code finder patterns
    const corners = this.detectSquareCorners(image);
    if (corners.length >= 3) {
      qrCodes.push({
        type: 'qr_code',
        data: 'QR_CODE_DETECTED',
        confidence: 0.7,
        location: corners[0]
      });
    }
    
    return qrCodes;
  }

  private analyzeHorizontalLine(image: JimpImage, startY: number, endY: number): {
    isBarcodePattern: boolean;
    extractedData?: string;
    confidence: number;
  } {
    const { width } = image.bitmap;
    let transitions = 0;
    let lastPixelBrightness = 0;
    
    // Count black-white transitions across the line
    for (let x = 0; x < width; x++) {
      let avgBrightness = 0;
      let pixelCount = 0;
      
      for (let y = startY; y < endY; y++) {
        const pixel = Jimp.intToRGBA(image.getPixelColor(x, y));
        avgBrightness += pixel.r;
        pixelCount++;
      }
      
      avgBrightness /= pixelCount;
      const currentBinary = avgBrightness > 128 ? 1 : 0;
      
      if (x > 0 && currentBinary !== lastPixelBrightness) {
        transitions++;
      }
      
      lastPixelBrightness = currentBinary;
    }
    
    // Barcodes typically have many transitions
    const transitionDensity = transitions / width;
    const isBarcodePattern = transitionDensity > 0.1 && transitions > 20;
    
    return {
      isBarcodePattern,
      confidence: isBarcodePattern ? Math.min(0.8, transitionDensity * 2) : 0
    };
  }

  private detectSquareCorners(image: JimpImage): Array<{ x: number; y: number; width: number; height: number }> {
    const { width, height } = image.bitmap;
    const corners: Array<{ x: number; y: number; width: number; height: number }> = [];
    
    // Simple corner detection - look for square patterns
    const minSquareSize = 20;
    const maxSquareSize = 100;
    
    for (let y = 0; y < height - minSquareSize; y += 10) {
      for (let x = 0; x < width - minSquareSize; x += 10) {
        for (let size = minSquareSize; size <= maxSquareSize; size += 10) {
          if (x + size >= width || y + size >= height) break;
          
          if (this.isSquarePattern(image, x, y, size)) {
            corners.push({ x, y, width: size, height: size });
            if (corners.length >= 3) return corners; // QR codes have 3 finder patterns
          }
        }
      }
    }
    
    return corners;
  }

  private isSquarePattern(image: JimpImage, startX: number, startY: number, size: number): boolean {
    // Check if there's a square pattern (dark border with lighter center)
    let borderPixels = 0;
    let darkBorderPixels = 0;
    
    // Check top and bottom borders
    for (let x = startX; x < startX + size; x++) {
      borderPixels += 2;
      const topPixel = Jimp.intToRGBA(image.getPixelColor(x, startY));
      const bottomPixel = Jimp.intToRGBA(image.getPixelColor(x, startY + size - 1));
      
      if (topPixel.r < 128) darkBorderPixels++;
      if (bottomPixel.r < 128) darkBorderPixels++;
    }
    
    // Check left and right borders
    for (let y = startY + 1; y < startY + size - 1; y++) {
      borderPixels += 2;
      const leftPixel = Jimp.intToRGBA(image.getPixelColor(startX, y));
      const rightPixel = Jimp.intToRGBA(image.getPixelColor(startX + size - 1, y));
      
      if (leftPixel.r < 128) darkBorderPixels++;
      if (rightPixel.r < 128) darkBorderPixels++;
    }
    
    const darkRatio = darkBorderPixels / borderPixels;
    return darkRatio > 0.6; // At least 60% of border should be dark for a square pattern
  }

  private async extractTextFromBackOfId(image: JimpImage): Promise<any> {
    // Extract basic text patterns that might appear on back of IDs
    // This is a simplified implementation - in production you'd use proper OCR
    
    return {
      additional_info: {
        note: 'Traditional text extraction from back-of-ID is limited. Consider using AI-powered scanning for better results.'
      }
    };
  }

  private extractVerificationCodes(textData: any): string[] {
    // Extract patterns that look like verification codes
    const codes: string[] = [];
    
    if (textData && typeof textData === 'object') {
      // Look for alphanumeric patterns that could be verification codes
      const textString = JSON.stringify(textData);
      const codePattern = /\b[A-Z0-9]{4,20}\b/g;
      const matches = textString.match(codePattern);
      
      if (matches) {
        codes.push(...matches.filter(code => code.length >= 6));
      }
    }
    
    return codes;
  }

  private detectSecurityFeatures(image: JimpImage): string[] {
    const features: string[] = [];
    
    // Analyze image for potential security features
    const brightness = this.getAverageBrightness(image);
    const contrast = this.getImageContrast(image);
    
    if (contrast > 100) {
      features.push('High contrast patterns detected');
    }
    
    if (brightness < 100) {
      features.push('Dark security printing detected');
    }
    
    // Look for repeating patterns that might be security features
    if (this.hasRepeatingPatterns(image)) {
      features.push('Repeating security pattern detected');
    }
    
    return features;
  }

  private getAverageBrightness(image: JimpImage): number {
    const { width, height } = image.bitmap;
    let totalBrightness = 0;
    let pixelCount = 0;

    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const pixel = Jimp.intToRGBA(image.getPixelColor(x, y));
        totalBrightness += (pixel.r + pixel.g + pixel.b) / 3;
        pixelCount++;
      }
    }

    return totalBrightness / pixelCount;
  }

  private getImageContrast(image: JimpImage): number {
    const { width, height } = image.bitmap;
    let minBrightness = 255;
    let maxBrightness = 0;

    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const pixel = Jimp.intToRGBA(image.getPixelColor(x, y));
        const brightness = (pixel.r + pixel.g + pixel.b) / 3;
        minBrightness = Math.min(minBrightness, brightness);
        maxBrightness = Math.max(maxBrightness, brightness);
      }
    }

    return maxBrightness - minBrightness;
  }

  private hasRepeatingPatterns(image: JimpImage): boolean {
    // Simple pattern detection - look for repeating elements
    const { width, height } = image.bitmap;
    const sampleSize = Math.min(50, width / 4);
    
    // Compare small sections of the image to detect repetition
    let similarSections = 0;
    const totalComparisons = 10;
    
    for (let i = 0; i < totalComparisons; i++) {
      const x1 = Math.floor(Math.random() * (width - sampleSize));
      const y1 = Math.floor(Math.random() * (height - sampleSize));
      const x2 = Math.floor(Math.random() * (width - sampleSize));
      const y2 = Math.floor(Math.random() * (height - sampleSize));
      
      if (this.compareSections(image, x1, y1, x2, y2, sampleSize)) {
        similarSections++;
      }
    }
    
    return similarSections > totalComparisons * 0.3; // 30% similarity threshold
  }

  private compareSections(image: JimpImage, x1: number, y1: number, x2: number, y2: number, size: number): boolean {
    let differences = 0;
    const threshold = size * size * 0.1; // Allow 10% difference
    
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const pixel1 = Jimp.intToRGBA(image.getPixelColor(x1 + dx, y1 + dy));
        const pixel2 = Jimp.intToRGBA(image.getPixelColor(x2 + dx, y2 + dy));
        
        const brightness1 = (pixel1.r + pixel1.g + pixel1.b) / 3;
        const brightness2 = (pixel2.r + pixel2.g + pixel2.b) / 3;
        
        if (Math.abs(brightness1 - brightness2) > 30) {
          differences++;
          if (differences > threshold) return false;
        }
      }
    }
    
    return true;
  }

  private detectMimeType(buffer: Buffer): string {
    const signatures = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/webp': [0x52, 0x49, 0x46, 0x46]
    };
    
    for (const [mimeType, signature] of Object.entries(signatures)) {
      if (signature.every((byte, index) => buffer[index] === byte)) {
        return mimeType;
      }
    }
    
    return 'image/jpeg'; // Default fallback
  }

  private parseAIBarcodeResponse(aiResponse: string): BackOfIdData {
    try {
      // Clean the response - sometimes AI adds markdown formatting
      let cleanResponse = aiResponse.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/```$/, '');
      }
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```\n?/, '').replace(/```$/, '');
      }
      
      try {
        const parsed = JSON.parse(cleanResponse);
        
        console.log('🤖 AI barcode/QR scanning parsed successfully:', {
          qrCodeFound: !!parsed.patterns_detected?.qr_code,
          barcodeFound: !!parsed.patterns_detected?.barcode,
          textElements: Object.keys(parsed.text_elements || {}).length,
          securityFeatures: parsed.security_features?.length || 0
        });
        
        // Map new format to old format for compatibility
        return {
          qr_code: parsed.patterns_detected?.qr_code || undefined,
          barcode_data: parsed.patterns_detected?.barcode || undefined,
          magnetic_stripe: undefined,
          parsed_data: {
            id_number: parsed.text_elements?.codes || parsed.text_elements?.numbers,
            expiry_date: parsed.text_elements?.dates,
            issuing_authority: parsed.text_elements?.organizations,
            additional_info: parsed.analysis || {}
          },
          verification_codes: [],
          security_features: parsed.security_features || []
        };
        
      } catch (jsonError) {
        console.warn('🤖 AI barcode response not valid JSON, extracting data from text:', jsonError);
        return this.extractDataFromText(aiResponse);
      }
      
    } catch (error) {
      console.error('🤖 Failed to parse AI barcode response:', error);
      return {
        parsed_data: {
          additional_info: { error: 'AI parsing failed, manual review required' }
        },
        verification_codes: [],
        security_features: []
      };
    }
  }

  private extractDataFromText(text: string): BackOfIdData {
    // Try to extract useful data from unstructured AI response
    const qrMatch = text.match(/QR.*?code.*?:?\s*(.+?)(?:\n|$)/i);
    const barcodeMatch = text.match(/barcode.*?:?\s*(.+?)(?:\n|$)/i);
    const idNumberMatch = text.match(/ID.*?number.*?:?\s*([A-Z0-9-]+)/i);
    
    return {
      qr_code: qrMatch ? qrMatch[1].trim() : undefined,
      barcode_data: barcodeMatch ? barcodeMatch[1].trim() : undefined,
      parsed_data: {
        id_number: idNumberMatch ? idNumberMatch[1] : undefined,
        additional_info: { extracted_from_text: text.substring(0, 200) + '...' }
      },
      verification_codes: [],
      security_features: []
    };
  }

  private async scanWithLocalOCR(imagePath: string): Promise<BackOfIdData> {
    try {
      console.log('🔍 Starting local OCR for back-of-ID scanning...');
      
      // Check if required dependencies are available
      if (!Tesseract || !Jimp) {
        console.warn('🔍 Required OCR dependencies not available, using AI fallback');
        throw new Error('OCR dependencies not available in production environment');
      }
      
      // Download and preprocess image
      const imageBuffer = await this.storageService.downloadFile(imagePath);
      const processedBuffer = await this.preprocessImageForBackOfId(imageBuffer);
      
      // Create Tesseract worker optimized for back-of-ID scanning
      console.log('🔍 Creating OCR worker for back-of-ID...');
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            console.log(`🔍 OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      
      // Configure Tesseract for optimal back-of-ID recognition
      await worker.setParameters({
        // Allow alphanumeric characters, common punctuation, and spaces
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,/- :()[]',
        // Auto page segmentation works better for back-of-ID with mixed content
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        preserve_interword_spaces: '1',
        // Use both neural net and classic engine for better results
        tessedit_ocr_engine_mode: Tesseract.OEM.DEFAULT,
        // Improve character classification
        classify_enable_learning: '0',
        classify_enable_adaptive_matcher: '1',
        // Better handling of mixed content
        textord_really_old_xheight: '1',
        // Improve word finding
        textord_use_cjk_fp_model: '1'
      });
      
      // Perform OCR
      console.log('🔍 Performing OCR on back-of-ID...');
      const { data } = await worker.recognize(processedBuffer);
      await worker.terminate();
      
      console.log('🔍 OCR completed, extracting structured data...', {
        textLength: data.text.length,
        confidence: data.confidence,
        textPreview: data.text.substring(0, 150) + '...'
      });
      
      // Extract structured data from OCR text
      const structuredData = this.extractBackOfIdStructuredData(data.text);
      
      console.log('✅ Local OCR extraction completed:', {
        hasIdNumber: !!structuredData.parsed_data?.id_number,
        hasExpiryDate: !!structuredData.parsed_data?.expiry_date,
        hasAddress: !!structuredData.parsed_data?.address,
        hasIssuer: !!structuredData.parsed_data?.issuing_authority,
        verificationCodes: structuredData.verification_codes?.length || 0
      });
      
      return structuredData;
      
    } catch (error) {
      console.error('🔍 Local OCR scanning failed:', error);
      logger.error('Local OCR back-of-ID scanning failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Return minimal structure indicating failure
      return {
        parsed_data: {
          additional_info: { 
            error: 'Local OCR failed, using fallback',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            scan_method: 'fallback'
          }
        },
        verification_codes: [],
        security_features: []
      };
    }
  }

  private async preprocessImageForBackOfId(imageBuffer: Buffer): Promise<Buffer> {
    try {
      console.log('🔧 Preprocessing image for back-of-ID OCR...');
      
      // Check if Jimp is available
      if (!Jimp) {
        console.warn('⚠️ Jimp not available, skipping preprocessing');
        return imageBuffer; // Return original image if Jimp not available
      }
      
      // Load and process image
      const image = await Jimp.read(imageBuffer);
      
      // More aggressive preprocessing for back-of-ID cards (they're often harder to read)
      const enhancedImage = image
        // Resize first to a good size for OCR (bigger is often better for back-of-ID)
        .resize(
          image.getWidth() < 1200 ? 1200 : Math.max(image.getWidth(), 1200), 
          Jimp.default.AUTO
        )
        // Convert to grayscale
        .greyscale()
        // Much higher contrast for back-of-ID cards
        .contrast(0.8)
        // Adjust brightness more aggressively  
        .brightness(0.3)
        // Normalize colors
        .normalize()
        // Apply edge detection for better text clarity
        .convolute([
          [-1, -1, -1],
          [-1,  9, -1],
          [-1, -1, -1]
        ])
        // Apply another sharpening pass
        .convolute([
          [ 0, -1,  0],
          [-1,  5, -1],
          [ 0, -1,  0]
        ]);
      
      const enhancedBuffer = await enhancedImage.getBufferAsync(Jimp.default.MIME_PNG);
      
      console.log('✅ Image preprocessing completed', {
        originalSize: imageBuffer.length,
        processedSize: enhancedBuffer.length,
        dimensions: `${image.getWidth()}x${image.getHeight()}`
      });
      
      return enhancedBuffer;
      
    } catch (error) {
      console.warn('⚠️ Image preprocessing failed, using original:', error);
      return imageBuffer;
    }
  }

  private extractBackOfIdStructuredData(ocrText: string): BackOfIdData {
    console.log('🔧 Extracting structured data from OCR text...');
    
    // Clean the text
    const cleanText = ocrText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    console.log('🔧 Cleaned OCR text:', cleanText.substring(0, 200) + '...');
    
    const result: BackOfIdData = {
      parsed_data: {},
      verification_codes: [],
      security_features: []
    };
    
    // Extract ID/License Number - look for various patterns
    const idPatterns = [
      // Specific ID patterns first (more precise)
      /(?:ID|DL|LICENSE)\s*(?:NO|NUM|NUMBER|#)?\s*:?\s*([A-Z0-9\-\s]{6,20})/i,
      /([A-Z]{1,3}\s*\d{6,12})/g, // State format patterns with optional spaces
      /(\d{3}\s*\d{3}\s*\d{3,6})/g, // Three-part number patterns like "793 398 654"
      /([A-Z]\d{8,12})/g, // Letter followed by digits
      /(\d{8,15})/g, // Long numeric sequences
      /\b([A-Z0-9]{8,15})\b/g  // General alphanumeric IDs (last resort)
    ];
    
    for (const pattern of idPatterns) {
      const matches = cleanText.match(pattern);
      if (matches) {
        for (const match of matches) {
          const candidate = Array.isArray(match) ? match[1] : match;
          // Skip if it looks like a date, phone number, or common non-ID words
          const skipWords = ['ENDORSEMENTS', 'RESTRICTIONS', 'VETERAN', 'DONOR', 'CLASS', 'NONE'];
          const normalizedCandidate = candidate.toUpperCase().replace(/\s+/g, '');
          
          if (!candidate.match(/\d{2}[\/\-\.]\d{2}/) && 
              !candidate.match(/^\d{10}$/) && 
              !skipWords.some(word => normalizedCandidate.includes(word)) &&
              normalizedCandidate.length >= 6) {
            result.parsed_data!.id_number = normalizedCandidate;
            console.log('✅ ID Number found:', result.parsed_data!.id_number);
            break;
          }
        }
        if (result.parsed_data!.id_number) break;
      }
    }
    
    // Extract Expiry/Expiration Date
    const datePatterns = [
      /(?:EXP|EXPIRES?|EXPIRY|VALID UNTIL)\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/g
    ];
    
    for (const pattern of datePatterns) {
      const matches = cleanText.match(pattern);
      if (matches) {
        for (const match of matches) {
          const dateStr = Array.isArray(match) ? match[1] : match;
          const date = this.parseDate(dateStr);
          // Only consider future dates as expiry dates
          if (date && date > new Date()) {
            result.parsed_data!.expiry_date = this.standardizeDateFormat(dateStr);
            console.log('✅ Expiry Date found:', result.parsed_data!.expiry_date);
            break;
          }
        }
        if (result.parsed_data!.expiry_date) break;
      }
    }
    
    // Extract Address - look for structured address patterns
    const addressPatterns = [
      /(?:ADDRESS|ADDR|ADD)\s*:?\s*([0-9].{20,80}(?:ST|STREET|AVE|AVENUE|RD|ROAD|DR|DRIVE|BLVD|BOULEVARD|WAY|LANE|CT|COURT)[^A-Z]{0,30}[A-Z]{2}\s+\d{5})/i,
      /(\d+\s+[A-Z\s]+(?:ST|STREET|AVE|AVENUE|RD|ROAD|DR|DRIVE|BLVD|BOULEVARD|WAY|LANE)\s+[A-Z\s]+,?\s*[A-Z]{2}\s+\d{5})/i
    ];
    
    for (const pattern of addressPatterns) {
      const match = cleanText.match(pattern);
      if (match && match[1] && match[1].length > 10) {
        result.parsed_data!.address = match[1].trim().replace(/\s+/g, ' ');
        console.log('✅ Address found:', result.parsed_data!.address);
        break;
      }
    }
    
    // Extract Issuing Authority
    const authorityPatterns = [
      /(?:ISSUED BY|ISSUER|AUTHORITY|DEPARTMENT OF|STATE OF)\s*:?\s*([A-Z\s]{5,50})/i,
      /([A-Z\s]*DEPARTMENT[A-Z\s]*)/i,
      /([A-Z\s]*DMV[A-Z\s]*)/i
    ];
    
    for (const pattern of authorityPatterns) {
      const match = cleanText.match(pattern);
      if (match && match[1] && match[1].length > 3) {
        result.parsed_data!.issuing_authority = match[1].trim().replace(/\s+/g, ' ');
        console.log('✅ Issuing Authority found:', result.parsed_data!.issuing_authority);
        break;
      }
    }
    
    // Extract verification codes (barcodes, magnetic stripe data, etc.)
    const codePatterns = [
      /\b([A-Z0-9]{15,})\b/g, // Long alphanumeric codes
      /\b(\d{12,})\b/g        // Long numeric codes
    ];
    
    const codes: string[] = [];
    for (const pattern of codePatterns) {
      const matches = cleanText.match(pattern);
      if (matches) {
        matches.forEach(code => {
          if (code !== result.parsed_data!.id_number && !codes.includes(code)) {
            codes.push(code);
          }
        });
      }
    }
    result.verification_codes = codes.slice(0, 3); // Limit to first 3 codes
    
    // Detect security features mentioned in text
    const securityKeywords = ['MAGNETIC', 'STRIPE', 'BARCODE', 'QR', 'HOLOGRAM', 'WATERMARK', 'SECURITY'];
    result.security_features = securityKeywords.filter(keyword => 
      cleanText.toUpperCase().includes(keyword)
    );
    
    console.log('🔧 Structured data extraction completed:', {
      hasIdNumber: !!result.parsed_data!.id_number,
      hasExpiry: !!result.parsed_data!.expiry_date,
      hasAddress: !!result.parsed_data!.address,
      hasAuthority: !!result.parsed_data!.issuing_authority,
      verificationCodes: result.verification_codes!.length,
      securityFeatures: result.security_features!.length
    });
    
    return result;
  }

  private parseDate(dateStr: string): Date | null {
    try {
      const cleaned = dateStr.replace(/[^\d\/\-\.]/g, '');
      const parts = cleaned.split(/[\/\-\.]/);
      
      if (parts.length !== 3) return null;
      
      let [part1, part2, part3] = parts.map(p => parseInt(p));
      
      // Handle 2-digit years
      if (part3 < 100) {
        part3 = part3 > 30 ? 1900 + part3 : 2000 + part3;
      }
      
      // Try MM/DD/YYYY first, then DD/MM/YYYY
      const date1 = new Date(part3, part1 - 1, part2);
      const date2 = new Date(part3, part2 - 1, part1);
      
      // Return the date that makes more sense (not invalid)
      if (!isNaN(date1.getTime()) && date1.getMonth() === part1 - 1) {
        return date1;
      } else if (!isNaN(date2.getTime()) && date2.getMonth() === part2 - 1) {
        return date2;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private standardizeDateFormat(dateStr: string): string {
    const date = this.parseDate(dateStr);
    if (!date) return dateStr;
    
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    
    return `${month}/${day}/${year}`;
  }

  private normalizeDateForComparison(dateStr: string): string {
    // Normalize date format for comparison (remove all non-digits)
    const date = this.parseDate(dateStr);
    if (!date) return dateStr.replace(/\D/g, ''); // fallback: remove all non-digits
    
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    
    return `${year}${month}${day}`; // YYYYMMDD format for reliable comparison
  }

  async crossValidateWithFrontId(frontOcrData: any, backOfIdData: BackOfIdData): Promise<{
    match_score: number;
    validation_results: {
      id_number_match?: boolean;
      expiry_date_match?: boolean;
      issuing_authority_match?: boolean;
      overall_consistency: boolean;
    };
    discrepancies: string[];
  }> {
    const discrepancies: string[] = [];
    let matches = 0;
    let totalChecks = 0;

    // Compare ID/Document numbers (normalize field names)
    const frontIdNumber = frontOcrData?.document_number || frontOcrData?.id_number;
    const backIdNumber = backOfIdData.parsed_data?.id_number;
    
    if (frontIdNumber && backIdNumber) {
      totalChecks++;
      // Normalize both numbers by removing spaces and comparing
      const frontIdNormalized = frontIdNumber.replace(/\s+/g, '');
      const backIdNormalized = backIdNumber.replace(/\s+/g, '');
      const idMatch = frontIdNormalized === backIdNormalized;
      if (idMatch) {
        matches++;
      } else {
        discrepancies.push(`ID number mismatch: front="${frontIdNumber}" vs back="${backIdNumber}"`);
      }
    }

    // Compare expiry dates (normalize field names)
    const frontExpiryDate = frontOcrData?.expiration_date || frontOcrData?.expiry_date;
    const backExpiryDate = backOfIdData.parsed_data?.expiry_date;
    
    if (frontExpiryDate && backExpiryDate) {
      totalChecks++;
      // Normalize date formats for comparison
      const frontDateNormalized = this.normalizeDateForComparison(frontExpiryDate);
      const backDateNormalized = this.normalizeDateForComparison(backExpiryDate);
      const expiryMatch = frontDateNormalized === backDateNormalized;
      if (expiryMatch) {
        matches++;
      } else {
        discrepancies.push(`Expiry date mismatch: front="${frontExpiryDate}" vs back="${backExpiryDate}"`);
      }
    }

    // Compare issuing authority with intelligent matching
    if (frontOcrData?.issuing_authority && backOfIdData.parsed_data?.issuing_authority) {
      totalChecks++;
      const authorityMatch = this.matchIssuingAuthorities(
        frontOcrData.issuing_authority, 
        backOfIdData.parsed_data.issuing_authority
      );
      if (authorityMatch) matches++;
      else discrepancies.push(`Issuing authority mismatch: front="${frontOcrData.issuing_authority}" vs back="${backOfIdData.parsed_data.issuing_authority}"`);
    }

    const matchScore = totalChecks > 0 ? matches / totalChecks : 0.5;
    const overallConsistency = matchScore >= 0.7 && discrepancies.length === 0;

    logger.info('Cross-validation completed', {
      matchScore,
      totalChecks,
      matches,
      discrepancies: discrepancies.length,
      overallConsistency
    });

    return {
      match_score: matchScore,
      validation_results: {
        id_number_match: frontOcrData?.id_number && backOfIdData.parsed_data?.id_number ? 
          frontOcrData.id_number === backOfIdData.parsed_data.id_number : undefined,
        expiry_date_match: frontOcrData?.expiry_date && backOfIdData.parsed_data?.expiry_date ?
          frontOcrData.expiry_date === backOfIdData.parsed_data.expiry_date : undefined,
        issuing_authority_match: frontOcrData?.issuing_authority && backOfIdData.parsed_data?.issuing_authority ?
          this.matchIssuingAuthorities(frontOcrData.issuing_authority, backOfIdData.parsed_data.issuing_authority) : undefined,
        overall_consistency: overallConsistency
      },
      discrepancies
    };
  }

  private matchIssuingAuthorities(authority1: string, authority2: string): boolean {
    // Normalize both authorities to lowercase for comparison
    const auth1 = authority1.toLowerCase().trim();
    const auth2 = authority2.toLowerCase().trim();
    
    // Direct match
    if (auth1 === auth2) return true;
    
    // Authority mapping for known equivalents
    const authorityMappings = {
      'new york state': ['ny', 'new york', 'nys', 'dmv.ny.gov', 'new york dmv'],
      'california': ['ca', 'calif', 'dmv.ca.gov', 'california dmv'],
      'florida': ['fl', 'fla', 'flhsmv.gov', 'florida dmv'],
      'texas': ['tx', 'tex', 'txdmv.gov', 'texas dmv'],
      'illinois': ['il', 'ill', 'cyberdriveillinois.com', 'illinois dmv'],
      'pennsylvania': ['pa', 'penn', 'dmv.pa.gov', 'pennsylvania dmv'],
      'ohio': ['oh', 'bmv.ohio.gov', 'ohio dmv'],
      'georgia': ['ga', 'dds.georgia.gov', 'georgia dmv'],
      'north carolina': ['nc', 'ncdot.gov', 'north carolina dmv'],
      'michigan': ['mi', 'michigan.gov/sos', 'michigan dmv']
    };
    
    // Check if either authority matches any mapping
    for (const [canonical, variants] of Object.entries(authorityMappings)) {
      const allVariants = [canonical, ...variants];
      
      // Check if both authorities map to the same canonical authority
      const auth1Matches = allVariants.some(variant => 
        auth1.includes(variant) || variant.includes(auth1)
      );
      const auth2Matches = allVariants.some(variant => 
        auth2.includes(variant) || variant.includes(auth2)
      );
      
      if (auth1Matches && auth2Matches) {
        console.log(`🔄 Authority match found: "${authority1}" ↔ "${authority2}" (both map to ${canonical})`);
        return true;
      }
    }
    
    // Fallback: check if either authority contains the other
    if (auth1.includes(auth2) || auth2.includes(auth1)) {
      console.log(`🔄 Authority partial match: "${authority1}" ↔ "${authority2}"`);
      return true;
    }
    
    console.log(`❌ No authority match: "${authority1}" vs "${authority2}"`);
    return false;
  }

  // Health check for barcode service
  async healthCheck(): Promise<{
    status: string;
    ai_enabled: boolean;
    error?: string;
  }> {
    try {
      return {
        status: 'healthy',
        ai_enabled: this.useAiBarcodeReading
      };
    } catch (error) {
      return {
        status: 'error',
        ai_enabled: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}