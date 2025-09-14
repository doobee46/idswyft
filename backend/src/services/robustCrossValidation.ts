import { logger } from '@/utils/logger.js';
import { VERIFICATION_THRESHOLDS } from '@/config/verificationThresholds.js';

export interface CrossValidationResult {
  overallConsistency: boolean;
  matchScore: number;
  discrepancies: number;
  matches: number;
  totalChecks: number;
  requiresManualReview: boolean;
  details: {
    nameMatch?: { match: boolean; frontValue?: string; backValue?: string; score: number };
    dobMatch?: { match: boolean; frontValue?: string; backValue?: string; score: number };
    licenseMatch?: { match: boolean; frontValue?: string; backValue?: string; score: number };
    expirationMatch?: { match: boolean; frontValue?: string; backValue?: string; score: number };
    addressMatch?: { match: boolean; frontValue?: string; backValue?: string; score: number };
  };
  validationNotes: string[];
}

export interface ValidationInput {
  frontOCR: {
    name?: string;
    document_number?: string;
    date_of_birth?: string;
    expiration_date?: string;
    address?: string;
    raw_text?: string;
  };
  backPDF417?: {
    firstName?: string;
    lastName?: string;
    licenseNumber?: string;
    dateOfBirth?: string;
    expirationDate?: string;
    address?: string;
  };
  documentPhoto?: {
    personFound: boolean;
    faceExtracted: boolean;
    quality: number;
  };
  verificationId: string;
}

/**
 * Robust Cross-Validation Service - Works with partial data
 * Prevents automatic manual review routing when data is partially available
 */
export class RobustCrossValidationService {
  private threshold: number;

  constructor() {
    this.threshold = VERIFICATION_THRESHOLDS.CROSS_VALIDATION;
    console.log('🔄 RobustCrossValidationService initialized with threshold:', this.threshold);
  }

  /**
   * Perform cross-validation with enhanced partial data support
   */
  async performCrossValidation(input: ValidationInput): Promise<CrossValidationResult> {
    console.log('🔄 Starting robust cross-validation...', {
      verificationId: input.verificationId,
      hasFrontOCR: !!input.frontOCR,
      hasBackPDF417: !!input.backPDF417,
      hasDocumentPhoto: !!input.documentPhoto
    });

    const result: CrossValidationResult = {
      overallConsistency: false,
      matchScore: 0,
      discrepancies: 0,
      matches: 0,
      totalChecks: 0,
      requiresManualReview: false,
      details: {},
      validationNotes: []
    };

    try {
      // Validate inputs
      if (!input.frontOCR) {
        result.validationNotes.push('No front OCR data available');
        return this.handleNoDataScenario(result, 'front_ocr_missing');
      }

      // Check data availability
      const frontDataQuality = this.assessDataQuality(input.frontOCR);
      const backDataQuality = input.backPDF417 ? this.assessDataQuality(input.backPDF417) : 0;

      result.validationNotes.push(`Front OCR quality: ${frontDataQuality}`);
      result.validationNotes.push(`Back PDF417 quality: ${backDataQuality}`);

      // Scenario 1: Both front and back data available
      if (input.backPDF417 && backDataQuality > 0.3) {
        return this.validateFrontAndBack(input, result);
      }

      // Scenario 2: Only front OCR data available (common case)
      if (frontDataQuality > 0.5) {
        return this.validateFrontOnly(input, result);
      }

      // Scenario 3: Poor data quality overall
      return this.handlePoorDataQuality(input, result);

    } catch (error) {
      console.error('🔄 Cross-validation error:', error);
      result.validationNotes.push(`Validation error: ${error}`);
      return this.handleValidationError(result);
    }
  }

