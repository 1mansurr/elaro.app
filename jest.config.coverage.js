module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',

  // Test patterns
  testMatch: [
    '**/__tests__/unit/**/*.test.{js,ts,tsx}',
    '**/__tests__/integration/**/*.test.{js,ts,tsx}',
    '**/src/**/__tests__/**/*.test.{js,ts,tsx}',
    '**/src/**/__tests__/**/*.spec.{js,ts,tsx}',
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest-setup.ts'],

  // Transform TypeScript files
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1',
  },

  // Comprehensive coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/**/index.{js,ts}',
    '!src/**/*.config.{js,ts}',
    '!src/**/*.types.{js,ts}',
    '!src/**/constants.{js,ts}',
    '!src/**/types.{js,ts}',
  ],

  // Coverage thresholds - Phase 1 targets
  // Global minimum: 50%, Critical paths: 70%+
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
    // Critical paths require 70%+ coverage
    'src/features/auth/': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    'src/hooks/useTaskMutations.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    'src/services/syncManager.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    'src/navigation/': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // Critical services
    'src/services/': {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },

  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
    'json-summary',
    'clover',
  ],

  // Coverage directory
  coverageDirectory: 'coverage',

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
  moduleDirectories: ['node_modules', 'src', '__tests__'],

  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },

  // Coverage exclusions
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '/build/',
    '/android/',
    '/ios/',
    '/.expo/',
    '/.git/',
    '/__tests__/',
    '/__mocks__/',
    '/e2e/',
    '/scripts/',
    '/docs/',
    '/assets/',
    '/.github/',
    '/.vscode/',
    '/.idea/',
    '/*.config.js',
    '/*.config.ts',
    '/jest.config.*',
    '/metro.config.js',
    '/babel.config.js',
    '/tailwind.config.js',
    '/app.config.js',
    '/eas.json',
    '/firebase.json',
    '/package.json',
    '/package-lock.json',
    '/tsconfig.json',
    '/eslint.config.js',
    '/prettier.config.js',
    '/.gitignore',
    '/.env*',
    '/README.md',
    '/CHANGELOG.md',
    '/LICENSE',
    '/.DS_Store',
    '/Thumbs.db',
  ],
};
