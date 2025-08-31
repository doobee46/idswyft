// Simple logger utility
export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data || '');
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data || '');
  },
  
  error: (message: string, data?: any) => {
    console.error(`[ERROR] ${message}`, data || '');
  },
  
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  }
};