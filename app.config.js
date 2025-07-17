import { ConfigContext } from 'expo/config';
export default ({ config }) => ({
  ...config,

  name: 'ELARO',
  slug: 'elaro-app',
  version: '1.0.0',

  android: {
    package: 'com.elaro.app',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#2C5EFF',
    },
    permissions: [
      'android.permission.INTERNET',
      'android.permission.VIBRATE',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.POST_NOTIFICATIONS',
    ],
    googleServicesFile: './google-services.json',
  },

  web: {
    bundler: 'metro',
    favicon: './assets/favicon.png',
  },

  plugins: [
    [
      'expo-notifications',
      {
        color: '#2C5EFF',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 34,
          targetSdkVersion: 34,
          buildToolsVersion: '34.0.0',
        },
      },
    ],
  ],

  extra: {
    eas: {
      projectId: '1c94fab8-6678-47fe-94e4-f2769fbfe428',
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    paystackPublicKey: process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY,
  },

  runtimeVersion: {
    policy: 'appVersion',
  },

  updates: {
    url: process.env.EXPO_PUBLIC_UPDATES_URL,
  },

  owner: 'elaro',
});
