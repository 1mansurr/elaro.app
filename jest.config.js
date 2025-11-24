module.exports = {
  preset: 'jest-expo',
  // Use jsdom for React Native components, but allow override for node tests
  testEnvironment: 'jsdom',

  // Test patterns
  testMatch: [
    '**/__tests__/unit/**/*.test.{js,ts,tsx}',
    '**/__tests__/integration/**/*.test.{js,ts,tsx}',
    '**/src/**/__tests__/**/*.test.{js,ts,tsx}',
    '**/src/**/__tests__/**/*.spec.{js,ts,tsx}',
    '**/tests/**/*.test.{js,ts,tsx}',
    '**/tests/**/*.contract.test.{js,ts,tsx}',
    '**/tests/**/*.rls.test.{js,ts,tsx}',
  ],

  // Setup files - run before jest-expo's setup
  setupFiles: ['<rootDir>/__tests__/setup/jest-presetup.ts'],

  // Setup files - run after jest-expo's setup
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest-setup.ts'],

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1',
  },

  // Coverage configuration - enabled with selective collection
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/**/index.{js,ts}',
    '!src/**/*.config.{js,ts}',
    '!src/**/types.{js,ts}',
  ],
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  coverageDirectory: 'coverage',

  // Ignore patterns - allow more React Native modules to be transformed
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-.*|@react-native.*|expo-modules-core|expo-.*))',
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
  moduleDirectories: ['node_modules', 'src', '__tests__'],

  // Global variables
  globals: {
    __DEV__: true,
  },
};
