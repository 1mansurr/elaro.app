/**
 * Permission Helpers
 *
 * Centralized utilities for handling app permissions consistently.
 * Provides a unified interface for requesting and checking permissions.
 */

import { Platform, Alert, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';

export type PermissionType =
  | 'camera'
  | 'photos'
  | 'notifications'
  | 'biometric';

export interface PermissionResult {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined' | 'blocked';
}

/**
 * Request a specific permission
 */
export async function requestPermission(
  type: PermissionType,
): Promise<PermissionResult> {
  try {
    switch (type) {
      case 'camera':
        const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
        return {
          granted: cameraResult.granted,
          canAskAgain: cameraResult.canAskAgain,
          status: cameraResult.status,
        };

      case 'photos':
        const photosResult =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        return {
          granted: photosResult.granted,
          canAskAgain: photosResult.canAskAgain,
          status: photosResult.status,
        };

      case 'notifications':
        const notificationResult =
          await Notifications.requestPermissionsAsync();
        return {
          granted: notificationResult.granted,
          canAskAgain: notificationResult.canAskAgain ?? true,
          status: notificationResult.status,
        };

      case 'biometric':
        // Note: Biometric authentication doesn't have a traditional permission
        // It's checked via device capabilities
        const biometricAvailable = await LocalAuthentication.hasHardwareAsync();
        if (!biometricAvailable) {
          return {
            granted: false,
            canAskAgain: false,
            status: 'denied',
          };
        }
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!enrolled) {
          return {
            granted: false,
            canAskAgain: false,
            status: 'undetermined',
          };
        }
        return {
          granted: true,
          canAskAgain: true,
          status: 'granted',
        };

      default:
        return {
          granted: false,
          canAskAgain: false,
          status: 'denied',
        };
    }
  } catch (error) {
    console.error(`Error requesting ${type} permission:`, error);
    return {
      granted: false,
      canAskAgain: false,
      status: 'denied',
    };
  }
}

/**
 * Check if a permission is granted
 */
export async function checkPermission(
  type: PermissionType,
): Promise<PermissionResult> {
  try {
    switch (type) {
      case 'camera':
        const cameraResult = await ImagePicker.getCameraPermissionsAsync();
        return {
          granted: cameraResult.granted,
          canAskAgain: cameraResult.canAskAgain,
          status: cameraResult.status,
        };

      case 'photos':
        const photosResult =
          await ImagePicker.getMediaLibraryPermissionsAsync();
        return {
          granted: photosResult.granted,
          canAskAgain: photosResult.canAskAgain,
          status: photosResult.status,
        };

      case 'notifications':
        const notificationResult = await Notifications.getPermissionsAsync();
        return {
          granted: notificationResult.granted,
          canAskAgain: notificationResult.canAskAgain ?? true,
          status: notificationResult.status,
        };

      case 'biometric':
        const biometricAvailable = await LocalAuthentication.hasHardwareAsync();
        if (!biometricAvailable) {
          return {
            granted: false,
            canAskAgain: false,
            status: 'denied',
          };
        }
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        return {
          granted: enrolled,
          canAskAgain: enrolled,
          status: enrolled ? 'granted' : 'undetermined',
        };

      default:
        return {
          granted: false,
          canAskAgain: false,
          status: 'denied',
        };
    }
  } catch (error) {
    console.error(`Error checking ${type} permission:`, error);
    return {
      granted: false,
      canAskAgain: false,
      status: 'denied',
    };
  }
}

/**
 * Get user-friendly rationale for why permission is needed
 */
export function getPermissionRationale(type: PermissionType): string {
  const rationales: Record<PermissionType, string> = {
    camera:
      'ELARO needs camera access to let you take photos for assignments and notes.',
    photos:
      'ELARO needs photo library access to let you attach images to your tasks.',
    notifications:
      'ELARO needs notification access to remind you about upcoming assignments and lectures.',
    biometric:
      'ELARO uses biometric authentication to keep your account secure and make signing in faster.',
  };
  return rationales[type];
}

/**
 * Show permission denied alert with option to open settings
 */
export function showPermissionDeniedAlert(
  type: PermissionType,
  onOpenSettings?: () => void,
): void {
  const title = 'Permission Required';
  const message = `${getPermissionRationale(type)}\n\nPlease enable this permission in Settings.`;

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Open Settings',
      onPress: async () => {
        if (onOpenSettings) {
          onOpenSettings();
        } else {
          await Linking.openSettings();
        }
      },
    },
  ]);
}

/**
 * Request permission with user-friendly flow
 * - Checks current status
 * - Shows rationale if needed
 * - Requests permission
 * - Shows settings alert if permanently denied
 */
export async function requestPermissionWithFlow(
  type: PermissionType,
  onOpenSettings?: () => void,
): Promise<boolean> {
  // Check current status
  const currentStatus = await checkPermission(type);

  if (currentStatus.granted) {
    return true;
  }

  // If blocked/permanently denied, show settings alert
  if (currentStatus.status === 'blocked' || !currentStatus.canAskAgain) {
    showPermissionDeniedAlert(type, onOpenSettings);
    return false;
  }

  // Request permission
  const result = await requestPermission(type);

  if (result.granted) {
    return true;
  }

  // If denied again, show settings alert
  if (!result.canAskAgain || result.status === 'blocked') {
    showPermissionDeniedAlert(type, onOpenSettings);
  }

  return false;
}

/**
 * Get permission display name
 */
export function getPermissionDisplayName(type: PermissionType): string {
  const names: Record<PermissionType, string> = {
    camera: 'Camera',
    photos: 'Photos',
    notifications: 'Notifications',
    biometric:
      Platform.select({
        ios: 'Face ID or Touch ID',
        android: 'Biometric',
        default: 'Biometric',
      }) || 'Biometric',
  };
  return names[type];
}
