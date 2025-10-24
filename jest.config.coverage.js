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
  
  // Stricter coverage thresholds
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Critical services need higher coverage
    'src/services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Auth and permissions need highest coverage
    'src/features/auth/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    // Notification system needs high coverage
    'src/services/notifications/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
    'json-summary',
    'clover'
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
  moduleDirectories: [
    'node_modules',
    'src',
    '__tests__'
  ],
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
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
    '/Thumbs.db'
  ]
};
