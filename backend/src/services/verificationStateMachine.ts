import { logger } from '@/utils/logger.js';

export type VerificationState = 
  | 'pending'
  | 'document_uploaded'
  | 'ocr_processing'
  | 'ocr_completed'
  | 'back_id_processing'
  | 'cross_validation_completed'
  | 'live_capture_processing'
  | 'face_matching'
  | 'liveness_checking'
  | 'verified'
  | 'failed'
  | 'manual_review';

export type VerificationEvent = 
  | 'document_upload'
  | 'ocr_success'
  | 'ocr_failure'
  | 'back_id_upload'
  | 'cross_validation_success'
  | 'cross_validation_failure'
  | 'live_capture_upload'
  | 'face_match_success'
  | 'face_match_failure'
  | 'liveness_success'
  | 'liveness_failure'
  | 'manual_review_required';

interface StateTransition {
  from: VerificationState[];
  to: VerificationState;
  validations?: ((context: any) => boolean)[];
}

export class VerificationStateMachine {
  private transitions: Map<VerificationEvent, StateTransition> = new Map<VerificationEvent, StateTransition>([
    ['document_upload', {
      from: ['pending'],
      to: 'document_uploaded'
    }],
    ['ocr_success', {
      from: ['document_uploaded', 'ocr_processing'],
      to: 'ocr_completed'
    }],
    ['ocr_failure', {
      from: ['document_uploaded', 'ocr_processing'],
      to: 'manual_review'
    }],
    ['back_id_upload', {
      from: ['ocr_completed'],
      to: 'back_id_processing'
    }],
    ['cross_validation_success', {
      from: ['back_id_processing'],
      to: 'cross_validation_completed',
      validations: [(ctx: any) => ctx.cross_validation_score >= 0.7]
    }],
    ['cross_validation_failure', {
      from: ['back_id_processing'],
      to: 'failed'
    }],
    ['live_capture_upload', {
      from: ['ocr_completed', 'cross_validation_completed'],
      to: 'live_capture_processing'
    }],
    ['face_match_success', {
      from: ['live_capture_processing', 'face_matching'],
      to: 'liveness_checking',
      validations: [(ctx: any) => ctx.face_match_score >= (ctx.is_sandbox ? 0.8 : 0.85)]
    }],
    ['face_match_failure', {
      from: ['live_capture_processing', 'face_matching'],
      to: 'failed'
    }],
    ['liveness_success', {
      from: ['liveness_checking'],
      to: 'verified',
      validations: [(ctx: any) => ctx.liveness_score >= (ctx.is_sandbox ? 0.65 : 0.75)]
    }],
    ['liveness_failure', {
      from: ['liveness_checking'],
      to: 'failed'
    }],
    ['manual_review_required', {
      from: ['pending', 'document_uploaded', 'ocr_processing', 'back_id_processing', 'live_capture_processing'],
      to: 'manual_review'
    }]
  ]);

  canTransition(currentState: VerificationState, event: VerificationEvent): boolean {
    const transition = this.transitions.get(event);
    if (!transition) return false;
    
    return transition.from.includes(currentState);
  }

  transition(
    currentState: VerificationState, 
    event: VerificationEvent, 
    context: any = {}
  ): { success: boolean; newState: VerificationState; error?: string } {
    const transition = this.transitions.get(event);
    
    if (!transition) {
      return {
        success: false,
        newState: currentState,
        error: `Unknown event: ${event}`
      };
    }

    if (!transition.from.includes(currentState)) {
      return {
        success: false,
        newState: currentState,
        error: `Invalid transition from ${currentState} on event ${event}`
      };
    }

    // Run validations if present
    if (transition.validations) {
      for (const validation of transition.validations) {
        if (!validation(context)) {
          return {
            success: false,
            newState: currentState,
            error: `Validation failed for transition ${currentState} -> ${transition.to}`
          };
        }
      }
    }

    logger.info(`State transition: ${currentState} -> ${transition.to}`, {
      event,
      verificationId: context.verification_id
    });

    return {
      success: true,
      newState: transition.to
    };
  }

  getValidTransitions(currentState: VerificationState): VerificationEvent[] {
    const validEvents: VerificationEvent[] = [];
    
    for (const [event, transition] of this.transitions) {
      if (transition.from.includes(currentState)) {
        validEvents.push(event);
      }
    }
    
    return validEvents;
  }
}