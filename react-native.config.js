module.exports = {
  dependencies: {
    '@sentry/react-native': {
      platforms: {
        ios: {
          // Sentry uses autolinking via podspec, no manual project needed
          // The podspec will be automatically discovered by CocoaPods
        },
      },
    },
  },
};
