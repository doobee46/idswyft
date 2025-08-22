// Main exports for the Idswyft Verification Component
export { default as EndUserVerification } from './EndUserVerification';
export type {
  VerificationProps,
  VerificationResult
} from './EndUserVerification';

// Utility functions
export const createVerificationUrl = (
  baseUrl: string,
  apiKey: string,
  userId: string,
  options?: {
    redirectUrl?: string;
    theme?: 'light' | 'dark';
    allowedDocuments?: string[];
  }
): string => {
  const params = new URLSearchParams({
    api_key: apiKey,
    user_id: userId,
    ...(options?.redirectUrl && { redirect_url: options.redirectUrl }),
    ...(options?.theme && { theme: options.theme }),
    ...(options?.allowedDocuments && { 
      allowed_documents: options.allowedDocuments.join(',') 
    })
  });
  
  return `${baseUrl}/user-verification?${params.toString()}`;
};

export const openVerificationPopup = (
  verificationUrl: string,
  options?: {
    width?: number;
    height?: number;
    onComplete?: (result: any) => void;
  }
): Window | null => {
  const width = options?.width || 500;
  const height = options?.height || 700;
  const left = (screen.width - width) / 2;
  const top = (screen.height - height) / 2;
  
  const popup = window.open(
    verificationUrl,
    'idswyft-verification',
    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
  );
  
  if (options?.onComplete) {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'VERIFICATION_COMPLETE') {
        options.onComplete!(event.data.result);
        popup?.close();
        window.removeEventListener('message', handleMessage);
      }
    };
    
    window.addEventListener('message', handleMessage);
  }
  
  return popup;
};