import { supabase } from '@/config/database.js';
import { logger } from '@/utils/logger.js';
import { VerificationStateMachine, VerificationState, VerificationEvent } from './verificationStateMachine.js';
import {
  getFaceMatchingThreshold,
  getLivenessThreshold,
  validateScores
} from '@/config/verificationThresholds.js';

export interface VerificationContext {
  verificationId: string;
  isSandbox: boolean;
  organizationId?: string;
  faceMatchScore?: number;
  livenessScore?: number;
  crossValidationScore?: number;
  ocrQuality?: number;
  documentPhotoQuality?: number;
}

export interface StateUpdateResult {
  success: boolean;
  currentState: VerificationState;
  finalStatus?: 'verified' | 'failed' | 'manual_review';
  error?: string;
  shouldNotifyUser: boolean;
}

/**
 * Robust Verification Manager - Fixes state transition issues
 * Ensures proper status updates and user feedback
 */
export class RobustVerificationManager {
  private stateMachine: VerificationStateMachine;

  constructor() {
    this.stateMachine = new VerificationStateMachine();
    console.log('🔄 RobustVerificationManager initialized');
  }

  /**
   * Process live capture completion with robust state handling
   */
  async processLiveCaptureCompletion(context: VerificationContext): Promise<StateUpdateResult> {
    console.log('🔄 Processing live capture completion...', {
      verificationId: context.verificationId,
      faceMatch: context.faceMatchScore,
      liveness: context.livenessScore
    });

    try {
      // Get current verification state
      const currentVerification = await this.getVerificationRequest(context.verificationId);
      if (!currentVerification) {
        throw new Error('Verification request not found');
      }

      console.log('🔄 Current verification state:', currentVerification.status);

      // Determine next state based on scores
      const result = await this.evaluateVerificationCompletion(context, currentVerification);

      // Update database with final state
      const updateResult = await this.updateVerificationState(
        context.verificationId,
        result.finalStatus || 'manual_review',
        {
          face_match_score: context.faceMatchScore,
          liveness_score: context.livenessScore,
          cross_validation_score: context.crossValidationScore,
          manual_review_reason: result.finalStatus === 'manual_review' ?
            'Automated processing completed - awaiting manual review' : null
        }
      );

      if (!updateResult.success) {
        throw new Error(`Failed to update verification state: ${updateResult.error}`);
      }

      console.log('✅ Live capture processing completed:', {
        verificationId: context.verificationId,
        finalStatus: result.finalStatus,
        shouldNotify: result.shouldNotifyUser
      });

      return result;

    } catch (error) {
      console.error('🚨 Live capture processing failed:', error);

      // Ensure we still update the user with some status
      await this.updateVerificationState(context.verificationId, 'manual_review', {
        manual_review_reason: `Processing error: ${error}`
      });

      return {
        success: false,
        currentState: 'manual_review',
        finalStatus: 'manual_review',
        error: error instanceof Error ? error.message : 'Unknown error',
        shouldNotifyUser: true
      };
    }
  }

  /**
   * Evaluate verification completion based on all scores
   */
  private async evaluateVerificationCompletion(
    context: VerificationContext,
    verification: any
  ): Promise<StateUpdateResult> {
    console.log('🔄 Evaluating verification completion...');

    const scores = {
      faceMatching: context.faceMatchScore || verification.face_match_score || 0,
      liveness: context.livenessScore || verification.liveness_score || 0,
      crossValidation: context.crossValidationScore || verification.cross_validation_score || 0.6, // Default reasonable score
      photoConsistency: context.documentPhotoQuality || 0.8, // Assume decent quality if not specified
      quality: context.ocrQuality || 0.7 // Assume decent quality if OCR worked
    };

    console.log('🔄 Verification scores:', scores);

    // Get thresholds
    const faceThreshold = await getFaceMatchingThreshold(context.isSandbox, context.organizationId);
    const livenessThreshold = await getLivenessThreshold(context.isSandbox, context.organizationId);

    console.log('🔄 Thresholds:', { faceThreshold, livenessThreshold });

    // Validate scores
    const validation = await validateScores(scores, context.isSandbox, context.organizationId);

    console.log('🔄 Score validation:', validation);

    // Determine final status with robust logic
    let finalStatus: 'verified' | 'failed' | 'manual_review';
    let shouldNotifyUser = true;

    if (validation.overallPassed) {
      finalStatus = 'verified';
      console.log('✅ Verification passed all checks');
    } else if (this.isHardFailure(scores, { faceThreshold, livenessThreshold })) {
      finalStatus = 'failed';
      console.log('❌ Verification failed critical checks');
    } else {
      finalStatus = 'manual_review';
      console.log('⏳ Verification requires manual review');
    }

    return {
      success: true,
      currentState: finalStatus === 'verified' ? 'verified' :
                   finalStatus === 'failed' ? 'failed' : 'manual_review',
      finalStatus,
      shouldNotifyUser
    };
  }

