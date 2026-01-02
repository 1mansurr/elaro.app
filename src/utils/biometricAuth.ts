import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export interface BiometricCapability {
  isAvailable: boolean;
  biometricType: 'fingerprint' | 'facial' | 'iris' | 'none';
  hasHardware: boolean;
  isEnrolled: boolean;
}

/**
 * Check if biometric authentication is available on the device
 */
export async function checkBiometricCapability(): Promise<BiometricCapability> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes =
      await LocalAuthentication.supportedAuthenticationTypesAsync();

    let biometricType: 'fingerprint' | 'facial' | 'iris' | 'none' = 'none';

    if (
      supportedTypes.includes(
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      )
    ) {
      biometricType = 'facial';
    } else if (
      supportedTypes.includes(
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      )
    ) {
      biometricType = 'fingerprint';
    } else if (
      supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)
    ) {
      biometricType = 'iris';
    }

    return {
      isAvailable: hasHardware && isEnrolled,
      biometricType,
      hasHardware,
      isEnrolled,
    };
  } catch (error) {
    console.error('Error checking biometric capability:', error);
    return {
      isAvailable: false,
      biometricType: 'none',
      hasHardware: false,
      isEnrolled: false,
    };
  }
}

/**
 * Get user-friendly name for biometric type
 */
export function getBiometricTypeName(
  type: 'fingerprint' | 'facial' | 'iris' | 'none',
): string {
  switch (type) {
    case 'facial':
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    case 'fingerprint':
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    case 'iris':
      return 'Iris Scanning';
    default:
      return 'Biometric Authentication';
  }
}

/**
 * Authenticate user with biometrics
 * @param promptMessage - Custom message to show in the biometric prompt
 */
export async function authenticateWithBiometric(
  promptMessage: string = 'Authenticate to access ELARO',
): Promise<{ success: boolean; error?: string }> {
  try {
    const capability = await checkBiometricCapability();

    if (!capability.isAvailable) {
      return {
        success: false,
        error: 'Biometric authentication is not available on this device',
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use password instead',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    }

    return {
      success: false,
      error: result.error || 'Authentication failed',
    };
  } catch (error) {
    console.error('Error during biometric authentication:', error);
    return {
      success: false,
      error: 'An error occurred during authentication',
    };
  }
}

/**
 * Store credentials securely for biometric login
 * @param email - User's email
 * @param userId - User's ID
 */
export async function storeBiometricCredentials(
  email: string,
  userId: string,
): Promise<boolean> {
  try {
    const credentials = JSON.stringify({ email, userId });
    await SecureStore.setItemAsync(BIOMETRIC_CREDENTIALS_KEY, credentials);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
    console.log('Biometric credentials stored successfully');
    return true;
  } catch (error) {
    console.error('Error storing biometric credentials:', error);
    return false;
  }
}

/**
 * Retrieve stored credentials for biometric login
 */
export async function getBiometricCredentials(): Promise<{
  email: string;
  userId: string;
} | null> {
  try {
    const credentialsStr = await SecureStore.getItemAsync(
      BIOMETRIC_CREDENTIALS_KEY,
    );
    if (
      !credentialsStr ||
      !credentialsStr.trim() ||
      credentialsStr === 'undefined' ||
      credentialsStr === 'null'
    ) {
      return null;
    }
    
    let credentials: any;
    try {
      credentials = JSON.parse(credentialsStr);
      return credentials;
    } catch {
      return null;
    }
  } catch (error) {
    console.error('Error retrieving biometric credentials:', error);
    return null;
  }
}

/**
 * Check if biometric login is enabled
 */
export async function isBiometricLoginEnabled(): Promise<boolean> {
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('Error checking biometric status:', error);
    return false;
  }
}

/**
 * Enable biometric login for current user
 * @param email - User's email
 * @param userId - User's ID
 */
export async function enableBiometricLogin(
  email: string,
  userId: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const capability = await checkBiometricCapability();

    if (!capability.isAvailable) {
      return {
        success: false,
        error: !capability.hasHardware
          ? 'Your device does not support biometric authentication'
          : 'Please set up biometric authentication in your device settings first',
      };
    }

    // Test authentication before enabling
    const authResult = await authenticateWithBiometric(
      `Enable ${getBiometricTypeName(capability.biometricType)}`,
    );

    if (!authResult.success) {
      return {
        success: false,
        error: authResult.error || 'Authentication failed',
      };
    }

    // Store credentials
    const stored = await storeBiometricCredentials(email, userId);

    if (!stored) {
      return {
        success: false,
        error: 'Failed to store credentials securely',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error enabling biometric login:', error);
    return {
      success: false,
      error: 'An error occurred while enabling biometric login',
    };
  }
}

/**
 * Disable biometric login
 */
export async function disableBiometricLogin(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    console.log('Biometric login disabled');
  } catch (error) {
    console.error('Error disabling biometric login:', error);
  }
}

/**
 * Sign in with biometric authentication
 */
export async function signInWithBiometric(): Promise<{
  success: boolean;
  credentials?: { email: string; userId: string };
  error?: string;
}> {
  try {
    // Check if biometric login is enabled
    const enabled = await isBiometricLoginEnabled();
    if (!enabled) {
      return {
        success: false,
        error: 'Biometric login is not enabled',
      };
    }

    // Authenticate with biometrics
    const authResult = await authenticateWithBiometric('Sign in to ELARO');
    if (!authResult.success) {
      return {
        success: false,
        error: authResult.error || 'Authentication failed',
      };
    }

    // Retrieve stored credentials
    const credentials = await getBiometricCredentials();
    if (!credentials) {
      return {
        success: false,
        error:
          'No stored credentials found. Please sign in with your password.',
      };
    }

    return {
      success: true,
      credentials,
    };
  } catch (error) {
    console.error('Error during biometric sign in:', error);
    return {
      success: false,
      error: 'An error occurred during sign in',
    };
  }
}
