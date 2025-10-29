module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  
  // Test patterns
  testMatch: [
    '**/__tests__/unit/**/*.test.{js,ts,tsx}',
    '**/__tests__/integration/**/*.test.{js,ts,tsx}',
    '**/src/**/__tests__/**/*.test.{js,ts,tsx}',
    '**/src/**/__tests__/**/*.spec.{js,ts,tsx}'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup/jest-setup.ts'
  ],
  
  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1',
  },
  
  // Coverage configuration - disabled for now to fix test issues
  collectCoverage: false,
  
  // Ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  
  // Test timeout
  testTimeout: 15000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Module directories
  moduleDirectories: [
    'node_modules',
    'src',
    '__tests__'
  ]
};
