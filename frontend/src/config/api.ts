// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Get the production URL for documentation (remove localhost for docs)
export const getDocumentationApiUrl = () => {
  if (API_BASE_URL.includes('localhost')) {
    return 'https://api.idswyft.app';
  }
  return API_BASE_URL;
};

console.log('🔧 API Base URL:', API_BASE_URL);