// Manual mock for react-native NativeModules
// This is automatically used by Jest when the module is required

const mockNativeModules = {
  Linking: {
    openURL: jest.fn(() => Promise.resolve()),
    canOpenURL: jest.fn(() => Promise.resolve(true)),
    getInitialURL: jest.fn(() => Promise.resolve(null)),
  },
  // UIManager is required by jest-expo at line 121
  UIManager: {},
  // NativeUnimoduleProxy is required by jest-expo at line 119
  NativeUnimoduleProxy: {
    viewManagersMetadata: {},
    modulesConstants: {
      mockDefinition: {
        ExponentConstants: {
          experienceUrl: {
            mock: 'exp://192.168.1.200:8081',
          },
        },
      },
    },
  },
};

// Add ImageLoader and ImageViewManager that jest-expo expects
Object.defineProperty(mockNativeModules, 'ImageLoader', {
  configurable: true,
  enumerable: true,
  get: () => ({
    prefetchImage: jest.fn(),
    getSize: jest.fn((uri, success) =>
      process.nextTick(() => success(320, 240)),
    ),
  }),
});

Object.defineProperty(mockNativeModules, 'ImageViewManager', {
  configurable: true,
  enumerable: true,
  get: () => mockNativeModules.ImageLoader,
});

Object.defineProperty(mockNativeModules, 'LinkingManager', {
  configurable: true,
  enumerable: true,
  get: () => mockNativeModules.Linking,
});

module.exports = {
  __esModule: true,
  default: mockNativeModules,
};
