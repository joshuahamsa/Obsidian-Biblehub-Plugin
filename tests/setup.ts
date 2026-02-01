// Global test setup for Jest tests
import { expect } from '@jest/globals';

// Extend Jest matchers if needed
expect.extend({
  toBeValidStrongId(received: string) {
    const pass = typeof received === 'string' && /^[GH]\d+$/.test(received);
    return {
      message: () => pass 
        ? `expected ${received} not to be a valid Strong ID`
        : `expected ${received} to be a valid Strong ID (G# or H#)`,
      pass,
    };
  },
  
  toBeValidGreek(received: string) {
    const pass = typeof received === 'string' && /^g/i.test(received);
    return {
      message: () => pass
        ? `expected ${received} not to start with g/G`
        : `expected ${received} to start with g/G (Greek)`,
      pass,
    };
  },
  
  toBeValidHebrew(received: string) {
    const pass = typeof received === 'string' && /^h/i.test(received);
    return {
      message: () => pass
        ? `expected ${received} not to start with h/H`
        : `expected ${received} to start with h/H (Hebrew)`,
      pass,
    };
  }
});

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Set up global test timeout
jest.setTimeout(10000);