  /**
   * Validate both front and back data
   */
  private validateFrontAndBack(input: ValidationInput, result: CrossValidationResult): CrossValidationResult {
    console.log('🔄 Validating front OCR vs back PDF417 data...');

    const checks = [
      {
        name: 'name',
        front: this.combineName(input.frontOCR.name),
        back: this.combineName(input.backPDF417!.firstName, input.backPDF417!.lastName),
        validator: this.compareNames.bind(this)
      },
      {
        name: 'dob',
        front: input.frontOCR.date_of_birth,
        back: input.backPDF417!.dateOfBirth,
        validator: this.compareDates.bind(this)
      },
      {
        name: 'license',
        front: input.frontOCR.document_number,
        back: input.backPDF417!.licenseNumber,
        validator: this.compareStrings.bind(this)
      },
      {
        name: 'expiration',
        front: input.frontOCR.expiration_date,
        back: input.backPDF417!.expirationDate,
        validator: this.compareDates.bind(this)
      }
    ];

    let totalScore = 0;
    let validChecks = 0;

    for (const check of checks) {
      if (check.front && check.back) {
        const matchResult = check.validator(check.front, check.back);

        result.details[`${check.name}Match` as keyof typeof result.details] = {
          match: matchResult.match,
          frontValue: check.front,
          backValue: check.back,
          score: matchResult.score
        };

        totalScore += matchResult.score;
        validChecks++;

        if (matchResult.match) {
          result.matches++;
        } else {
          result.discrepancies++;
        }

        result.totalChecks++;
      }
    }

    result.matchScore = validChecks > 0 ? totalScore / validChecks : 0;
    result.overallConsistency = result.matchScore >= this.threshold;
    result.requiresManualReview = result.matchScore < 0.5; // Lower threshold for manual review

    result.validationNotes.push(`Front vs Back validation: ${result.matches} matches, ${result.discrepancies} discrepancies`);

    console.log('🔄 Front-back validation completed:', {
      matchScore: result.matchScore,
      consistency: result.overallConsistency,
      manualReview: result.requiresManualReview
    });

    return result;
  }

  /**
   * Validate only front OCR data (no back data available)
   */
  private validateFrontOnly(input: ValidationInput, result: CrossValidationResult): CrossValidationResult {
    console.log('🔄 Validating front OCR data only (no back data available)...');

    const frontData = input.frontOCR;
    let qualityScore = 0;
    let validFields = 0;

    // Check individual field quality
    if (frontData.name && frontData.name.length > 2) {
      qualityScore += 0.3;
      validFields++;
    }

    if (frontData.document_number && frontData.document_number.length > 4) {
      qualityScore += 0.3;
      validFields++;
    }

    if (frontData.date_of_birth && this.isValidDate(frontData.date_of_birth)) {
      qualityScore += 0.2;
      validFields++;
    }

    if (frontData.expiration_date && this.isValidDate(frontData.expiration_date)) {
      qualityScore += 0.2;
      validFields++;
    }

    // Use document photo quality if available
    if (input.documentPhoto?.personFound) {
      qualityScore += 0.1;
    }

    result.matchScore = qualityScore;
    result.matches = validFields;
    result.totalChecks = validFields;
    result.discrepancies = 0; // No comparison data
    result.overallConsistency = qualityScore >= 0.6; // Lower threshold for front-only
    result.requiresManualReview = qualityScore < 0.4;

    result.validationNotes.push(`Front-only validation: ${validFields} valid fields, quality score ${qualityScore}`);
    result.validationNotes.push('No back data available for comparison');

    console.log('🔄 Front-only validation completed:', {
      qualityScore,
      validFields,
      consistency: result.overallConsistency
    });

    return result;
  }

  /**
   * Handle poor data quality scenario
   */
  private handlePoorDataQuality(input: ValidationInput, result: CrossValidationResult): CrossValidationResult {
    console.log('🔄 Handling poor data quality scenario...');

    result.matchScore = 0.3; // Minimum score to prevent automatic failure
    result.overallConsistency = false;
    result.requiresManualReview = true;
    result.validationNotes.push('Poor data quality detected - requires manual review');
    result.validationNotes.push('System could not extract reliable information from documents');

    // Still try to proceed with what we have instead of failing
    return result;
  }

