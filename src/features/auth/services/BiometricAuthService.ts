import { User } from '@/types';
import { 
  checkBiometricCapability, 
  authenticateWithBiometric, 
  enableBiometricLogin, 
  disableBiometricLogin, 
  signInWithBiometric,
  isBiometricLoginEnabled,
  BiometricCapability 
} from '@/utils/biometricAuth';

export interface BiometricAuthState {
  isAvailable: boolean;
  isEnabled: boolean;
  capability: BiometricCapability;
}

export class BiometricAuthService {
  private static instance: BiometricAuthService;
  private capability: BiometricCapability | null = null;

  public static getInstance(): BiometricAuthService {
    if (!BiometricAuthService.instance) {
      BiometricAuthService.instance = new BiometricAuthService();
    }
    return BiometricAuthService.instance;
  }

  /**
   * Check biometric capability and availability
   */
  async checkCapability(): Promise<BiometricCapability> {
    try {
      this.capability = await checkBiometricCapability();
      return this.capability;
    } catch (error) {
      console.error('❌ Error checking biometric capability:', error);
      return {
        isAvailable: false,
        biometricType: 'none',
        hasHardware: false,
        isEnrolled: false,
      };
    }
  }

  /**
   * Get current biometric auth state
   */
  async getBiometricAuthState(): Promise<BiometricAuthState> {
    try {
      const capability = await this.checkCapability();
      const isEnabled = await isBiometricLoginEnabled();

      return {
        isAvailable: capability.isAvailable,
        isEnabled,
        capability
      };
    } catch (error) {
      console.error('❌ Error getting biometric auth state:', error);
      return {
        isAvailable: false,
        isEnabled: false,
        capability: {
          isAvailable: false,
          biometricType: 'none',
          hasHardware: false,
          isEnrolled: false,
        }
      };
    }
  }

  /**
   * Enable biometric authentication for user
   */
  async enableBiometricAuth(user: User): Promise<{ success: boolean; error?: string }> {
    try {
      if (!user.email) {
        return { success: false, error: 'User email is required for biometric authentication' };
      }

      const result = await enableBiometricLogin(user.email, user.id);
      return result;
    } catch (error) {
      console.error('❌ Error enabling biometric auth:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometricAuth(): Promise<void> {
    try {
      await disableBiometricLogin();
    } catch (error) {
      console.error('❌ Error disabling biometric auth:', error);
    }
  }

  /**
   * Authenticate with biometrics
   */
  async authenticateWithBiometric(promptMessage?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await authenticateWithBiometric(promptMessage);
      return result;
    } catch (error) {
      console.error('❌ Error during biometric authentication:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Authentication failed' 
      };
    }
  }

  /**
   * Sign in with biometric credentials
   */
  async signInWithBiometric(): Promise<{ 
    success: boolean; 
    credentials?: { email: string; userId: string }; 
    error?: string 
  }> {
    try {
      const result = await signInWithBiometric();
      return result;
    } catch (error) {
      console.error('❌ Error during biometric sign in:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sign in failed' 
      };
    }
  }

  /**
   * Check if biometric login is enabled
   */
  async isBiometricLoginEnabled(): Promise<boolean> {
    try {
      return await isBiometricLoginEnabled();
    } catch (error) {
      console.error('❌ Error checking biometric login status:', error);
      return false;
    }
  }
}
