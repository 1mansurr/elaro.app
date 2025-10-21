/**
 * Integration Test Setup
 * 
 * This file runs before all integration tests to set up the test environment.
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Set test environment
process.env.NODE_ENV = 'test';

// Extend Jest timeout for integration tests
jest.setTimeout(30000);

// Mock console methods to reduce noise in test output
const originalWarn = console.warn;
const originalError = console.error;
const originalLog = console.log;

// Filter out known warnings
console.warn = (...args: any[]) => {
  const message = args[0];
  
  // Suppress known warnings
  if (
    typeof message === 'string' &&
    (message.includes('RevenueCat') ||
     message.includes('Mixpanel') ||
     message.includes('environment variables'))
  ) {
    return;
  }
  
  originalWarn(...args);
};

console.error = (...args: any[]) => {
  const message = args[0];
  
  // Suppress expected errors in tests
  if (
    typeof message === 'string' &&
    (message.includes('initialization failed') ||
     message.includes('not found in environment'))
  ) {
    return;
  }
  
  originalError(...args);
};

// Optionally suppress all logs in tests
if (process.env.SUPPRESS_TEST_LOGS === 'true') {
  console.log = () => {};
}

// Global test utilities
global.testUtils = {
  // Helper to wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to retry assertions
  retryAssert: async (assertion: () => void, maxAttempts = 3, delayMs = 1000) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        assertion();
        return;
      } catch (error) {
        if (i === maxAttempts - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  },
};

// Cleanup after all tests
afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
  console.log = originalLog;
});

console.log('🧪 Integration test environment initialized');

