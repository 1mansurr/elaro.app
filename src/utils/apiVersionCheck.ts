import { Alert } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/services/supabase';

// Semantic versioning comparison
interface Version {
  major: number;
  minor: number;
  patch: number;
}

const APP_VERSION = Constants.expoConfig?.extra?.EXPO_PUBLIC_APP_VERSION || '1.0.0';
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
  maxVersion: string
): boolean {
  const current = parseVersion(currentVersion);
  const min = parseVersion(minVersion);
  const max = parseVersion(maxVersion);

  // Current must be >= min and < max
  return compareVersions(current, min) >= 0 && compareVersions(current, max) < 0;
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
  try {
    // Get API version from health check
    const { data, error } = await supabase.functions.invoke('health-check', {
      method: 'GET',
    });

    if (error || !data) {
      console.warn('Could not check API version:', error);
      return {
        compatible: true, // Assume compatible if we can't check
        appVersion: APP_VERSION,
        action: 'none',
      };
    }

    const apiVersion = data.version || '1.0.0';
    const compatible = isVersionCompatible(apiVersion, MIN_API_VERSION, MAX_API_VERSION);

    if (!compatible) {
      const apiVer = parseVersion(apiVersion);
      const minVer = parseVersion(MIN_API_VERSION);
      const maxVer = parseVersion(MAX_API_VERSION);

      // API is too old
      if (compareVersions(apiVer, minVer) < 0) {
        return {
          compatible: false,
          apiVersion,
          appVersion: APP_VERSION,
          action: 'update_required',
          message: 'The server API is outdated. Please contact support.',
        };
      }

      // API is too new (breaking changes)
      if (compareVersions(apiVer, maxVer) >= 0) {
        return {
          compatible: false,
          apiVersion,
          appVersion: APP_VERSION,
          action: 'update_required',
          message: 'Your app version is outdated. Please update to the latest version.',
        };
      }
    }

    // Check if update is recommended (minor version difference)
    const apiVer = parseVersion(apiVersion);
    const appVer = parseVersion(APP_VERSION);

    if (apiVer.minor > appVer.minor && apiVer.major === appVer.major) {
      return {
        compatible: true,
        apiVersion,
        appVersion: APP_VERSION,
        action: 'update_recommended',
        message: 'A new version of ELARO is available with improvements and bug fixes.',
      };
    }

    return {
      compatible: true,
      apiVersion,
      appVersion: APP_VERSION,
      action: 'none',
    };
  } catch (error) {
    console.error('Error checking API version:', error);
    return {
      compatible: true,
      appVersion: APP_VERSION,
      action: 'none',
    };
  }
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
      { cancelable: false }
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
      ]
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