  /**
   * Handle no data scenario
   */
  private handleNoDataScenario(result: CrossValidationResult, scenario: string): CrossValidationResult {
    console.log('🔄 Handling no data scenario:', scenario);

    result.matchScore = 0.2; // Minimum score
    result.overallConsistency = false;
    result.requiresManualReview = true;
    result.validationNotes.push(`Data extraction failed: ${scenario}`);

    return result;
  }

  /**
   * Handle validation errors
   */
  private handleValidationError(result: CrossValidationResult): CrossValidationResult {
    result.matchScore = 0.1;
    result.overallConsistency = false;
    result.requiresManualReview = true;
    return result;
  }

  /**
   * Assess data quality (0.0 to 1.0)
   */
  private assessDataQuality(data: any): number {
    let score = 0;
    let fields = 0;

    const checks = [
      { field: data.name || data.firstName, weight: 0.3 },
      { field: data.document_number || data.licenseNumber, weight: 0.3 },
      { field: data.date_of_birth || data.dateOfBirth, weight: 0.2 },
      { field: data.expiration_date || data.expirationDate, weight: 0.1 },
      { field: data.address, weight: 0.1 }
    ];

    for (const check of checks) {
      if (check.field && check.field.length > 1) {
        score += check.weight;
        fields++;
      }
    }

    return fields > 0 ? score : 0;
  }

  /**
   * Compare names with fuzzy matching
   */
  private compareNames(name1: string, name2: string): { match: boolean; score: number } {
    if (!name1 || !name2) return { match: false, score: 0 };

    const n1 = name1.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const n2 = name2.toLowerCase().replace(/[^a-z\s]/g, '').trim();

    // Exact match
    if (n1 === n2) return { match: true, score: 1.0 };

    // Check if one contains the other
    if (n1.includes(n2) || n2.includes(n1)) {
      return { match: true, score: 0.8 };
    }

    // Check individual words
    const words1 = n1.split(/\s+/);
    const words2 = n2.split(/\s+/);

    let matchingWords = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1 === word2 && word1.length > 2) {
          matchingWords++;
          break;
        }
      }
    }

    const score = matchingWords / Math.max(words1.length, words2.length);
    return { match: score > 0.5, score };
  }

  /**
   * Compare dates with flexible formatting
   */
  private compareDates(date1: string, date2: string): { match: boolean; score: number } {
    if (!date1 || !date2) return { match: false, score: 0 };

    const normalized1 = this.normalizeDate(date1);
    const normalized2 = this.normalizeDate(date2);

    if (normalized1 === normalized2) {
      return { match: true, score: 1.0 };
    }

    // Close match (different format but same date)
    const d1 = new Date(normalized1);
    const d2 = new Date(normalized2);

    if (d1.getTime() === d2.getTime()) {
      return { match: true, score: 0.9 };
    }

    return { match: false, score: 0 };
  }

  /**
   * Compare strings with partial matching
   */
  private compareStrings(str1: string, str2: string): { match: boolean; score: number } {
    if (!str1 || !str2) return { match: false, score: 0 };

    const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (s1 === s2) return { match: true, score: 1.0 };

    // Partial match
    if (s1.includes(s2) || s2.includes(s1)) {
      const longer = s1.length > s2.length ? s1 : s2;
      const shorter = s1.length <= s2.length ? s1 : s2;
      const score = shorter.length / longer.length;
      return { match: score > 0.7, score };
    }

    return { match: false, score: 0 };
  }

  /**
   * Combine first and last names
   */
  private combineName(nameOrFirst?: string, last?: string): string {
    if (nameOrFirst && last) {
      return `${nameOrFirst} ${last}`;
    }
    return nameOrFirst || '';
  }

  /**
   * Normalize date format
   */
  private normalizeDate(date: string): string {
    try {
      const parsed = new Date(date);
      return parsed.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch {
      return date;
    }
  }

  /**
   * Check if date is valid
   */
  private isValidDate(date: string): boolean {
    try {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime()) && parsed.getFullYear() > 1900;
    } catch {
      return false;
    }
  }
}