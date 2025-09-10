/**
 * Dynamic Threshold Management
 * 
 * Bridges VaaS admin dashboard settings with centralized verification thresholds
 * Allows visual threshold management through the admin interface
 */

import { VERIFICATION_THRESHOLDS, VerificationThresholds } from './verificationThresholds.js';
import { supabase } from '@/config/database.js';
import { logger } from '@/utils/logger.js';

export interface DynamicThresholdSettings {
  // Organization-specific overrides from VaaS admin
  organizationId: string;
  
  // Threshold overrides (if null, use default values)
  photoConsistency?: number;
  faceMatchingProduction?: number;
  faceMatchingSandbox?: number;
  livenessProduction?: number;
  livenessSandbox?: number;
  crossValidation?: number;
  qualityMinimum?: number;
  ocrConfidence?: number;
  pdf417Confidence?: number;
  
  // High-level admin settings (from VaaS admin UI)
  autoApproveThreshold: number;      // Overall verification confidence for auto-approval
  manualReviewThreshold: number;     // Overall verification confidence for manual review
  requireLiveness: boolean;
  requireBackOfId: boolean;
  maxVerificationAttempts: number;
  
  // Timestamps
  lastUpdated: Date;
  updatedBy: string;
}

export interface DynamicThresholdInput {
  // Same as DynamicThresholdSettings but with optional high-level settings for updates
  organizationId: string;
  photoConsistency?: number;
  faceMatchingProduction?: number;
  faceMatchingSandbox?: number;
  livenessProduction?: number;
  livenessSandbox?: number;
  crossValidation?: number;
  qualityMinimum?: number;
  ocrConfidence?: number;
  pdf417Confidence?: number;
  autoApproveThreshold?: number;
  manualReviewThreshold?: number;
  requireLiveness?: boolean;
  requireBackOfId?: boolean;
  maxVerificationAttempts?: number;
  lastUpdated?: Date;
  updatedBy?: string;
}

/**
 * Threshold manager for dynamic configuration
 */
export class DynamicThresholdManager {
  private static instance: DynamicThresholdManager;
  private thresholdCache = new Map<string, DynamicThresholdSettings>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes
  
  static getInstance(): DynamicThresholdManager {
    if (!DynamicThresholdManager.instance) {
      DynamicThresholdManager.instance = new DynamicThresholdManager();
    }
    return DynamicThresholdManager.instance;
  }
  
