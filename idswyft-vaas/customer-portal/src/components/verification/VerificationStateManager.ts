// Robust verification state management
import { VerificationStep, VerificationStatus, VerificationState } from '../../types/verification';

type StateUpdateListener = (state: VerificationState) => void;

export class VerificationStateManager {
  private state: VerificationState;
  private listeners: StateUpdateListener[] = [];

  constructor(sessionToken: string) {
    this.state = {
      sessionToken,
      currentStep: VerificationStep.WELCOME,
      status: VerificationStatus.PENDING,
      documents: {},
      crossValidation: {
        completed: false
      },
      liveCapture: {
        completed: false,
        processed: false
      }
    };
  }

  // State getters
  getState(): VerificationState {
    return { ...this.state };
  }

  getCurrentStep(): VerificationStep {
    return this.state.currentStep;
  }

  getStatus(): VerificationStatus {
    return this.state.status;
  }

  // State setters
  private updateState(updates: Partial<VerificationState>) {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
    console.log('🔄 State updated:', this.state.currentStep, this.state.status);
  }

  setVerificationId(verificationId: string) {
    this.updateState({ verificationId });
  }

  setError(error: string) {
    this.updateState({
      error,
      status: VerificationStatus.FAILED
    });
  }

  clearError() {
    this.updateState({ error: undefined });
  }

  // Step transitions
  moveToStep(step: VerificationStep, status: VerificationStatus = VerificationStatus.PENDING) {
    this.updateState({
      currentStep: step,
      status,
      error: undefined
    });
  }

  // Document management
  setFrontDocument(file: File, type: string) {
    this.updateState({
      documents: {
        ...this.state.documents,
        front: {
          file,
          type,
          uploaded: false,
          processed: false
        }
      }
    });
  }

  setFrontDocumentUploaded() {
    if (this.state.documents.front) {
      this.updateState({
        documents: {
          ...this.state.documents,
          front: {
            ...this.state.documents.front,
            uploaded: true
          }
        }
      });
    }
  }

  setFrontDocumentProcessed(ocrData: any) {
    if (this.state.documents.front) {
      this.updateState({
        documents: {
          ...this.state.documents,
          front: {
            ...this.state.documents.front,
            processed: true,
            ocrData
          }
        }
      });
    }
  }

  setBackDocument(file: File, type: string) {
    this.updateState({
      documents: {
        ...this.state.documents,
        back: {
          file,
          type,
          uploaded: false,
          processed: false
        }
      }
    });
  }

  setBackDocumentUploaded() {
    if (this.state.documents.back) {
      this.updateState({
        documents: {
          ...this.state.documents,
          back: {
            ...this.state.documents.back,
            uploaded: true
          }
        }
      });
    }
  }

  setBackDocumentProcessed(barcodeData: any) {
    if (this.state.documents.back) {
      this.updateState({
        documents: {
          ...this.state.documents,
          back: {
            ...this.state.documents.back,
            processed: true,
            barcodeData
          }
        }
      });
    }
  }

  // Cross validation
  setCrossValidationCompleted(passed: boolean, score: number, results: any) {
    this.updateState({
      crossValidation: {
        completed: true,
        passed,
        score,
        results
      }
    });
  }

  // Live capture
  setLiveCaptureCompleted() {
    this.updateState({
      liveCapture: {
        ...this.state.liveCapture,
        completed: true
      }
    });
  }

  setLiveCaptureProcessed(faceMatchScore: number, livenessScore: number) {
    this.updateState({
      liveCapture: {
        completed: true,
        processed: true,
        faceMatchScore,
        livenessScore
      }
    });
  }

  // Final result
  setFinalResult(status: 'verified' | 'failed' | 'manual_review', reason?: string) {
    this.updateState({
      finalResult: {
        status,
        reason,
        completedAt: new Date()
      },
      currentStep: VerificationStep.VERIFICATION_COMPLETE,
      status: status === 'verified' ? VerificationStatus.VERIFIED :
              status === 'failed' ? VerificationStatus.FAILED :
              VerificationStatus.MANUAL_REVIEW
    });
  }

  // Conditions for step progression
  canMoveToBackDocumentUpload(): boolean {
    return this.state.documents.front?.uploaded && this.state.documents.front?.processed;
  }

  canMoveToCrossValidation(): boolean {
    return this.state.documents.back?.uploaded && this.state.documents.back?.processed;
  }

  canMoveToLiveCapture(): boolean {
    return this.state.crossValidation.completed && this.state.crossValidation.passed;
  }

  canMoveToComplete(): boolean {
    return this.state.liveCapture.completed && this.state.liveCapture.processed;
  }

  // Listeners
  addListener(listener: StateUpdateListener) {
    this.listeners.push(listener);
  }

  removeListener(listener: StateUpdateListener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }
}