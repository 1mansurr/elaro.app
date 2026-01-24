import { getSupabaseClient, dbUtils } from '@/services/supabase';
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
    try {
      const response = await versionedApiClient.signUp({
        email,
        password,
        firstName,
        lastName,
      });

      // Check if it's a "function not found" error - fallback to direct Supabase
      if (response.error) {
        const isFunctionNotFound =
          response.code === 'HTTP_404' ||
          response.code === 'NOT_FOUND' ||
          response.message?.includes('not found') ||
          response.message?.includes('Requested function was not found') ||
          response.error?.includes('not found') ||
          response.error?.includes('Requested function was not found');

        if (isFunctionNotFound) {
          if (__DEV__) {
            console.warn(
              '⚠️ [authService] Sign-up edge function not available, using direct Supabase sign-up',
            );
          }
          // Fall through to direct Supabase auth below
        } else {
          // For other errors, throw as before
          throw new AppError(
            response.message || response.error || 'Failed to sign up',
            response.code === 'VALIDATION_ERROR' ? 400 : 500,
            response.code || 'AUTH_ERROR',
          );
        }
      }

      // If we have a valid response with session, use it
      if (response.data?.session) {
        // Validate session structure
        if (
          !response.data.session.access_token ||
          !response.data.session.refresh_token
        ) {
          console.error(
            '❌ [authService] Invalid session structure in signup:',
            {
              hasAccessToken: !!response.data.session.access_token,
              hasRefreshToken: !!response.data.session.refresh_token,
              sessionKeys: Object.keys(response.data.session),
            },
          );
          throw new AppError(
            'Invalid session structure received from server',
            500,
            'INVALID_SESSION_STRUCTURE',
          );
        }

        try {
          const supabaseClient = getSupabaseClient();
          const { data: sessionData, error: sessionError } =
            await supabaseClient.auth.setSession({
              access_token: response.data.session.access_token,
              refresh_token: response.data.session.refresh_token,
            });

          if (sessionError) {
            console.error(
              '❌ [authService] Failed to set session in signup:',
              sessionError,
            );
            throw new AppError(
              sessionError.message || 'Failed to set session',
              500,
              'SESSION_SET_ERROR',
            );
          }

          if (__DEV__) {
            console.log(
              '✅ [authService] Session stored in Supabase client (signup)',
            );
          }

          return {
            user: response.data?.user || sessionData?.user || null,
            session: response.data?.session || sessionData?.session || null,
          };
        } catch (error) {
          console.error(
            '❌ [authService] Error setting session in signup:',
            error,
          );
          throw error;
        }
      }
    } catch (error) {
      // If it's an AppError that we already handled, re-throw it
      if (error instanceof AppError && error.code !== 'AUTH_ERROR') {
        throw error;
      }

      // For function not found errors or other errors, try direct Supabase fallback
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isFunctionError =
        errorMessage.includes('not found') ||
        errorMessage.includes('Requested function was not found') ||
        errorMessage.includes('Function failed to start');

      if (isFunctionError || error instanceof AppError) {
        if (__DEV__) {
          console.warn(
            '⚠️ [authService] Sign-up edge function error, using direct Supabase sign-up fallback',
          );
        }
      } else {
        // Re-throw non-function errors
        throw error;
      }
    }

    // FALLBACK: Use direct Supabase auth if edge function is not available
    try {
      const { data: directSignUpData, error: directSignUpError } =
        const supabaseClient = getSupabaseClient();
        await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
            },
          },
        });

      if (directSignUpError) {
        console.error(
          '❌ [authService] Fallback Supabase sign-up failed:',
          directSignUpError,
        );
        throw new AppError(
          directSignUpError.message || 'Failed to sign up',
          500,
          'AUTH_ERROR',
        );
      }

      if (__DEV__) {
        console.log(
          '✅ [authService] Fallback: Sign-up successful via direct Supabase',
        );
      }

      return {
        user: directSignUpData?.user || null,
        session: directSignUpData?.session || null,
      };
    } catch (fallbackError) {
      // If fallback also fails, throw the error
      throw fallbackError;
    }
  },

  // Method to log in a user
  login: async ({ email, password }: LoginCredentials) => {
    try {
      const response = await versionedApiClient.signIn({
        email,
        password,
      });

      // Debug: Log the raw response structure
      if (__DEV__) {
        console.log('🔍 [authService] Raw API response:', {
          hasError: !!response.error,
          hasData: !!response.data,
          dataKeys: response.data ? Object.keys(response.data) : [],
          dataType: typeof response.data,
          hasUser: !!response.data?.user,
          hasSession: !!response.data?.session,
          fullResponsePreview: JSON.stringify(response).substring(0, 300),
        });
      }

      // Check if it's a "function not found" error - fallback to direct Supabase
      if (response.error) {
        const isFunctionNotFound =
          response.code === 'HTTP_404' ||
          response.code === 'NOT_FOUND' ||
          response.message?.includes('not found') ||
          response.message?.includes('Requested function was not found') ||
          response.error?.includes('not found') ||
          response.error?.includes('Requested function was not found');

        if (isFunctionNotFound) {
          if (__DEV__) {
            console.warn(
              '⚠️ [authService] Sign-in edge function not available, using direct Supabase sign-in',
            );
          }
          // Fall through to direct Supabase auth below
        } else {
          // For other errors, throw as before
          throw new AppError(
            response.message || response.error || 'Invalid email or password',
            response.code === 'VALIDATION_ERROR' ? 400 : 401,
            response.code || 'AUTH_ERROR',
          );
        }
      }

      // If we have a valid response with session, use it
      if (response.data?.session) {
        // Validate session structure
        if (
          !response.data.session.access_token ||
          !response.data.session.refresh_token
        ) {
          console.error('❌ [authService] Invalid session structure:', {
            hasAccessToken: !!response.data.session.access_token,
            hasRefreshToken: !!response.data.session.refresh_token,
            sessionKeys: Object.keys(response.data.session),
          });
          throw new AppError(
            'Invalid session structure received from server',
            500,
            'INVALID_SESSION_STRUCTURE',
          );
        }

        try {
          const supabaseClient = getSupabaseClient();
          const { data: sessionData, error: sessionError } =
            await supabaseClient.auth.setSession({
              access_token: response.data.session.access_token,
              refresh_token: response.data.session.refresh_token,
            });

          if (sessionError) {
            console.error(
              '❌ [authService] Failed to set session:',
              sessionError,
            );
            throw new AppError(
              sessionError.message || 'Failed to set session',
              500,
              'SESSION_SET_ERROR',
            );
          }

          if (__DEV__) {
            console.log('✅ [authService] Session stored in Supabase client');
          }

          return {
            user: response.data?.user || sessionData?.user || null,
            session: response.data?.session || sessionData?.session || null,
          };
        } catch (error) {
          console.error('❌ [authService] Error setting session:', error);
          throw error;
        }
      }
    } catch (error) {
      // If it's an AppError that we already handled, re-throw it
      if (error instanceof AppError && error.code !== 'AUTH_ERROR') {
        throw error;
      }

      // For function not found errors or other errors, try direct Supabase fallback
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isFunctionError =
        errorMessage.includes('not found') ||
        errorMessage.includes('Requested function was not found') ||
        errorMessage.includes('Function failed to start');

      if (isFunctionError || error instanceof AppError) {
        if (__DEV__) {
          console.warn(
            '⚠️ [authService] Sign-in edge function error, using direct Supabase sign-in fallback',
          );
        }
      } else {
        // Re-throw non-function errors
        throw error;
      }
    }

    // FALLBACK: Use direct Supabase auth if edge function is not available
    try {
      // Fallback: Use Supabase directly
      const { data: directAuthData, error: directAuthError } =
        const supabaseClient = getSupabaseClient();
        await supabaseClient.auth.signInWithPassword({
          email,
          password,
        });

      if (directAuthError) {
        console.error(
          '❌ [authService] Fallback Supabase auth failed:',
          directAuthError,
        );
        // Check if email confirmation is needed
        if (
          directAuthError.message?.includes('email') ||
          directAuthError.message?.includes('confirm')
        ) {
          throw new AppError(
            'Please confirm your email address before signing in. Check your inbox for a confirmation link.',
            403,
            'EMAIL_NOT_CONFIRMED',
          );
        }
        throw new AppError(
          directAuthError.message || 'Authentication failed',
          401,
          'AUTH_ERROR',
        );
      }

      if (!directAuthData.session) {
        console.error(
          '❌ [authService] Fallback auth succeeded but no session returned',
          {
            hasUser: !!directAuthData.user,
            userId: directAuthData.user?.id,
            emailConfirmed: !!directAuthData.user?.email_confirmed_at,
          },
        );

        // Check if email confirmation is required
        if (directAuthData.user && !directAuthData.user.email_confirmed_at) {
          throw new AppError(
            'Please confirm your email address before signing in. Check your inbox for a confirmation link.',
            403,
            'EMAIL_NOT_CONFIRMED',
          );
        }

        throw new AppError(
          'Login succeeded but no session was created. Please try again.',
          500,
          'NO_SESSION_ERROR',
        );
      }

      if (__DEV__) {
        console.log(
          '✅ [authService] Fallback: Sign-in successful via direct Supabase',
        );
      }

      // Return the session from direct auth
      return {
        user: directAuthData.user,
        session: directAuthData.session,
      };
    } catch (fallbackError) {
      // If fallback also fails, throw the error
      throw fallbackError;
    }
  },

  // Method to log out a user
  signOut: async () => {
    try {
      // Try edge function first
      const response = await versionedApiClient.signOut();

      if (response.error) {
        // Check if it's a "function not found" error - fallback to direct Supabase sign out
        const isFunctionNotFound =
          response.code === 'HTTP_404' ||
          response.message?.includes('not found') ||
          response.message?.includes('Requested function was not found');

        if (isFunctionNotFound) {
          console.warn(
            '⚠️ Sign out edge function not available, using direct Supabase sign out',
          );
          // Fallback to direct Supabase sign out
          const supabaseClient = getSupabaseClient();
          await supabaseClient.auth.signOut();
          return;
        }

        // For other errors, log but still try direct Supabase sign out as fallback
        console.warn(
          '⚠️ Sign out edge function error, falling back to direct Supabase sign out:',
          {
            error: response.error,
            message: response.message,
            code: response.code,
          },
        );
        const supabaseClient = getSupabaseClient();
      await supabaseClient.auth.signOut();
        return;
      }

      // Edge function succeeded - also sign out from Supabase client to clear local session
      const supabaseClient = getSupabaseClient();
      await supabaseClient.auth.signOut();
    } catch (error) {
      // If edge function doesn't exist or fails, use direct Supabase sign out
      console.warn(
        '⚠️ Sign out error, falling back to direct Supabase sign out:',
        error,
      );
      // Always try to sign out from Supabase client, even if edge function fails
      try {
        const supabaseClient = getSupabaseClient();
      await supabaseClient.auth.signOut();
      } catch (supabaseError) {
        // If even Supabase sign out fails, log but don't throw - user should still be able to continue
        console.error(
          '❌ Direct Supabase sign out also failed:',
          supabaseError,
        );
      }
    }
  },

  // Method to get the current session
  // IMPORTANT: This should NOT call setSession() as it would consume refresh tokens
  // The session should already be set by login/signup/verifyEmail
  getSession: async () => {
    // Get session directly from Supabase client - don't use API layer here
    // The API layer's getSession endpoint requires auth, which creates a circular dependency
    const supabaseClient = getSupabaseClient();
    const {
      data: { session },
      error,
    } = await supabaseClient.auth.getSession();

    if (error) {
      throw new AppError(
        error.message || 'Failed to get session',
        500,
        'SESSION_ERROR',
      );
    }

    return session;
  },

  // Method to subscribe to auth state changes
  // Note: This still uses direct Supabase since it's a real-time subscription
  // We can implement polling or WebSocket later if needed
  onAuthChange: (
    callback: (event: string, session: Session | null) => void,
  ) => {
    const supabaseClient = getSupabaseClient();
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(callback);
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
      const supabaseClient = getSupabaseClient();
      await supabaseClient.auth.refreshSession();
    }

    return response.data?.user || null;
  },

  // Method to update password (convenience method)
  updatePassword: async (password: string) => {
    const response = await versionedApiClient.updateProfile({ password });

    if (response.error) {
      throw new AppError(
        response.message || response.error || 'Failed to update password',
        response.code === 'VALIDATION_ERROR' ? 400 : 500,
        response.code || 'AUTH_ERROR',
      );
    }

    // Refresh local user data
    if (response.data?.user) {
      // The session will be updated automatically by Supabase client
      const supabaseClient = getSupabaseClient();
      await supabaseClient.auth.refreshSession();
    }

    return response.data?.user || null;
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
      // Validate session structure
      if (
        !response.data.session.access_token ||
        !response.data.session.refresh_token
      ) {
        throw new AppError(
          'Invalid session structure received from server',
          500,
          'INVALID_SESSION_STRUCTURE',
        );
      }

      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.setSession({
            access_token: response.data.session.access_token,
            refresh_token: response.data.session.refresh_token,
          });

        if (sessionError) {
          throw new AppError(
            sessionError.message || 'Failed to set session',
            500,
            'SESSION_SET_ERROR',
          );
        }
      } catch (error) {
        console.error(
          '❌ [authService] Error setting session in verifyEmail:',
          error,
        );
        throw error;
      }
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
    const supabaseClient = getSupabaseClient();
    const { error } = await supabaseClient.auth.signOut({ scope: 'global' });
    if (error) throw new AppError(error.message, 500, 'GLOBAL_SIGNOUT_ERROR');
  },

  // Method to delete the current user's account (soft delete with 7-day retention)
  deleteAccount: async (reason?: string): Promise<void> => {
    try {
      const supabaseClient = getSupabaseClient();
      const { data, error } = await supabaseClient.functions.invoke(
        'soft-delete-account',
        {
          body: { reason: reason || 'User requested account deletion' },
        },
      );

      if (error) throw new AppError(error.message, 500, 'SOFT_DELETE_ERROR');

      // Sign out locally after successful soft delete
      const supabaseClient = getSupabaseClient();
      await supabaseClient.auth.signOut();
    } catch (error) {
      console.error('Error in authService.deleteAccount:', error);
      throw error;
    }
  },

  // Method to restore a soft-deleted account
  restoreAccount: async (): Promise<any> => {
    try {
      const { data, error } =
        const supabaseClient = getSupabaseClient();
        await supabaseClient.functions.invoke('restore-account');

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
      const supabaseClient = getSupabaseClient();
      const { data, error } = await supabaseClient.auth.mfa.enroll({
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
      const supabaseClient = getSupabaseClient();
      const { data, error } = await supabaseClient.auth.mfa.challenge({ factorId });
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
      const supabaseClient = getSupabaseClient();
      const { error } = await supabaseClient.auth.mfa.verify({
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
      const supabaseClient = getSupabaseClient();
      const { error } = await supabaseClient.auth.mfa.unenroll({ factorId });
      if (error) throw new AppError(error.message, 400, 'MFA_UNENROLL_ERROR');
    },

    /**
     * Gets the current authentication assurance level for the user.
     * This tells us if they have completed MFA for the current session.
     * @returns {Promise<{currentLevel: string | null, nextLevel: string | null}>}
     */
    getAuthenticatorAssuranceLevel: async () => {
      const { data, error } =
        const supabaseClient = getSupabaseClient();
        await supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();
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
      const supabaseClient = getSupabaseClient();
      const { data, error } = await supabaseClient.auth.mfa.listFactors();
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
