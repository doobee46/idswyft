// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Determine if we should use sandbox mode
export const shouldUseSandbox = () => {
  // Use sandbox mode for local development
  const isLocalDevelopment = API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1');
  // Allow override via environment variable
  const sandboxOverride = import.meta.env.VITE_SANDBOX_MODE;
  
  if (sandboxOverride !== undefined) {
    return sandboxOverride === 'true';
  }
  
  return isLocalDevelopment;
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