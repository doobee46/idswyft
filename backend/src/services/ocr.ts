import Tesseract from 'tesseract.js';
import { logger } from '@/utils/logger.js';
import { StorageService } from './storage.js';
import { VerificationService } from './verification.js';
import config from '@/config/index.js';
import { OCRData } from '@/types/index.js';
import Jimp from 'jimp';

export class OCRService {
  private storageService: StorageService;
  private verificationService: VerificationService;
  private useAiOcr: boolean;
  
  constructor() {
    this.storageService = new StorageService();
    this.verificationService = new VerificationService();
    // Use AI OCR if OpenAI API key is available, fallback to Tesseract
    this.useAiOcr = !!process.env.OPENAI_API_KEY;
    
    if (this.useAiOcr) {
      console.log('🤖 AI-powered OCR enabled (OpenAI GPT-4 Vision)');
    } else {
      console.log('🔍 Traditional OCR enabled (Tesseract.js)');
    }
  }
  
  async processDocument(
    documentId: string,
    filePath: string,
    documentType: string
  ): Promise<OCRData> {
    console.log('🔍 Starting OCR processing...', {
      documentId,
      filePath,
      documentType
    });
    
    logger.info('Starting OCR processing', {
      documentId,
      filePath,
      documentType
    });
    
    try {
      // Download the file
      console.log('🔍 Downloading file for OCR...', { filePath });
      const fileBuffer = await this.storageService.downloadFile(filePath);
      console.log('🔍 File downloaded successfully', { 
        bufferSize: fileBuffer.length,
        bufferType: Buffer.isBuffer(fileBuffer) ? 'Buffer' : typeof fileBuffer
      });
      
      let ocrData: OCRData;
      
      if (this.useAiOcr) {
        console.log('🤖 Using AI-powered OCR (OpenAI GPT-4 Vision)...');
        ocrData = await this.processWithAI(fileBuffer, documentType);
      } else {
        console.log('🔍 Using traditional OCR (Tesseract.js)...');
        ocrData = await this.processWithTesseract(fileBuffer, documentType);
      }
      
      // Update document record
      console.log('🔍 Updating document record...');
      await this.verificationService.updateDocument(documentId, {
        ocr_extracted: true,
        quality_score: this.useAiOcr ? 0.92 : 0.5 // AI OCR typically has higher quality
      });
      
      logger.info('OCR processing completed', {
        documentId,
        method: this.useAiOcr ? 'AI' : 'Tesseract',
        extractedFields: Object.keys(ocrData).length
      });
      
      console.log('✅ OCR processing completed successfully');
      return ocrData;
    } catch (error) {
      console.error('🚨 OCR processing failed:', error);
      console.error('🚨 OCR Error details:', {
        documentId,
        filePath,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });
      
      logger.error('OCR processing failed', {
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      await this.verificationService.updateDocument(documentId, {
        ocr_extracted: false,
        quality_score: 0
      });
      
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      console.log('🔧 Starting image preprocessing with Jimp...');
      
      // Load image with Jimp
      const image = await Jimp.read(imageBuffer);
      console.log('🔧 Image metadata:', {
        width: image.getWidth(),
        height: image.getHeight(),
        mime: image.getMIME()
      });
      
      // Resize if image is too large (OCR works better on moderately sized images)
      const maxDimension = 2000;
      if (image.getWidth() > maxDimension || image.getHeight() > maxDimension) {
        console.log('🔧 Resizing large image...');
        image.scaleToFit(maxDimension, maxDimension);
      }
      
      // Enhance image for OCR
      const enhancedImage = image
        // Convert to grayscale for better text recognition
        .greyscale()
        // Increase contrast
        .contrast(0.3)
        // Brightness adjustment
        .brightness(0.1)
        // Normalize colors
        .normalize()
        // Apply slight blur to reduce noise, then sharpen
        .blur(0.5)
        .convolute([
          [ 0, -1,  0],
          [-1,  5, -1],
          [ 0, -1,  0]
        ]);
      
      // Convert back to buffer
      const enhancedBuffer = await enhancedImage.getBufferAsync(Jimp.MIME_PNG);
      
      console.log('🔧 Image preprocessing completed with Jimp', {
        originalSize: imageBuffer.length,
        processedSize: enhancedBuffer.length,
        dimensions: `${image.getWidth()}x${image.getHeight()}`
      });
      
      return enhancedBuffer;
    } catch (error) {
      console.warn('🔧 Image preprocessing failed, using original:', error);
      logger.warn('Image preprocessing failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return imageBuffer; // Fall back to original image
    }
  }
  
  private extractStructuredData(text: string, documentType: string): OCRData {
    const ocrData: OCRData = {
      raw_text: text,
      confidence_scores: {}
    };
    
    // Clean up the text
    const cleanText = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    
    try {
      switch (documentType) {
        case 'passport':
          this.extractPassportData(cleanText, ocrData);
          break;
        case 'drivers_license':
          this.extractDriversLicenseData(cleanText, ocrData);
          break;
        case 'national_id':
          this.extractNationalIdData(cleanText, ocrData);
          break;
        default:
          this.extractGenericData(cleanText, ocrData);
      }
    } catch (error) {
      logger.warn('Failed to extract structured data, falling back to generic extraction', {
        documentType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      this.extractGenericData(cleanText, ocrData);
    }
    
    return ocrData;
  }
  
  private extractPassportData(text: string, ocrData: OCRData): void {
    // Extract name (usually after "Name" or "Surname")
    const nameMatch = text.match(/(?:Name|Surname|Given Names?)\s*[:\-]?\s*([A-Z][A-Z\s,]+)/i);
    if (nameMatch) {
      ocrData.name = nameMatch[1].trim();
      ocrData.confidence_scores!.name = 0.8;
    }
    
    // Extract date of birth
    const dobMatch = text.match(/(?:Date of birth|Birth|DOB)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
    if (dobMatch) {
      ocrData.date_of_birth = this.standardizeDateFormat(dobMatch[1]);
      ocrData.confidence_scores!.date_of_birth = 0.9;
    }
    
    // Extract passport number
    const passportMatch = text.match(/(?:Passport No|Number)\s*[:\-]?\s*([A-Z0-9]{6,9})/i);
    if (passportMatch) {
      ocrData.document_number = passportMatch[1];
      ocrData.confidence_scores!.document_number = 0.85;
    }
    
    // Extract expiration date
    const expMatch = text.match(/(?:Date of expiry|Expiry|Expires)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
    if (expMatch) {
      ocrData.expiration_date = this.standardizeDateFormat(expMatch[1]);
      ocrData.confidence_scores!.expiration_date = 0.9;
    }
    
    // Extract nationality
    const nationalityMatch = text.match(/(?:Nationality|Country)\s*[:\-]?\s*([A-Z\s]+)/i);
    if (nationalityMatch) {
      ocrData.nationality = nationalityMatch[1].trim();
      ocrData.confidence_scores!.nationality = 0.7;
    }
  }
  
  private extractDriversLicenseData(text: string, ocrData: OCRData): void {
    // Enhanced patterns for driver's license data extraction
    console.log('🔧 Extracting driver\'s license data from:', text.substring(0, 200));
    
    // Extract name - multiple patterns for different license formats
    const namePatterns = [
      /(?:Name|Full Name|LN|FN)\s*[:\-]?\s*([A-Z][A-Z\s,]+)/i,
      /([A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,})?)/,  // All caps names
      /\b([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/  // Title case names
    ];
    
    for (const pattern of namePatterns) {
      const nameMatch = text.match(pattern);
      if (nameMatch && nameMatch[1].length > 3) {
        ocrData.name = nameMatch[1].trim().replace(/\s+/g, ' ');
        ocrData.confidence_scores!.name = 0.8;
        console.log('🔧 Name extracted:', ocrData.name);
        break;
      }
    }
    
    // Extract date of birth - enhanced patterns
    const dobPatterns = [
      /(?:DOB|Date of birth|Birth|Born)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/g,  // Any date format
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2})/g  // Short year format
    ];
    
    for (const pattern of dobPatterns) {
      const dobMatches = text.match(pattern);
      if (dobMatches) {
        // Get the first date that looks like a birth date (not future)
        for (const match of dobMatches) {
          const dateStr = typeof match === 'string' ? match : match[1];
          const standardized = this.standardizeDateFormat(dateStr);
          const date = new Date(standardized);
          if (date.getFullYear() > 1900 && date.getFullYear() < new Date().getFullYear() - 16) {
            ocrData.date_of_birth = standardized;
            ocrData.confidence_scores!.date_of_birth = 0.9;
            console.log('🔧 DOB extracted:', ocrData.date_of_birth);
            break;
          }
        }
        if (ocrData.date_of_birth) break;
      }
    }
    
    // Extract license number - more flexible patterns
    const licensePatterns = [
      /(?:License No|Driver License|DL|ID|Number)\s*[:\-]?\s*([A-Z0-9\-]{6,15})/i,
      /\b([A-Z]{1,3}\d{6,12})\b/,  // State format like NY123456789
      /\b(\d{8,12})\b/,  // Numeric license numbers
      /([A-Z0-9]{8,15})/  // General alphanumeric
    ];
    
    for (const pattern of licensePatterns) {
      const licenseMatch = text.match(pattern);
      if (licenseMatch && licenseMatch[1]) {
        // Skip if it looks like a date
        if (!/\d{2}[\/\-\.]\d{2}/.test(licenseMatch[1])) {
          ocrData.document_number = licenseMatch[1].replace(/\s+/g, '');
          ocrData.confidence_scores!.document_number = 0.85;
          console.log('🔧 License number extracted:', ocrData.document_number);
          break;
        }
      }
    }
    
    // Extract expiration date
    const expPatterns = [
      /(?:Expires|Expiry|Exp|Valid Until)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/g  // Find future dates
    ];
    
    for (const pattern of expPatterns) {
      const expMatches = text.match(pattern);
      if (expMatches) {
        // Get dates that are in the future (expiration dates)
        for (const match of expMatches) {
          const dateStr = typeof match === 'string' ? match : match[1];
          const standardized = this.standardizeDateFormat(dateStr);
          const date = new Date(standardized);
          if (date > new Date()) {
            ocrData.expiration_date = standardized;
            ocrData.confidence_scores!.expiration_date = 0.9;
            console.log('🔧 Expiration date extracted:', ocrData.expiration_date);
            break;
          }
        }
        if (ocrData.expiration_date) break;
      }
    }
    
    // Extract address - enhanced pattern
    const addressPatterns = [
      /(?:Address|Addr|Add)\s*[:\-]?\s*([A-Z0-9\s,\.\-]+(?:St|Ave|Rd|Dr|Blvd|Lane|Way|Street|Avenue|Road|Drive|Boulevard)[A-Z0-9\s,\.\-]*)/i,
      /(\d+\s+[A-Z\s]+(?:ST|AVE|RD|DR|BLVD|LANE|WAY))/i,  // Street address pattern
      /([A-Z\s]+,\s*[A-Z]{2}\s+\d{5})/i  // City, State ZIP pattern
    ];
    
    for (const pattern of addressPatterns) {
      const addressMatch = text.match(pattern);
      if (addressMatch && addressMatch[1] && addressMatch[1].length > 5) {
        ocrData.address = addressMatch[1].trim().replace(/\s+/g, ' ');
        ocrData.confidence_scores!.address = 0.6;
        console.log('🔧 Address extracted:', ocrData.address);
        break;
      }
    }
    
    // Extract sex/gender
    const sexMatch = text.match(/(?:Sex|Gender|M\/F)\s*[:\-]?\s*([MF])/i);
    if (sexMatch) {
      ocrData.sex = sexMatch[1].toUpperCase();
      ocrData.confidence_scores!.sex = 0.8;
      console.log('🔧 Sex extracted:', ocrData.sex);
    }
    
    // Extract height
    const heightMatch = text.match(/(?:Height|Hgt|Ht)\s*[:\-]?\s*(\d+['\-]\d+["']?|\d+\s*ft\s*\d+\s*in)/i);
    if (heightMatch) {
      ocrData.height = heightMatch[1].trim();
      ocrData.confidence_scores!.height = 0.7;
      console.log('🔧 Height extracted:', ocrData.height);
    }
    
    // Extract eyes color
    const eyesMatch = text.match(/(?:Eyes|Eye Color|EYE)\s*[:\-]?\s*([A-Z]{2,4})/i);
    if (eyesMatch) {
      ocrData.eye_color = eyesMatch[1].toUpperCase();
      ocrData.confidence_scores!.eye_color = 0.7;
      console.log('🔧 Eye color extracted:', ocrData.eye_color);
    }
  }
  
  private extractNationalIdData(text: string, ocrData: OCRData): void {
    // Extract name
    const nameMatch = text.match(/(?:Name|Full Name)\s*[:\-]?\s*([A-Z][A-Z\s,]+)/i);
    if (nameMatch) {
      ocrData.name = nameMatch[1].trim();
      ocrData.confidence_scores!.name = 0.8;
    }
    
    // Extract date of birth
    const dobMatch = text.match(/(?:DOB|Date of birth|Born)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
    if (dobMatch) {
      ocrData.date_of_birth = this.standardizeDateFormat(dobMatch[1]);
      ocrData.confidence_scores!.date_of_birth = 0.9;
    }
    
    // Extract ID number
    const idMatch = text.match(/(?:ID No|National ID|Identity)\s*[:\-]?\s*([A-Z0-9\-]{6,20})/i);
    if (idMatch) {
      ocrData.document_number = idMatch[1];
      ocrData.confidence_scores!.document_number = 0.85;
    }
    
    // Extract issuing authority
    const authorityMatch = text.match(/(?:Issued by|Authority|Department)\s*[:\-]?\s*([A-Z\s]+)/i);
    if (authorityMatch) {
      ocrData.issuing_authority = authorityMatch[1].trim();
      ocrData.confidence_scores!.issuing_authority = 0.7;
    }
  }
  
  private extractGenericData(text: string, ocrData: OCRData): void {
    // Generic patterns for common fields
    
    // Names (look for title case sequences)
    const nameMatch = text.match(/\b([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/);
    if (nameMatch) {
      ocrData.name = nameMatch[1];
      ocrData.confidence_scores!.name = 0.6;
    }
    
    // Dates (various formats)
    const dateMatches = text.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g);
    if (dateMatches && dateMatches.length >= 1) {
      ocrData.date_of_birth = this.standardizeDateFormat(dateMatches[0]);
      ocrData.confidence_scores!.date_of_birth = 0.5;
      
      if (dateMatches.length >= 2) {
        ocrData.expiration_date = this.standardizeDateFormat(dateMatches[1]);
        ocrData.confidence_scores!.expiration_date = 0.5;
      }
    }
    
    // Document numbers (alphanumeric sequences)
    const numberMatch = text.match(/\b([A-Z0-9]{6,15})\b/);
    if (numberMatch) {
      ocrData.document_number = numberMatch[1];
      ocrData.confidence_scores!.document_number = 0.4;
    }
  }
  
  private standardizeDateFormat(dateStr: string): string {
    // Convert various date formats to YYYY-MM-DD
    const cleaned = dateStr.replace(/[^\d\/\-\.]/g, '');
    const parts = cleaned.split(/[\/\-\.]/);
    
    if (parts.length !== 3) {
      return dateStr; // Return original if can't parse
    }
    
    let [part1, part2, part3] = parts;
    
    // Handle 2-digit years
    if (part3.length === 2) {
      const year = parseInt(part3);
      part3 = year > 30 ? `19${part3}` : `20${part3}`;
    }
    
    // Determine if it's MM/DD/YYYY or DD/MM/YYYY
    // If first part > 12, assume DD/MM/YYYY
    if (parseInt(part1) > 12) {
      return `${part3}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
    } else {
      return `${part3}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`;
    }
  }
  
  private calculateQualityScore(tesseractData: any): number {
    // Calculate quality score based on Tesseract confidence and other factors
    const confidence = tesseractData.confidence || 0;
    const textLength = tesseractData.text?.length || 0;
    
    // Base score from confidence
    let score = confidence / 100;
    
    // Adjust based on text length (very short or very long might indicate issues)
    if (textLength < 50) {
      score *= 0.7; // Too little text
    } else if (textLength > 2000) {
      score *= 0.8; // Too much text might be noisy
    }
    
    // Ensure score is between 0 and 1
    return Math.max(0, Math.min(1, score));
  }
  
  // Method to validate extracted data
  validateExtractedData(ocrData: OCRData): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check required fields
    if (!ocrData.name || ocrData.name.length < 2) {
      errors.push('Name is missing or too short');
    }
    
    if (!ocrData.document_number || ocrData.document_number.length < 4) {
      errors.push('Document number is missing or too short');
    }
    
    // Validate date formats
    if (ocrData.date_of_birth && !this.isValidDate(ocrData.date_of_birth)) {
      errors.push('Invalid date of birth format');
    }
    
    if (ocrData.expiration_date && !this.isValidDate(ocrData.expiration_date)) {
      errors.push('Invalid expiration date format');
    }
    
    // Check if document is expired
    if (ocrData.expiration_date && this.isValidDate(ocrData.expiration_date)) {
      const expDate = new Date(ocrData.expiration_date);
      if (expDate < new Date()) {
        warnings.push('Document appears to be expired');
      }
    }
    
    // Check confidence scores
    const avgConfidence = Object.values(ocrData.confidence_scores || {})
      .reduce((sum, score) => sum + score, 0) / Object.keys(ocrData.confidence_scores || {}).length;
    
    if (avgConfidence < 0.6) {
      warnings.push('Low OCR confidence scores detected');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private isValidDate(dateStr: string): boolean {
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
  }
  
  private async processWithAI(imageBuffer: Buffer, documentType: string): Promise<OCRData> {
    try {
      console.log('🤖 Starting AI OCR processing...');
      
      // Convert image to base64
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.detectMimeType(imageBuffer);
      
      // Create prompt based on document type
      const prompt = this.createAIPrompt(documentType);
      
      console.log('🤖 Sending request to OpenAI GPT-4 Vision...');
      
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
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 1000,
          temperature: 0.1
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
      }
      
      const result = await response.json();
      const extractedText = result.choices[0].message.content;
      
      console.log('🤖 AI OCR completed', {
        textLength: extractedText.length,
        textPreview: extractedText.substring(0, 200) + '...'
      });
      
      // Parse the AI response into structured data
      return this.parseAIResponse(extractedText, documentType);
      
    } catch (error) {
      console.error('🤖 AI OCR failed:', error);
      logger.error('AI OCR processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Fallback to Tesseract
      console.log('🔍 Falling back to Tesseract OCR...');
      return await this.processWithTesseract(imageBuffer, documentType);
    }
  }
  
  private async processWithTesseract(imageBuffer: Buffer, documentType: string): Promise<OCRData> {
    // Preprocess image for better OCR results using Jimp
    console.log('🔍 Preprocessing image for OCR...');
    const preprocessedBuffer = await this.preprocessImage(imageBuffer);
    console.log('🔍 Image preprocessing completed');
    
    // Initialize Tesseract worker with enhanced configuration
    console.log('🔍 Creating Tesseract worker...');
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`🔍 OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    // Configure Tesseract for better document recognition
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,/-: ',
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      preserve_interword_spaces: '1'
    });
    
    console.log('🔍 Tesseract worker created, starting recognition...');
    // Perform OCR with preprocessed image
    const { data } = await worker.recognize(preprocessedBuffer);
    console.log('🔍 OCR recognition completed', {
      textLength: data.text.length,
      confidence: data.confidence,
      textPreview: data.text.substring(0, 100) + '...'
    });
    
    await worker.terminate();
    console.log('🔍 Tesseract worker terminated');
    
    // Extract structured data based on document type
    console.log('🔍 Extracting structured data from OCR text...');
    const ocrData = this.extractStructuredData(data.text, documentType);
    console.log('🔍 Structured data extracted', {
      extractedFields: Object.keys(ocrData),
      ocrData
    });
    
    return ocrData;
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
  
  private createAIPrompt(documentType: string): string {
    const basePrompt = `Extract ALL text and data from this ${documentType} document. 
    
Please provide the response in JSON format with the following structure:
{
  "raw_text": "all visible text exactly as it appears",
  "name": "full legal name",
  "document_number": "ID/license number", 
  "date_of_birth": "MM/DD/YYYY format",
  "expiration_date": "MM/DD/YYYY format",
  "address": "full address if present",
  "sex": "M/F if present",
  "height": "height if present",
  "eye_color": "eye color if present",
  "issuing_authority": "issuing state/authority if present"
}

Important:
- Extract EXACTLY what you see - don't correct misspellings or formatting
- If a field is not present or unclear, use null
- For dates, convert to MM/DD/YYYY format if possible
- Be very careful with numbers and dates - accuracy is critical
- Include ALL text you can see in the raw_text field`;

    return basePrompt;
  }
  
  private parseAIResponse(aiResponse: string, documentType: string): OCRData {
    try {
      // Try to parse as JSON first
      let parsed;
      
      // Clean the response - sometimes AI adds markdown formatting
      let cleanResponse = aiResponse.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/```$/, '');
      }
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```\n?/, '').replace(/```$/, '');
      }
      
      try {
        parsed = JSON.parse(cleanResponse);
      } catch (jsonError) {
        // If JSON parsing fails, try to extract structured data from text
        console.warn('🤖 AI response not valid JSON, parsing as text:', jsonError);
        return this.extractFromAIText(aiResponse, documentType);
      }
      
      // Convert parsed JSON to OCRData format
      const ocrData: OCRData = {
        raw_text: parsed.raw_text || aiResponse,
        confidence_scores: {}
      };
      
      // Set high confidence scores for AI extraction (90-95%)
      const fields = ['name', 'document_number', 'date_of_birth', 'expiration_date', 
                     'address', 'sex', 'height', 'eye_color', 'issuing_authority'];
      
      fields.forEach(field => {
        if (parsed[field] && parsed[field] !== null && parsed[field] !== '') {
          (ocrData as any)[field] = parsed[field];
          ocrData.confidence_scores![field] = 0.92; // High confidence for AI extraction
        }
      });
      
      console.log('🤖 AI response parsed successfully:', {
        extractedFields: Object.keys(ocrData).filter(k => k !== 'raw_text' && k !== 'confidence_scores')
      });
      
      return ocrData;
      
    } catch (error) {
      console.error('🤖 Failed to parse AI response:', error);
      // Fallback to basic text extraction
      return this.extractFromAIText(aiResponse, documentType);
    }
  }
  
  private extractFromAIText(text: string, documentType: string): OCRData {
    // Fallback extraction from AI text response
    const ocrData: OCRData = {
      raw_text: text,
      confidence_scores: {}
    };
    
    // Use the existing structured data extraction as fallback
    return this.extractStructuredData(text, documentType);
  }
}