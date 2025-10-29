module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  
  // Test patterns
  testMatch: [
    '**/__tests__/**/*.test.{js,ts,tsx}',
    '**/src/**/__tests__/**/*.test.{js,ts,tsx}',
  ],
  
  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Coverage disabled
  collectCoverage: false,
  
  // Test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest-setup.ts'],
  
  // Global variables
  globals: {
    __DEV__: true,
  },
};
