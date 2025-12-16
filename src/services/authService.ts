import { supabase } from '@/services/supabase';
import { dbUtils } from '@/services/supabase';
import { Session, User, Factor } from '@supabase/supabase-js';
import { versionedApiClient } from './VersionedApiClient';

// AppError class for consistent error handling
class AppError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}

// Define the arguments for our auth functions
interface LoginCredentials {
  email: string;
  password: string;
}

interface SignUpCredentials extends LoginCredentials {
  firstName: string;
  lastName: string;
}

interface MFAEnrollmentResult {
  qr_code: string;
  secret: string;
  factor: Factor;
}

interface MFAVerificationResult {
  session: Session | null;
  error?: Error | { message: string; code?: string };
}

// Define the shape of our auth service
export const authService = {
  // Method to sign up a new user
  signUp: async ({
    email,
    password,
    firstName,
    lastName,
  }: SignUpCredentials) => {
    const response = await versionedApiClient.signUp({
      email,
      password,
      firstName,
      lastName,
    });

    if (response.error) {
      throw new AppError(
        response.message || response.error || 'Failed to sign up',
        response.code === 'VALIDATION_ERROR' ? 400 : 500,
        response.code || 'AUTH_ERROR',
      );
    }

    // Store session in Supabase client if session is returned
    if (response.data?.session) {
      await supabase.auth.setSession({
        access_token: response.data.session.access_token,
        refresh_token: response.data.session.refresh_token,
      });
    }

    return {
      user: response.data?.user || null,
      session: response.data?.session || null,
    };
  },

  // Method to log in a user
  login: async ({ email, password }: LoginCredentials) => {
    const response = await versionedApiClient.signIn({
      email,
      password,
    });

    if (response.error) {
      throw new AppError(
        response.message || response.error || 'Invalid email or password',
        response.code === 'VALIDATION_ERROR' ? 400 : 401,
        response.code || 'AUTH_ERROR',
      );
    }

    // Store session in Supabase client
    if (response.data?.session) {
      await supabase.auth.setSession({
        access_token: response.data.session.access_token,
        refresh_token: response.data.session.refresh_token,
      });
    }

    return {
      user: response.data?.user || null,
      session: response.data?.session || null,
    };
  },

  // Method to log out a user
  signOut: async () => {
    const response = await versionedApiClient.signOut();

    if (response.error) {
      throw new AppError(
        response.message || response.error || 'Failed to sign out',
        500,
        response.code || 'AUTH_ERROR',
      );
    }

    // Also sign out from Supabase client to clear local session
    await supabase.auth.signOut();
  },

  // Method to get the current session
  getSession: async () => {
    const response = await versionedApiClient.getSession();

    if (response.error && response.error !== 'User not authenticated') {
      throw new AppError(
        response.message || response.error || 'Failed to get session',
        500,
        response.code || 'AUTH_ERROR',
      );
    }

    // Update Supabase client session if we got a valid session
    if (response.data?.session) {
      await supabase.auth.setSession({
        access_token: response.data.session.access_token,
        refresh_token: response.data.session.refresh_token,
      });
    }

    return response.data?.session || null;
  },

  // Method to subscribe to auth state changes
  // Note: This still uses direct Supabase since it's a real-time subscription
  // We can implement polling or WebSocket later if needed
  onAuthChange: (
    callback: (event: string, session: Session | null) => void,
  ) => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(callback);
    return subscription;
  },

  // Method to get current user
  getCurrentUser: async () => {
    const response = await versionedApiClient.getUser();

    if (response.error && response.error !== 'User not authenticated') {
      throw new AppError(
        response.message || response.error || 'Failed to get user',
        500,
        response.code || 'AUTH_ERROR',
      );
    }

    return response.data?.user || null;
  },

  // Method to reset password (send reset email)
  resetPassword: async (email: string, redirectTo?: string) => {
    const response = await versionedApiClient.resetPassword({
      email,
      redirectTo,
    });

    if (response.error) {
      throw new AppError(
        response.message || response.error || 'Failed to send reset email',
        response.code === 'VALIDATION_ERROR' ? 400 : 500,
        response.code || 'AUTH_ERROR',
      );
    }

    return response.data;
  },

  // Method to update user profile
  updateProfile: async (updates: {
    first_name?: string;
    last_name?: string;
    name?: string;
    password?: string;
  }) => {
    const response = await versionedApiClient.updateProfile(updates);

    if (response.error) {
      throw new AppError(
        response.message || response.error || 'Failed to update profile',
        response.code === 'VALIDATION_ERROR' ? 400 : 500,
        response.code || 'AUTH_ERROR',
      );
    }

    // Refresh local user data
    if (response.data?.user) {
      // The session will be updated automatically by Supabase client
      await supabase.auth.refreshSession();
    }

    return response.data?.user || null;
  },

  // Method to update password (convenience method)
  updatePassword: async (password: string) => {
    return this.updateProfile({ password });
  },

  // Method to verify email
  verifyEmail: async (token: string, type?: 'signup' | 'email_change') => {
    const response = await versionedApiClient.verifyEmail({ token, type });

    if (response.error) {
      throw new AppError(
        response.message || response.error || 'Failed to verify email',
        response.code === 'VALIDATION_ERROR' ? 400 : 500,
        response.code || 'AUTH_ERROR',
      );
    }

    // Store session if returned
    if (response.data?.session) {
      await supabase.auth.setSession({
        access_token: response.data.session.access_token,
        refresh_token: response.data.session.refresh_token,
      });
    }

    return {
      user: response.data?.user || null,
      session: response.data?.session || null,
    };
  },

  // Method to log out a user from all sessions (global signout)
  // Note: This still uses direct Supabase as it's a special operation
  // Can be migrated to Edge Function later if needed
  signOutFromAllDevices: async () => {
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) throw new AppError(error.message, 500, 'GLOBAL_SIGNOUT_ERROR');
  },

  // Method to delete the current user's account (soft delete with 7-day retention)
  deleteAccount: async (reason?: string): Promise<void> => {
    try {
      const { data, error } = await supabase.functions.invoke(
        'soft-delete-account',
        {
          body: { reason: reason || 'User requested account deletion' },
        },
      );

      if (error) throw new AppError(error.message, 500, 'SOFT_DELETE_ERROR');

      // Sign out locally after successful soft delete
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error in authService.deleteAccount:', error);
      throw error;
    }
  },

  // Method to restore a soft-deleted account
  restoreAccount: async (): Promise<any> => {
    try {
      const { data, error } =
        await supabase.functions.invoke('restore-account');

      if (error) throw new AppError(error.message, 500, 'RESTORE_ERROR');

      return data;
    } catch (error) {
      console.error('Error in authService.restoreAccount:', error);
      throw error;
    }
  },

  // MFA Methods
  mfa: {
    /**
     * Starts the MFA enrollment process for the current user.
     * @returns {Promise<{qrCode: string, secret: string, factorId: string}>} An object containing the QR code URI, secret key, and factor ID.
     */
    enroll: async () => {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });
      if (error) throw new AppError(error.message, 400, 'MFA_ENROLL_ERROR');

      // The QR code is returned as a data URI (e.g., 'data:image/svg+xml;base64,...')
      const qrCode = data?.totp.qr_code;
      const secret = data?.totp.secret;
      const factorId = data?.id;

      if (!qrCode || !secret || !factorId) {
        throw new AppError(
          'Failed to generate QR code for MFA enrollment.',
          500,
          'MFA_QR_CODE_ERROR',
        );
      }

      return { qrCode, secret, factorId };
    },

    /**
     * Creates a challenge that can be used to verify a TOTP code.
     * This is the first step in verifying a code during login or enrollment.
     * @param {string} factorId - The ID of the factor to challenge.
     * @returns {Promise<{challengeId: string}>} The ID of the challenge.
     */
    challenge: async (factorId: string) => {
      const { data, error } = await supabase.auth.mfa.challenge({ factorId });
      if (error) throw new AppError(error.message, 400, 'MFA_CHALLENGE_ERROR');
      if (!data?.id)
        throw new AppError(
          'Failed to create MFA challenge.',
          500,
          'MFA_CHALLENGE_ID_ERROR',
        );
      return { challengeId: data.id };
    },

    /**
     * Verifies a TOTP code against a challenge.
     * @param {object} params - The verification parameters.
     * @param {string} params.factorId - The ID of the factor being verified.
     * @param {string} params.challengeId - The ID of the challenge.
     * @param {string} params.code - The 6-digit code from the authenticator app.
     * @returns {Promise<void>}
     */
    verify: async ({
      factorId,
      challengeId,
      code,
    }: {
      factorId: string;
      challengeId: string;
      code: string;
    }) => {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      });
      if (error) throw new AppError(error.message, 400, 'MFA_VERIFY_ERROR');
    },

    /**
     * Disables MFA for the current user.
     * @param {string} factorId - The ID of the factor to unenroll.
     * @returns {Promise<void>}
     */
    unenroll: async (factorId: string) => {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw new AppError(error.message, 400, 'MFA_UNENROLL_ERROR');
    },

    /**
     * Gets the current authentication assurance level for the user.
     * This tells us if they have completed MFA for the current session.
     * @returns {Promise<{currentLevel: string | null, nextLevel: string | null}>}
     */
    getAuthenticatorAssuranceLevel: async () => {
      const { data, error } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw new AppError(error.message, 500, 'MFA_AAL_ERROR');
      return {
        currentLevel: data?.currentLevel || null,
        nextLevel: data?.nextLevel || null,
      };
    },

    /**
     * Gets the MFA status and factors for the current user.
     * @returns {Promise<{isEnabled: boolean, factors: Factor[], hasUnverifiedFactors: boolean}>}
     */
    getStatus: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw new AppError(error.message, 500, 'MFA_STATUS_ERROR');

      const factors = data?.totp || [];
      const verifiedFactors = factors.filter(
        factor => factor.status === 'verified',
      );
      const unverifiedFactors = factors.filter(
        factor => (factor.status as string) === 'unverified',
      );

      return {
        isEnabled: verifiedFactors.length > 0,
        factors: verifiedFactors,
        hasUnverifiedFactors: unverifiedFactors.length > 0,
      };
    },
  },
};
