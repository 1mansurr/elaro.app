// Mock for expo-modules-core/src/polyfill/dangerous-internal
// jest-expo tries to call installExpoGlobalPolyfill() from this module
module.exports = {
  installExpoGlobalPolyfill: jest.fn(() => {
    // Initialize global.expo if it doesn't exist
    if (typeof globalThis.expo === 'undefined') {
      globalThis.expo = {
        EventEmitter: class EventEmitter {
          addListener() {}
          removeListener() {}
          emit() {}
        },
        NativeModule: class NativeModule {},
        SharedObject: class SharedObject {},
      };
    }
  }),
};
