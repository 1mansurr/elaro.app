const dotenv = require('dotenv');
dotenv.config();

module.exports = ({ config }) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    ...config,
    name: 'Elaro',
    slug: 'elaro',
    scheme: 'elaro',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      backgroundColor: '#0A2540' // Dark, professional blue
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      ...config.ios,
      supportsTablet: true,
      bundleIdentifier: 'com.elaro.app',
      buildNumber: process.env.EXPO_PUBLIC_IOS_BUILD_NUMBER || '1',
      usesAppleSignIn: true, // Enable Apple Sign-In capability
      // iOS-specific configurations
      infoPlist: {
        ...config.ios?.infoPlist,
        NSUserTrackingUsageDescription: 'This app uses tracking to provide personalized learning experiences.',
        NSCameraUsageDescription: 'This app needs camera access for profile photos and document scanning.',
        NSPhotoLibraryUsageDescription: 'This app needs photo library access to save and share learning materials.',
      },
    },
    apple: {
      appleTeamId: '9V6PYB626C' // Your Apple Developer Team ID
    },
    android: {
      ...config.android,
      package: 'com.elaro.app',
      versionCode: parseInt(process.env.EXPO_PUBLIC_ANDROID_VERSION_CODE || '1'),
      googleServicesFile: './google-services.json',
      compileSdkVersion: 35,
      targetSdkVersion: 35,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#4A90E2'
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
      bundler: 'metro'
    },
    plugins: [
      [
        'expo-notifications',
        {
          'icon': './assets/notification-icon.png',
          'color': '#ffffff',
          'sounds': [
            // You can add custom sound files here if you have them
          ]
        }
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
      // Paystack configuration
      EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY: process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY,
      // Note: PAYSTACK_SECRET_KEY should NOT be exposed to the client - it's only used server-side
      EXPO_PUBLIC_PAYSTACK_PLAN_CODE: process.env.EXPO_PUBLIC_PAYSTACK_PLAN_CODE,
      // App configuration
      EXPO_PUBLIC_APP_NAME: process.env.EXPO_PUBLIC_APP_NAME || 'Elaro',
      EXPO_PUBLIC_APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
      // Build environment
      NODE_ENV: process.env.NODE_ENV || 'development',
      EXPO_PLATFORM: process.env.EXPO_PLATFORM,
      // EAS configuration
      eas: {
        projectId: '1dd584f5-6522-4df5-ad51-076b07b3d09c'
      }
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
        url: 'https://u.expo.dev/1dd584f5-6522-4df5-ad51-076b07b3d09c'
      },
    }),
  };
};
