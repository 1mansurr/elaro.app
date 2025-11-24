/** @type {import('detox').DetoxConfig} */
module.exports = {
  testRunner: 'jest',
  runnerConfig: 'e2e/jest.config.js',
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/ELARO.app',
      build:
        'xcodebuild -workspace ios/ELARO.xcworkspace -scheme ELARO -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build -destination "platform=iOS Simulator,name=iPhone 16"',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 16',
        // This should be the simulator name you found earlier
      },
    },
  },
  configurations: {
    'ios.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
  },
};