  /**
   * Determine if this is a hard failure (should not go to manual review)
   */
  private isHardFailure(scores: any, thresholds: any): boolean {
    // Hard failure conditions:
    // 1. Face matching is significantly below threshold
    // 2. Liveness is significantly below threshold
    // 3. Multiple critical failures

    const faceDeficit = thresholds.faceThreshold - scores.faceMatching;
    const livenessDeficit = thresholds.livenessThreshold - scores.liveness;

    // If both face and liveness are way below threshold, it's a hard fail
    if (faceDeficit > 0.2 && livenessDeficit > 0.2) {
      return true;
    }

    // If face matching is extremely poor (likely wrong person)
    if (scores.faceMatching < 0.3) {
      return true;
    }

    // If liveness is extremely poor (likely fake/photo)
    if (scores.liveness < 0.3) {
      return true;
    }

    return false;
  }

  /**
   * Update verification state in database
   */
  private async updateVerificationState(
    verificationId: string,
    status: string,
    additionalData: any = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString(),
        ...additionalData
      };

      console.log('🔄 Updating verification state:', { verificationId, updateData });

      const { error } = await supabase
        .from('verification_requests')
        .update(updateData)
        .eq('id', verificationId);

      if (error) {
        console.error('🚨 Database update failed:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Verification state updated successfully');
      return { success: true };

    } catch (error) {
      console.error('🚨 Update verification state error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get verification request from database
   */
  private async getVerificationRequest(verificationId: string): Promise<any> {
    const { data, error } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('id', verificationId)
      .single();

    if (error) {
      console.error('🚨 Failed to get verification request:', error);
      return null;
    }

    return data;
  }

  /**
   * Force completion of stuck verifications
   */
  async forceCompleteVerification(
    verificationId: string,
    reason: string = 'Force completion due to stuck state'
  ): Promise<StateUpdateResult> {
    console.log('🔄 Force completing verification:', { verificationId, reason });

    try {
      const verification = await this.getVerificationRequest(verificationId);
      if (!verification) {
        throw new Error('Verification not found');
      }

      // Default to manual review for safety
      const updateResult = await this.updateVerificationState(verificationId, 'manual_review', {
        manual_review_reason: reason
      });

      return {
        success: updateResult.success,
        currentState: 'manual_review',
        finalStatus: 'manual_review',
        shouldNotifyUser: true,
        error: updateResult.error
      };

    } catch (error) {
      return {
        success: false,
        currentState: 'manual_review',
        finalStatus: 'manual_review',
        error: error instanceof Error ? error.message : 'Unknown error',
        shouldNotifyUser: true
      };
    }
  }

  /**
   * Check for and fix stuck verifications
   */
  async fixStuckVerifications(): Promise<{ fixed: number; errors: number }> {
    console.log('🔄 Checking for stuck verifications...');

    try {
      // Find verifications that have been processing for more than 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      const { data: stuckVerifications } = await supabase
        .from('verification_requests')
        .select('id, status, created_at, updated_at')
        .in('status', ['pending', 'document_uploaded', 'ocr_processing', 'live_capture_processing'])
        .lt('updated_at', tenMinutesAgo);

      if (!stuckVerifications || stuckVerifications.length === 0) {
        console.log('✅ No stuck verifications found');
        return { fixed: 0, errors: 0 };
      }

      console.log(`🔄 Found ${stuckVerifications.length} stuck verifications`);

      let fixed = 0;
      let errors = 0;

      for (const verification of stuckVerifications) {
        try {
          const result = await this.forceCompleteVerification(
            verification.id,
            'Auto-completed stuck verification after timeout'
          );

          if (result.success) {
            fixed++;
            console.log(`✅ Fixed stuck verification: ${verification.id}`);
          } else {
            errors++;
            console.error(`❌ Failed to fix verification: ${verification.id}`, result.error);
          }
        } catch (error) {
          errors++;
          console.error(`❌ Error fixing verification: ${verification.id}`, error);
        }
      }

      console.log(`🔄 Stuck verification cleanup completed: ${fixed} fixed, ${errors} errors`);
      return { fixed, errors };

    } catch (error) {
      console.error('🚨 Error in stuck verification cleanup:', error);
      return { fixed: 0, errors: 1 };
    }
  }
}