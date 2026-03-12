const packageJson = require('./package.json');

module.exports = ({ config }) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    ...config,
    name: 'Elaro',
    slug: 'elaro',
    scheme: 'elaro',
    version: packageJson.version,
    orientation: 'portrait',
    icon: './assets/wordmark.png',
    userInterfaceStyle: 'light',
    splash: {
      backgroundColor: '#2C5EFF', // App primary blue - matches brand color
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      ...config.ios,
      supportsTablet: true,
      bundleIdentifier: 'com.elaro.app',
      buildNumber:
        // Priority order:
        // 1. Explicit env var override (highest priority, for CI/CD)
        process.env.EXPO_PUBLIC_IOS_BUILD_NUMBER ||
        // 2. EAS-managed build number (set by EAS autoIncrement or build:version:set)
        process.env.EAS_BUILD_NUMBER ||
        // 3. Value from app.json (fallback for local development)
        (() => {
          try {
            const appJson = require('./app.json');
            if (appJson.expo?.ios?.buildNumber) {
              return appJson.expo.ios.buildNumber;
            }
          } catch {
            // app.json not found or invalid
          }
          // Only default to '1' if nothing else is available
          return '1';
        })(),
      infoPlist: {
        ...config.ios?.infoPlist,
        NSCameraUsageDescription:
          'This app needs camera access for profile photos and document scanning.',
        NSPhotoLibraryUsageDescription:
          'This app needs photo library access to save and share learning materials.',
      },
    },
    android: {
      ...config.android,
      package: 'com.elaro.app',
      versionCode: parseInt(
        process.env.EXPO_PUBLIC_ANDROID_VERSION_CODE ||
          (() => {
            try {
              const appJson = require('./app.json');
              return appJson.expo.android.versionCode;
            } catch {
              return 1;
            }
          })(),
      ),
      adaptiveIcon: {
        foregroundImage: './assets/wordmark.png',
        backgroundColor: '#2C5EFF', // App primary blue
      },
      permissions: [
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.VIBRATE',
        'android.permission.RECEIVE_BOOT_COMPLETED',
        'android.permission.WAKE_LOCK',
      ],
    },
    web: {
      ...config.web,
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    plugins: [
      'expo-dev-client',
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
            deploymentTarget: '15.1',
            buildSettings: {
              CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER: 'NO',
              CLANG_WARN_NULLABILITY: 'YES',
              CLANG_WARN_NULLABILITY_COMPLETENESS: 'NO',
            },
          },
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#ffffff',
          sounds: [],
        },
      ],
      'expo-font',
    ],
    extra: {
      ...config.extra,
      // App configuration
      EXPO_PUBLIC_APP_NAME: process.env.EXPO_PUBLIC_APP_NAME || 'Elaro',
      EXPO_PUBLIC_APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
      // Build environment
      NODE_ENV: process.env.NODE_ENV || 'development',
      EXPO_PLATFORM: process.env.EXPO_PLATFORM,
      // EAS configuration
      eas: {
        projectId: '7a43b16d-f54c-4ee5-83b5-3323eb4e27fc',
      },
    },
    // Development-specific configurations
    ...(isDevelopment && {
      updates: {
        enabled: false,
      },
    }),
    // Production-specific configurations
    ...(isProduction && {
      updates: {
        enabled: false,
      },
    }),
  };
};
