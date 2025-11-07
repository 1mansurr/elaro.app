module.exports = {
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
  testTimeout: 15000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },

  // Module file extensions
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],

  // Transform ignore patterns - be more specific
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@expo|expo|@react-navigation|react-navigation|@tanstack|react-query)/)',
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.smart.js'],

  // Global variables
  globals: {
    __DEV__: true,
  },
};
