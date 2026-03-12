import { Alert } from 'react-native';
import Constants from 'expo-constants';

// Semantic versioning comparison
interface Version {
  major: number;
  minor: number;
  patch: number;
}

const APP_VERSION =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_APP_VERSION || '1.0.0';
const MIN_API_VERSION = '1.0.0';
const MAX_API_VERSION = '2.0.0'; // Breaking changes at v2

/**
 * Parse semantic version string
 */
function parseVersion(versionString: string): Version {
  const parts = versionString.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  };
}

/**
 * Compare two versions
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
function compareVersions(v1: Version, v2: Version): number {
  if (v1.major !== v2.major) return v1.major - v2.major;
  if (v1.minor !== v2.minor) return v1.minor - v2.minor;
  return v1.patch - v2.patch;
}

/**
 * Check if version is within compatible range
 */
export function isVersionCompatible(
  currentVersion: string,
  minVersion: string,
  maxVersion: string,
): boolean {
  const current = parseVersion(currentVersion);
  const min = parseVersion(minVersion);
  const max = parseVersion(maxVersion);

  // Current must be >= min and < max
  return (
    compareVersions(current, min) >= 0 && compareVersions(current, max) < 0
  );
}

/**
 * Check API version compatibility
 */
export async function checkAPIVersionCompatibility(): Promise<{
  compatible: boolean;
  apiVersion?: string;
  appVersion: string;
  action?: 'update_required' | 'update_recommended' | 'none';
  message?: string;
}> {
  // Offline mode — assume compatible
  return { compatible: true, appVersion: APP_VERSION, action: 'none' };
}

/**
 * Show update prompt if needed
 */
export async function promptForUpdateIfNeeded(): Promise<void> {
  const result = await checkAPIVersionCompatibility();

  if (result.action === 'update_required') {
    Alert.alert(
      'Update Required',
      result.message || 'Please update your app to continue using ELARO.',
      [
        {
          text: 'Update Now',
          onPress: () => {
            // Open app store link
            // Linking.openURL(Platform.OS === 'ios' ? IOS_APP_STORE_URL : ANDROID_PLAY_STORE_URL);
            console.log('Would open app store');
          },
        },
      ],
      { cancelable: false },
    );
  } else if (result.action === 'update_recommended') {
    Alert.alert(
      'Update Available',
      result.message || 'A new version is available.',
      [
        {
          text: 'Later',
          style: 'cancel',
        },
        {
          text: 'Update',
          onPress: () => {
            console.log('Would open app store');
          },
        },
      ],
    );
  }
}

/**
 * Get version info for display
 */
export function getVersionInfo(): {
  appVersion: string;
  buildNumber: string;
  environment: string;
} {
  return {
    appVersion: APP_VERSION,
    buildNumber: Constants.expoConfig?.version || '1.0.0',
    environment: Constants.expoConfig?.extra?.NODE_ENV || 'development',
  };
}