  /**
   * Get thresholds for a specific organization with admin overrides
   */
  async getThresholdsForOrganization(
    organizationId: string, 
    isSandbox: boolean = false
  ): Promise<VerificationThresholds> {
    try {
      // Try to get from cache first
      const cached = this.getCachedThresholds(organizationId);
      let orgSettings: DynamicThresholdSettings | null = cached;
      
      if (!orgSettings) {
        // Fetch from database
        orgSettings = await this.fetchOrganizationThresholds(organizationId);
        
        if (orgSettings) {
          this.cacheThresholds(organizationId, orgSettings);
        }
      }
      
      // Start with default thresholds
      const baseThresholds = { ...VERIFICATION_THRESHOLDS };
      
      if (!orgSettings) {
        logger.debug('Using default thresholds for organization', { organizationId });
        return baseThresholds;
      }
      
      // Apply organization-specific overrides
      const dynamicThresholds: VerificationThresholds = {
        ...baseThresholds,
        
        // Override with admin-configured values if present
        PHOTO_CONSISTENCY: orgSettings.photoConsistency ?? baseThresholds.PHOTO_CONSISTENCY,
        CROSS_VALIDATION: orgSettings.crossValidation ?? baseThresholds.CROSS_VALIDATION,
        
        FACE_MATCHING: {
          production: orgSettings.faceMatchingProduction ?? baseThresholds.FACE_MATCHING.production,
          sandbox: orgSettings.faceMatchingSandbox ?? baseThresholds.FACE_MATCHING.sandbox
        },
        
        LIVENESS: {
          production: orgSettings.livenessProduction ?? baseThresholds.LIVENESS.production,
          sandbox: orgSettings.livenessSandbox ?? baseThresholds.LIVENESS.sandbox
        },
        
        QUALITY: {
          minimum_acceptable: orgSettings.qualityMinimum ?? baseThresholds.QUALITY.minimum_acceptable,
          good_quality: baseThresholds.QUALITY.good_quality
        },
        
        OCR_CONFIDENCE: {
          minimum_acceptable: orgSettings.ocrConfidence ?? baseThresholds.OCR_CONFIDENCE.minimum_acceptable,
          high_confidence: baseThresholds.OCR_CONFIDENCE.high_confidence
        },
        
        PDF417: {
          minimum_confidence: orgSettings.pdf417Confidence ?? baseThresholds.PDF417.minimum_confidence,
          high_confidence: baseThresholds.PDF417.high_confidence
        }
      };
      
      logger.info('Applied dynamic thresholds for organization', {
        organizationId,
        isSandbox,
        autoApproveThreshold: orgSettings.autoApproveThreshold,
        manualReviewThreshold: orgSettings.manualReviewThreshold,
        overrides: this.getAppliedOverrides(orgSettings)
      });
      
      return dynamicThresholds;
      
    } catch (error) {
      logger.error('Failed to get organization thresholds, using defaults', {
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return VERIFICATION_THRESHOLDS;
    }
  }
  
  /**
   * Update thresholds for an organization (called from admin API)
   */
  async updateOrganizationThresholds(
    organizationId: string,
    updates: Partial<DynamicThresholdInput>,
    updatedBy: string
  ): Promise<DynamicThresholdSettings> {
    try {
      // Get current settings
      const current = await this.fetchOrganizationThresholds(organizationId);
      
      // Merge with updates, ensuring required fields have defaults
      const updated: DynamicThresholdSettings = {
        organizationId,
        autoApproveThreshold: 85,
        manualReviewThreshold: 60,
        requireLiveness: true,
        requireBackOfId: false,
        maxVerificationAttempts: 3,
        lastUpdated: new Date(),
        updatedBy,
        ...current,
        ...updates
      };
      
      // Validate thresholds are within acceptable ranges
      this.validateThresholds(updated);
      
      // Save to database
      await this.saveOrganizationThresholds(updated);
      
      // Update cache
      this.cacheThresholds(organizationId, updated);
      
      logger.info('Updated organization thresholds', {
        organizationId,
        updatedBy,
        changes: Object.keys(updates)
      });
      
      return updated;
      
    } catch (error) {
      logger.error('Failed to update organization thresholds', {
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * Convert VaaS admin settings to threshold overrides
   */
  convertAdminSettingsToThresholds(adminSettings: {
    auto_approve_threshold: number;
    manual_review_threshold: number;
    require_liveness: boolean;
    require_back_of_id: boolean;
    max_verification_attempts: number;
  }): Partial<DynamicThresholdSettings> {
    // Map high-level admin settings to specific verification thresholds
    return {
      autoApproveThreshold: adminSettings.auto_approve_threshold,
      manualReviewThreshold: adminSettings.manual_review_threshold,
      requireLiveness: adminSettings.require_liveness,
      requireBackOfId: adminSettings.require_back_of_id,
      maxVerificationAttempts: adminSettings.max_verification_attempts,
      
      // Auto-adjust specific thresholds based on admin preferences
      // Higher auto-approve threshold = more stringent individual thresholds
      faceMatchingProduction: this.calculateFaceThreshold(adminSettings.auto_approve_threshold, false),
      faceMatchingSandbox: this.calculateFaceThreshold(adminSettings.auto_approve_threshold, true),
      livenessProduction: this.calculateLivenessThreshold(adminSettings.auto_approve_threshold, false),
      livenessSandbox: this.calculateLivenessThreshold(adminSettings.auto_approve_threshold, true),
      
      // Liveness requirement affects threshold
      ...(adminSettings.require_liveness ? {} : {
        livenessProduction: 0.5, // More lenient if not required
        livenessSandbox: 0.4
      })
    };
  }
  
  /**
   * Calculate face matching threshold based on admin preference
   */
  private calculateFaceThreshold(autoApproveThreshold: number, isSandbox: boolean): number {
    const baseThreshold = isSandbox ? 0.80 : 0.85;
    
    // Scale threshold based on admin preference (70-95% range)
    const scaleFactor = (autoApproveThreshold - 70) / 25; // 0.0 to 1.0
    const adjustment = scaleFactor * 0.1; // ±0.1 adjustment range
    
    return Math.max(0.6, Math.min(0.95, baseThreshold + adjustment));
  }
  
  /**
   * Calculate liveness threshold based on admin preference
   */
  private calculateLivenessThreshold(autoApproveThreshold: number, isSandbox: boolean): number {
    const baseThreshold = isSandbox ? 0.65 : 0.75;
    
    // Scale threshold based on admin preference
    const scaleFactor = (autoApproveThreshold - 70) / 25;
    const adjustment = scaleFactor * 0.1;
    
    return Math.max(0.5, Math.min(0.9, baseThreshold + adjustment));
  }
  
  /**
   * Validate threshold values are within acceptable ranges
   */
  private validateThresholds(settings: DynamicThresholdSettings): void {
    const validations = [
      { field: 'photoConsistency', min: 0.5, max: 0.95 },
      { field: 'faceMatchingProduction', min: 0.6, max: 0.95 },
      { field: 'faceMatchingSandbox', min: 0.5, max: 0.95 },
      { field: 'livenessProduction', min: 0.5, max: 0.9 },
      { field: 'livenessSandbox', min: 0.4, max: 0.9 },
      { field: 'crossValidation', min: 0.5, max: 0.95 },
      { field: 'autoApproveThreshold', min: 70, max: 95 },
      { field: 'manualReviewThreshold', min: 30, max: 80 }
    ];
    
    for (const { field, min, max } of validations) {
      const value = (settings as any)[field];
      if (value !== undefined && value !== null) {
        if (value < min || value > max) {
          throw new Error(`${field} must be between ${min} and ${max}, got ${value}`);
        }
      }
    }
    
    // Logical validation: manual review threshold should be less than auto-approve
    if (settings.manualReviewThreshold >= settings.autoApproveThreshold) {
      throw new Error('Manual review threshold must be less than auto-approve threshold');
    }
  }
  
  /**
   * Cache management methods
   */
  private getCachedThresholds(organizationId: string): DynamicThresholdSettings | null {
    const cached = this.thresholdCache.get(organizationId);
    if (cached && Date.now() - cached.lastUpdated.getTime() < this.cacheExpiry) {
      return cached;
    }
    return null;
  }
  
  private cacheThresholds(organizationId: string, settings: DynamicThresholdSettings): void {
    this.thresholdCache.set(organizationId, settings);
  }
  
  /**
   * Database operations
   */
  private async fetchOrganizationThresholds(organizationId: string): Promise<DynamicThresholdSettings | null> {
    try {
      const { data, error } = await supabase
        .from('organization_threshold_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single();
        
      if (error) {
        logger.debug('No organization-specific thresholds found', { organizationId });
        return null;
      }
      
      return {
        organizationId,
        photoConsistency: data.photo_consistency_threshold,
        faceMatchingProduction: data.face_matching_production_threshold,
        faceMatchingSandbox: data.face_matching_sandbox_threshold,
        livenessProduction: data.liveness_production_threshold,
        livenessSandbox: data.liveness_sandbox_threshold,
        crossValidation: data.cross_validation_threshold,
        qualityMinimum: data.quality_minimum_threshold,
        ocrConfidence: data.ocr_confidence_threshold,
        pdf417Confidence: data.pdf417_confidence_threshold,
        autoApproveThreshold: data.auto_approve_threshold || 85,
        manualReviewThreshold: data.manual_review_threshold || 60,
        requireLiveness: data.require_liveness ?? true,
        requireBackOfId: data.require_back_of_id ?? false,
        maxVerificationAttempts: data.max_verification_attempts || 3,
        lastUpdated: new Date(data.updated_at),
        updatedBy: data.updated_by
      };
    } catch (error) {
      logger.debug('Error fetching organization thresholds', { organizationId, error });
      return null;
    }
  }
  
  private async saveOrganizationThresholds(settings: DynamicThresholdSettings): Promise<void> {
    try {
      const { error } = await supabase
        .from('organization_threshold_settings')
        .upsert({
          organization_id: settings.organizationId,
          photo_consistency_threshold: settings.photoConsistency,
          face_matching_production_threshold: settings.faceMatchingProduction,
          face_matching_sandbox_threshold: settings.faceMatchingSandbox,
          liveness_production_threshold: settings.livenessProduction,
          liveness_sandbox_threshold: settings.livenessSandbox,
          cross_validation_threshold: settings.crossValidation,
          quality_minimum_threshold: settings.qualityMinimum,
          ocr_confidence_threshold: settings.ocrConfidence,
          pdf417_confidence_threshold: settings.pdf417Confidence,
          auto_approve_threshold: settings.autoApproveThreshold,
          manual_review_threshold: settings.manualReviewThreshold,
          require_liveness: settings.requireLiveness,
          require_back_of_id: settings.requireBackOfId,
          max_verification_attempts: settings.maxVerificationAttempts,
          updated_by: settings.updatedBy,
          updated_at: settings.lastUpdated.toISOString()
        });
      
      if (error) {
        throw new Error(`Failed to save thresholds: ${error.message}`);
      }
    } catch (error) {
      throw new Error(`Failed to save thresholds: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private getAppliedOverrides(settings: DynamicThresholdSettings): Record<string, any> {
    const overrides: Record<string, any> = {};
    
    if (settings.photoConsistency !== undefined) overrides.photoConsistency = settings.photoConsistency;
    if (settings.faceMatchingProduction !== undefined) overrides.faceMatchingProduction = settings.faceMatchingProduction;
    if (settings.crossValidation !== undefined) overrides.crossValidation = settings.crossValidation;
    
    return overrides;
  }
  
  /**
   * Clear cache for organization (useful after updates)
   */
  clearCache(organizationId?: string): void {
    if (organizationId) {
      this.thresholdCache.delete(organizationId);
    } else {
      this.thresholdCache.clear();
    }
  }
}