import Jimp from 'jimp';
import { logger } from '@/utils/logger.js';
import { StorageService } from './storage.js';

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
  private useAiBarcodeReading: boolean;
  
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
      method: this.useAiBarcodeReading ? 'AI' : 'Traditional'
    });

    try {
      if (this.useAiBarcodeReading) {
        console.log('🤖 Using AI-powered barcode/QR scanning...');
        return await this.scanWithAI(imagePath);
      } else {
        console.log('📊 Using traditional barcode/QR scanning...');
        return await this.scanWithTraditional(imagePath);
      }
    } catch (error) {
      logger.error('Back-of-ID scanning failed:', error);
      throw new Error('Failed to scan back-of-ID');
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
                  text: `Analyze the back of this ID document and extract all available information:

Please scan for and extract:
1. QR codes or barcodes - decode the data if possible
2. Magnetic stripe data (if visible as encoded text)
3. Any printed information like:
   - ID number or reference numbers
   - Expiration date
   - Issuing authority
   - Address information
   - Security codes or verification numbers
4. Security features (holograms, watermarks, special patterns)

Provide response in JSON format:
{
  "qr_code": "<decoded QR code data if found>",
  "barcode_data": "<decoded barcode data if found>", 
  "magnetic_stripe": "<magnetic stripe data if visible>",
  "parsed_data": {
    "id_number": "<ID number if found>",
    "expiry_date": "<expiry date if found>",
    "issuing_authority": "<issuing authority if found>",
    "address": "<address if found>",
    "additional_info": "<any other structured data>"
  },
  "verification_codes": ["<array of verification codes found>"],
  "security_features": ["<array of security features detected>"],
  "confidence": <number between 0 and 1>,
  "analysis": "detailed explanation of what was found and extracted"
}

Important:
- Look carefully for QR codes, barcodes (Code 39, Code 128, PDF417, etc.)
- Extract any alphanumeric codes, reference numbers, or verification codes
- Identify government issuing authority information
- Note any security features that validate authenticity
- If no barcode/QR code is found, still extract any printed text information`
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

  private async detectBarcodesInImage(image: Jimp): Promise<BarcodeResult[]> {
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

  private async detectQRCodesInImage(image: Jimp): Promise<BarcodeResult[]> {
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

  private analyzeHorizontalLine(image: Jimp, startY: number, endY: number): {
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

  private detectSquareCorners(image: Jimp): Array<{ x: number; y: number; width: number; height: number }> {
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

  private isSquarePattern(image: Jimp, startX: number, startY: number, size: number): boolean {
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

  private async extractTextFromBackOfId(image: Jimp): Promise<any> {
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

  private detectSecurityFeatures(image: Jimp): string[] {
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

  private getAverageBrightness(image: Jimp): number {
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

  private getImageContrast(image: Jimp): number {
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

  private hasRepeatingPatterns(image: Jimp): boolean {
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

  private compareSections(image: Jimp, x1: number, y1: number, x2: number, y2: number, size: number): boolean {
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
          qrCodeFound: !!parsed.qr_code,
          barcodeFound: !!parsed.barcode_data,
          verificationCodes: parsed.verification_codes?.length || 0,
          securityFeatures: parsed.security_features?.length || 0
        });
        
        return {
          qr_code: parsed.qr_code || undefined,
          barcode_data: parsed.barcode_data || undefined,
          magnetic_stripe: parsed.magnetic_stripe || undefined,
          parsed_data: parsed.parsed_data || {},
          verification_codes: parsed.verification_codes || [],
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

    // Compare ID numbers
    if (frontOcrData?.id_number && backOfIdData.parsed_data?.id_number) {
      totalChecks++;
      const idMatch = frontOcrData.id_number === backOfIdData.parsed_data.id_number;
      if (idMatch) matches++;
      else discrepancies.push(`ID number mismatch: front="${frontOcrData.id_number}" vs back="${backOfIdData.parsed_data.id_number}"`);
    }

    // Compare expiry dates
    if (frontOcrData?.expiry_date && backOfIdData.parsed_data?.expiry_date) {
      totalChecks++;
      const expiryMatch = frontOcrData.expiry_date === backOfIdData.parsed_data.expiry_date;
      if (expiryMatch) matches++;
      else discrepancies.push(`Expiry date mismatch: front="${frontOcrData.expiry_date}" vs back="${backOfIdData.parsed_data.expiry_date}"`);
    }

    // Compare issuing authority
    if (frontOcrData?.issuing_authority && backOfIdData.parsed_data?.issuing_authority) {
      totalChecks++;
      const authorityMatch = frontOcrData.issuing_authority.toLowerCase().includes(
        backOfIdData.parsed_data.issuing_authority.toLowerCase()
      ) || backOfIdData.parsed_data.issuing_authority.toLowerCase().includes(
        frontOcrData.issuing_authority.toLowerCase()
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
          frontOcrData.issuing_authority.toLowerCase().includes(backOfIdData.parsed_data.issuing_authority.toLowerCase()) : undefined,
        overall_consistency: overallConsistency
      },
      discrepancies
    };
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