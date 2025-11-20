const dotenv = require('dotenv');
dotenv.config();

const packageJson = require('./package.json');

module.exports = ({ config }) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';

  // Detect if we're in config reading phase (when EAS runs 'npx expo config' locally)
  // During this phase, EAS secrets are not available yet - they're injected during actual build
  // We detect this by checking if we're NOT in a build environment
  const isConfigReading =
    !process.env.EAS_BUILD &&
    !process.env.EAS_BUILD_RUNNING &&
    !process.env.CI &&
    process.argv.some(arg => arg.includes('config'));

  // Required environment variables - app will not work without these
  const requiredVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  ];

  // Recommended environment variables - app works but with limited functionality
  const recommendedVars = [
    'EXPO_PUBLIC_REVENUECAT_APPLE_KEY',
    'EXPO_PUBLIC_SENTRY_DSN',
    'EXPO_PUBLIC_MIXPANEL_TOKEN',
  ];

  // Check for missing required variables
  const missingRequired = requiredVars.filter(varName => !process.env[varName]);

  // Only fail during actual build phase, not during config reading
  // EAS secrets are injected during build, so they won't be available during 'npx expo config'
  if (missingRequired.length > 0 && !isTest && !isConfigReading) {
    console.error('\n❌ BUILD ERROR: Missing required environment variables:');
    missingRequired.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n💡 Solution:');
    console.error(
      '   1. Set EAS secrets: eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value your-value',
    );
    console.error(
      '   2. Set EAS secrets: eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value your-value',
    );
    console.error('   3. Or ensure .env file exists with these variables');
    console.error(
      '   4. See README.md, .env.example, or ALERT_DELIVERY_SETUP.md for detailed setup instructions\n',
    );
    process.exit(1); // Fail the build
  }

  // Warn during config reading phase (but don't fail - EAS will inject secrets during build)
  if (missingRequired.length > 0 && isConfigReading && !isTest) {
    console.warn(
      '\n⚠️  WARNING: Required environment variables not found during config reading:',
    );
    missingRequired.forEach(varName => {
      console.warn(`   - ${varName}`);
    });
    console.warn(
      '   This is OK - EAS will inject these during the build phase',
    );
    console.warn(
      '   Make sure they are set as EAS secrets for your build profile\n',
    );
  }

  // Warn about missing recommended variables
  const missingRecommended = recommendedVars.filter(
    varName => !process.env[varName],
  );

  if (missingRecommended.length > 0 && !isTest) {
    console.warn('\n⚠️  WARNING: Missing recommended environment variables:');
    missingRecommended.forEach(varName => {
      console.warn(`   - ${varName}`);
    });
    console.warn('   App will work but with limited functionality');
    console.warn('   See .env.example for details\n');
  }

  // Validate Apple Sign-In variables (only warn if missing)
  if (!process.env.APPLE_TEAM_ID && !isTest) {
    console.warn('⚠️  Warning: APPLE_TEAM_ID not set in environment variables');
    console.warn('   Apple Sign-In will not work without this');
  }

  return {
    ...config,
    name: 'Elaro',
    slug: 'elaro',
    scheme: 'elaro',
    version: packageJson.version,
    orientation: 'portrait',
    icon: './assets/icon.png',
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
        process.env.EXPO_PUBLIC_IOS_BUILD_NUMBER ||
        process.env.EAS_BUILD_NUMBER ||
        (() => {
          // For production builds, ensure we have a valid build number
          if (process.env.EAS_BUILD_PROFILE === 'production' || isProduction) {
            const buildNum =
              process.env.EXPO_PUBLIC_IOS_BUILD_NUMBER ||
              process.env.EAS_BUILD_NUMBER ||
              '1';
            return buildNum;
          }
          // For development/preview builds, try app.json or default to '1'
          try {
            const appJson = require('./app.json');
            return appJson.expo.ios.buildNumber || '1';
          } catch {
            return '1';
          }
        })(),
      usesAppleSignIn: true, // Enable Apple Sign-In capability
      // iOS-specific configurations
      infoPlist: {
        ...config.ios?.infoPlist,
        NSUserTrackingUsageDescription:
          'This app uses tracking to provide personalized learning experiences.',
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
      // googleServicesFile: './google-services.json', // Commented out - file not found
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#4A90E2',
      },
      // Android-specific configurations
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
      [
        'expo-build-properties',
        {
          ios: {
            // Ensure Sentry CocoaPod is included
            useFrameworks: 'static',
          },
        },
      ],
      // Temporarily commented out for binary search test (not in dependencies 53-61)
      // [
      //   'expo-notifications',
      //   {
      //     icon: './assets/notification-icon.png',
      //     color: '#ffffff',
      //     sounds: [
      //       // You can add custom sound files here if you have them
      //     ],
      //   },
      // ],
      // [
      //   'expo-image-picker',
      //   {
      //     photosPermission: 'Allow $(PRODUCT_NAME) to access your photos.',
      //     cameraPermission: 'Allow $(PRODUCT_NAME) to access your camera.',
      //   },
      // ],
      // Temporarily commented out for binary search test (packages in first 35)
      // 'expo-font',
      // Note: Apple Authentication is handled as a dependency, not a plugin
      // Note: react-native-reanimated/plugin should be in babel.config.js, not here
    ],
    extra: {
      ...config.extra,
      // Supabase configuration
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      // RevenueCat configuration
      EXPO_PUBLIC_REVENUECAT_APPLE_KEY:
        process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY,
      // Note: RevenueCat secret keys should NOT be exposed to the client - they're only used server-side
      // Sentry configuration
      EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
      // Mixpanel configuration
      EXPO_PUBLIC_MIXPANEL_TOKEN: process.env.EXPO_PUBLIC_MIXPANEL_TOKEN,
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
      // Explicitly disable updates in development
      updates: {
        enabled: false,
      },
    }),
    // Production-specific configurations
    ...(isProduction && {
      updates: {
        url: 'https://u.expo.dev/7a43b16d-f54c-4ee5-83b5-3323eb4e27fc',
        enabled: true,
        checkAutomatically: 'ON_ERROR_RECOVERY', // Check on error in production
        fallbackToCacheTimeout: 3000,
        requestHeaders: {
          'expo-channel-name':
            process.env.EXPO_PUBLIC_UPDATE_CHANNEL || 'staging',
        },
      },
    }),
  };
};
