import { describe, it, expect, jest } from '@jest/globals';

describe('Test Configuration', () => {
  it('should have Jest properly configured', () => {
    expect(typeof jest).toBe('object');
    expect(typeof describe).toBe('function');
    expect(typeof it).toBe('function');
    expect(typeof expect).toBe('function');
  });

  it('should support TypeScript testing', () => {
    // Verify that TypeScript types are available in tests
    const testString: string = 'test';
    expect(testString).toBe('test');
    
    const testNumber: number = 42;
    expect(testNumber).toBe(42);
  });

  it('should support async testing', async () => {
    const result = await Promise.resolve('async test');
    expect(result).toBe('async test');
  });
});