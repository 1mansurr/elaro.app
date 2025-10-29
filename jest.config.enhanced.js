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
    // Mock problematic modules
    '^@expo/vector-icons$': '<rootDir>/__tests__/__mocks__/expo-vector-icons.js',
    '^expo-font$': '<rootDir>/__tests__/__mocks__/expo-font.js',
    '^expo-constants$': '<rootDir>/__tests__/__mocks__/expo-constants.js',
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
  setupFilesAfterEnv: ['<rootDir>/jest.setup.enhanced.js'],
  
  // Global variables
  globals: {
    __DEV__: true,
  },
};
