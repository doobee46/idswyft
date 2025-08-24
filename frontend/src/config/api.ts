// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Determine if we should use sandbox mode
export const shouldUseSandbox = (apiKey?: string) => {
  // First check explicit environment override
  const sandboxOverride = import.meta.env.VITE_SANDBOX_MODE;
  if (sandboxOverride !== undefined) {
    return sandboxOverride === 'true';
  }
  
  // For local development, always use sandbox mode
  // This ensures that sandbox API keys work properly in development
  const isLocalDevelopment = API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1');
  if (isLocalDevelopment) {
    return true;
  }
  
  // In production, check the environment or default to false
  return false;
};

// Get the production URL for documentation (remove localhost for docs)
export const getDocumentationApiUrl = () => {
  if (API_BASE_URL.includes('localhost')) {
    return 'https://api.idswyft.app';
  }
  return API_BASE_URL;
};

console.log('🔧 API Base URL:', API_BASE_URL);
console.log('🔧 Sandbox Mode:', shouldUseSandbox());