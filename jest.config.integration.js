module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  
  // Only run integration tests
  testMatch: ['**/__tests__/integration/**/*.test.ts'],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/integration-setup.ts'],
  
  // Transform TypeScript files
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  
  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/services/**/*.ts',
    'src/utils/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
  ],
  
  // Ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  
  // Timeout for integration tests (longer than unit tests)
  testTimeout: 30000,
  
  // Don't run in parallel to avoid rate limiting
  maxWorkers: 1,
  
  // Verbose output for debugging
  verbose: true,
};

