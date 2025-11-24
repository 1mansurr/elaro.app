// Jest presetup file - runs before jest-expo's setup
// This ensures mocks are initialized before jest-expo tries to use them

// Initialize global __DEV__ flag early
(global as any).__DEV__ = true;

// Note: Manual mock for react-native/Libraries/BatchedBridge/NativeModules
// is in __mocks__/react-native/Libraries/BatchedBridge/NativeModules.js
// Jest will automatically use this mock when the module is required

// Mock React Native early to prevent Object.defineProperty errors
// Note: NativeModules is now handled by the manual mock in __mocks__
(global as any).ReactNative = {
  Platform: {
    OS: 'ios',
    select: (obj: any) => obj.ios || obj.default,
  },
  InteractionManager: {
    runAfterInteractions: (callback: () => void) => callback(),
  },
};

// Ensure performance API exists
if (typeof (global as any).performance === 'undefined') {
  (global as any).performance = {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    getEntriesByType: () => [],
    getEntriesByName: () => [],
    clearMarks: () => {},
    clearMeasures: () => {},
    memory: {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
    },
  };
}

// Ensure window object exists for jsdom
if (typeof (global as any).window === 'undefined') {
  (global as any).window = global;
}
