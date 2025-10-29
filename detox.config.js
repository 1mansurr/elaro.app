/** @type {import('detox').DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js',
      '--maxWorkers': '2', // Parallelization: run up to 2 test suites concurrently
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/Elaro.app',
      build: 'xcodebuild -workspace ios/Elaro.xcworkspace -scheme Elaro -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/Elaro.app',
      build: 'xcodebuild -workspace ios/Elaro.xcworkspace -scheme Elaro -configuration Release -sdk iphonesimulator -derivedDataPath ios/build',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 14',
        os: 'iOS 17.5',
      },
    },
  },
  configurations: {
    'ios.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'ios.release': {
      device: 'simulator',
      app: 'ios.release',
    },
  },
};

