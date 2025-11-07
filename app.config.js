const dotenv = require('dotenv');
dotenv.config();

const packageJson = require('./package.json');

module.exports = ({ config }) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';

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

  // Check for missing required variables (fail build unless in test mode)
  const missingRequired = requiredVars.filter(varName => !process.env[varName]);

  if (missingRequired.length > 0 && !isTest) {
    console.error('\n❌ BUILD ERROR: Missing required environment variables:');
    missingRequired.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n💡 Solution:');
    console.error('   1. Copy .env.example to .env: cp .env.example .env');
    console.error('   2. Fill in all required variables');
    console.error(
      '   3. See README.md, .env.example, or ALERT_DELIVERY_SETUP.md for detailed setup instructions\n',
    );
    process.exit(1); // Fail the build
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
        (() => {
          try {
            const appJson = require('./app.json');
            return appJson.expo.ios.buildNumber;
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
    apple: {
      appleTeamId: process.env.APPLE_TEAM_ID || '',
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
      compileSdkVersion: 35,
      targetSdkVersion: 35,
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
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#ffffff',
          sounds: [
            // You can add custom sound files here if you have them
          ],
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow $(PRODUCT_NAME) to access your photos.',
          cameraPermission: 'Allow $(PRODUCT_NAME) to access your camera.',
        },
      ],
      'expo-build-properties',
      'expo-font',
      // Note: Apple Authentication is handled as a dependency, not a plugin
      // Note: react-native-reanimated/plugin should be in babel.config.js, not here
    ],
    extra: {
      ...config.extra,
      // Environment variables
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
      FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
      FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
      FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID,
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
        projectId: '1dd584f5-6522-4df5-ad51-076b07b3d09c',
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
        url: 'https://u.expo.dev/1dd584f5-6522-4df5-ad51-076b07b3d09c',
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
