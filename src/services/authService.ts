import { supabase } from './supabase';
import { Session, User, Factor } from '@supabase/supabase-js';

// AppError class for consistent error handling
class AppError extends Error {
  constructor(message: string, public status: number, public code: string) {
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
  error?: any;
}

// Define the shape of our auth service
export const authService = {
  // Method to sign up a new user
  signUp: async ({ email, password, firstName, lastName }: SignUpCredentials) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });
    if (error) throw error;
    return data;
  },

  // Method to log in a user
  login: async ({ email, password }: LoginCredentials) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  // Method to log out a user
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Method to get the current session
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  // Method to subscribe to auth state changes
  onAuthChange: (callback: (event: string, session: Session | null) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
  },

  // Method to get current user
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  // Method to log out a user from all sessions (global signout)
  signOutFromAllDevices: async () => {
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) throw new AppError(error.message, 500, 'GLOBAL_SIGNOUT_ERROR');
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
      const factorId = data?.factor?.id;

      if (!qrCode || !secret || !factorId) {
        throw new AppError('Failed to generate QR code for MFA enrollment.', 500, 'MFA_QR_CODE_ERROR');
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
      if (!data?.id) throw new AppError('Failed to create MFA challenge.', 500, 'MFA_CHALLENGE_ID_ERROR');
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
    verify: async ({ factorId, challengeId, code }: { factorId: string; challengeId: string; code: string; }) => {
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
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
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
      const verifiedFactors = factors.filter(factor => factor.status === 'verified');
      const unverifiedFactors = factors.filter(factor => factor.status === 'unverified');
      
      return {
        isEnabled: verifiedFactors.length > 0,
        factors: verifiedFactors,
        hasUnverifiedFactors: unverifiedFactors.length > 0,
      };
    },
  }
};
