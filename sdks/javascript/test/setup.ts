/**
 * Test setup file for Jest
 */

// Global test configuration
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console output in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test helpers
global.testHelpers = {
  createMockFile: (size = 1024) => {
    return Buffer.alloc(size, 0);
  },
  
  createMockPNG: () => {
    // Minimal valid PNG
    return Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x44, 0x41, 0x54,
      0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
      0x73, 0x75, 0x01, 0x18, 0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
  }
};

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidVerificationResult(): R;
    }
  }
  
  var testHelpers: {
    createMockFile: (size?: number) => Buffer;
    createMockPNG: () => Buffer;
  };
}

expect.extend({
  toBeValidVerificationResult(received) {
    const pass = received && 
      typeof received.id === 'string' &&
      ['pending', 'verified', 'failed', 'manual_review'].includes(received.status) &&
      ['document', 'selfie', 'combined'].includes(received.type);
    
    if (pass) {
      return {
        message: () => `Expected verification result to be invalid`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected verification result to have valid id, status, and type`,
        pass: false,
      };
    }
  },
});