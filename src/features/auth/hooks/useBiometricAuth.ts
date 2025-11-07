import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types';
import {
  BiometricAuthService,
  BiometricAuthState,
} from '../services/BiometricAuthService';

export interface UseBiometricAuthReturn {
  biometricState: BiometricAuthState | null;
  loading: boolean;
  error: string | null;
  enableBiometricAuth: (
    user: User,
  ) => Promise<{ success: boolean; error?: string }>;
  disableBiometricAuth: () => Promise<void>;
  authenticateWithBiometric: (
    promptMessage?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  signInWithBiometric: () => Promise<{
    success: boolean;
    credentials?: { email: string; userId: string };
    error?: string;
  }>;
  refreshBiometricState: () => Promise<void>;
}

export const useBiometricAuth = (): UseBiometricAuthReturn => {
  const [biometricState, setBiometricState] =
    useState<BiometricAuthState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const biometricAuthService = BiometricAuthService.getInstance();

  const refreshBiometricState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const state = await biometricAuthService.getBiometricAuthState();
      setBiometricState(state);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to get biometric auth state';
      setError(errorMessage);
      console.error('❌ Error refreshing biometric auth state:', err);
    } finally {
      setLoading(false);
    }
  }, [biometricAuthService]);

  const enableBiometricAuth = useCallback(
    async (user: User) => {
      try {
        setError(null);
        const result = await biometricAuthService.enableBiometricAuth(user);

        // Refresh state after enabling
        if (result.success) {
          await refreshBiometricState();
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to enable biometric auth';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [biometricAuthService, refreshBiometricState],
  );

  const disableBiometricAuth = useCallback(async () => {
    try {
      setError(null);
      await biometricAuthService.disableBiometricAuth();

      // Refresh state after disabling
      await refreshBiometricState();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to disable biometric auth';
      setError(errorMessage);
      console.error('❌ Error disabling biometric auth:', err);
    }
  }, [biometricAuthService, refreshBiometricState]);

  const authenticateWithBiometric = useCallback(
    async (promptMessage?: string) => {
      try {
        setError(null);
        return await biometricAuthService.authenticateWithBiometric(
          promptMessage,
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to authenticate with biometrics';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [biometricAuthService],
  );

  const signInWithBiometric = useCallback(async () => {
    try {
      setError(null);
      return await biometricAuthService.signInWithBiometric();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to sign in with biometrics';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [biometricAuthService]);

  useEffect(() => {
    refreshBiometricState();
  }, [refreshBiometricState]);

  return {
    biometricState,
    loading,
    error,
    enableBiometricAuth,
    disableBiometricAuth,
    authenticateWithBiometric,
    signInWithBiometric,
    refreshBiometricState,
  };
};
