/**
 * Auth Service Tests
 *
 * Tests for src/features/auth/services/authService.ts
 * Target: 70%+ coverage
 */

import { authService } from '@/features/auth/services/authService';
import { supabase } from '@/services/supabase';
import { Session, User, Factor } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(),
      mfa: {
        enroll: jest.fn(),
        challenge: jest.fn(),
        verify: jest.fn(),
        unenroll: jest.fn(),
        getAuthenticatorAssuranceLevel: jest.fn(),
        listFactors: jest.fn(),
      },
    },
    functions: {
      invoke: jest.fn(),
    },
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should sign up a new user successfully', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {
          first_name: 'Test',
          last_name: 'User',
        },
        aud: 'authenticated',
        confirmation_sent_at: null,
        recovery_sent_at: null,
        email_confirmed_at: null,
        invited_at: null,
        action_link: null,
        phone: null,
        phone_confirmed_at: null,
        confirmed_at: null,
        last_sign_in_at: null,
        role: 'authenticated',
        updated_at: new Date().toISOString(),
      };

      const mockData = {
        user: mockUser,
        session: null,
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await authService.signUp({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            first_name: 'Test',
            last_name: 'User',
          },
        },
      });

      expect(result).toEqual(mockData);
    });

    it('should throw error when sign up fails', async () => {
      const mockError = {
        message: 'Email already registered',
        status: 400,
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      await expect(
        authService.signUp({
          email: 'existing@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        }),
      ).rejects.toEqual(mockError);

      expect(mockSupabase.auth.signUp).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network request failed');
      mockSupabase.auth.signUp.mockRejectedValue(networkError);

      await expect(
        authService.signUp({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        }),
      ).rejects.toThrow('Network request failed');
    });
  });

  describe('login', () => {
    it('should log in user successfully', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        confirmation_sent_at: null,
        recovery_sent_at: null,
        email_confirmed_at: new Date().toISOString(),
        invited_at: null,
        action_link: null,
        phone: null,
        phone_confirmed_at: null,
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        role: 'authenticated',
        updated_at: new Date().toISOString(),
      };

      const mockSession: Session = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        expires_at: Date.now() / 1000 + 3600,
        token_type: 'bearer',
        user: mockUser,
      };

      const mockData = {
        user: mockUser,
        session: mockSession,
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual(mockData);
    });

    it('should throw error for invalid credentials', async () => {
      const mockError = {
        message: 'Invalid login credentials',
        status: 401,
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toEqual(mockError);
    });

    it('should handle network errors during login', async () => {
      const networkError = new Error('Network request failed');
      mockSupabase.auth.signInWithPassword.mockRejectedValue(networkError);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow('Network request failed');
    });
  });

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      await authService.signOut();

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should throw error when sign out fails', async () => {
      const mockError = {
        message: 'Sign out failed',
        status: 500,
      };

      mockSupabase.auth.signOut.mockResolvedValue({ error: mockError });

      await expect(authService.signOut()).rejects.toEqual(mockError);
    });
  });

  describe('getSession', () => {
    it('should get current session successfully', async () => {
      const mockSession: Session = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        expires_at: Date.now() / 1000 + 3600,
        token_type: 'bearer',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          confirmation_sent_at: null,
          recovery_sent_at: null,
          email_confirmed_at: null,
          invited_at: null,
          action_link: null,
          phone: null,
          phone_confirmed_at: null,
          confirmed_at: null,
          last_sign_in_at: null,
          role: 'authenticated',
          updated_at: new Date().toISOString(),
        },
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await authService.getSession();

      expect(mockSupabase.auth.getSession).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it('should return null when no session exists', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await authService.getSession();

      expect(result).toBeNull();
    });

    it('should throw error when getSession fails', async () => {
      const mockError = {
        message: 'Failed to get session',
        status: 500,
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: mockError,
      });

      await expect(authService.getSession()).rejects.toEqual(mockError);
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user successfully', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        confirmation_sent_at: null,
        recovery_sent_at: null,
        email_confirmed_at: null,
        invited_at: null,
        action_link: null,
        phone: null,
        phone_confirmed_at: null,
        confirmed_at: null,
        last_sign_in_at: null,
        role: 'authenticated',
        updated_at: new Date().toISOString(),
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.getCurrentUser();

      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should throw error when getUser fails', async () => {
      const mockError = {
        message: 'Failed to get user',
        status: 500,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: mockError,
      });

      await expect(authService.getCurrentUser()).rejects.toEqual(mockError);
    });
  });

  describe('onAuthChange', () => {
    it('should subscribe to auth state changes', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      const mockSubscription = {
        unsubscribe: mockUnsubscribe,
      };

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: mockSubscription },
      });

      const subscription = authService.onAuthChange(mockCallback);

      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledWith(
        mockCallback,
      );
      expect(subscription).toEqual(mockSubscription);
    });
  });

  describe('signOutFromAllDevices', () => {
    it('should sign out from all devices successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      await authService.signOutFromAllDevices();

      expect(mockSupabase.auth.signOut).toHaveBeenCalledWith({
        scope: 'global',
      });
    });

    it('should throw AppError when sign out fails', async () => {
      const mockError = {
        message: 'Global sign out failed',
        status: 500,
      };

      mockSupabase.auth.signOut.mockResolvedValue({ error: mockError });

      await expect(authService.signOutFromAllDevices()).rejects.toMatchObject({
        message: 'Global sign out failed',
        status: 500,
        code: 'GLOBAL_SIGNOUT_ERROR',
      });
    });
  });

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null,
      });
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      await authService.deleteAccount('User requested deletion');

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'soft-delete-account',
        {
          body: { reason: 'User requested deletion' },
        },
      );
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should use default reason when not provided', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null,
      });
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      await authService.deleteAccount();

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'soft-delete-account',
        {
          body: { reason: 'User requested account deletion' },
        },
      );
    });

    it('should throw AppError when delete fails', async () => {
      const mockError = {
        message: 'Delete account failed',
        status: 500,
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(authService.deleteAccount()).rejects.toMatchObject({
        message: 'Delete account failed',
        status: 500,
        code: 'SOFT_DELETE_ERROR',
      });
    });

    it('should handle errors during account deletion', async () => {
      const networkError = new Error('Network error');
      mockSupabase.functions.invoke.mockRejectedValue(networkError);

      await expect(authService.deleteAccount()).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('restoreAccount', () => {
    it('should restore account successfully', async () => {
      const mockData = { success: true, message: 'Account restored' };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await authService.restoreAccount();

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'restore-account',
      );
      expect(result).toEqual(mockData);
    });

    it('should throw AppError when restore fails', async () => {
      const mockError = {
        message: 'Restore account failed',
        status: 500,
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(authService.restoreAccount()).rejects.toMatchObject({
        message: 'Restore account failed',
        status: 500,
        code: 'RESTORE_ERROR',
      });
    });

    it('should handle errors during account restoration', async () => {
      const networkError = new Error('Network error');
      mockSupabase.functions.invoke.mockRejectedValue(networkError);

      await expect(authService.restoreAccount()).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('mfa.enroll', () => {
    it('should enroll MFA successfully', async () => {
      const mockFactor: Factor = {
        id: 'factor-123',
        type: 'totp',
        status: 'unverified',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockData = {
        id: 'factor-123',
        totp: {
          qr_code: 'data:image/svg+xml;base64,test',
          secret: 'secret-key',
        },
      };

      mockSupabase.auth.mfa.enroll.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await authService.mfa.enroll();

      expect(mockSupabase.auth.mfa.enroll).toHaveBeenCalledWith({
        factorType: 'totp',
      });

      expect(result).toEqual({
        qrCode: 'data:image/svg+xml;base64,test',
        secret: 'secret-key',
        factorId: 'factor-123',
      });
    });

    it('should throw error when MFA enrollment fails', async () => {
      const mockError = {
        message: 'MFA enrollment failed',
        status: 400,
      };

      mockSupabase.auth.mfa.enroll.mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(authService.mfa.enroll()).rejects.toMatchObject({
        message: 'MFA enrollment failed',
        status: 400,
        code: 'MFA_ENROLL_ERROR',
      });
    });

    it('should throw error when QR code is missing', async () => {
      mockSupabase.auth.mfa.enroll.mockResolvedValue({
        data: {
          id: 'factor-123',
          totp: {
            qr_code: null,
            secret: 'secret-key',
          },
        },
        error: null,
      });

      await expect(authService.mfa.enroll()).rejects.toMatchObject({
        message: 'Failed to generate QR code for MFA enrollment.',
        status: 500,
        code: 'MFA_QR_CODE_ERROR',
      });
    });
  });

  describe('mfa.challenge', () => {
    it('should create MFA challenge successfully', async () => {
      const mockData = {
        id: 'challenge-123',
      };

      mockSupabase.auth.mfa.challenge.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await authService.mfa.challenge('factor-123');

      expect(mockSupabase.auth.mfa.challenge).toHaveBeenCalledWith({
        factorId: 'factor-123',
      });

      expect(result).toEqual({
        challengeId: 'challenge-123',
      });
    });

    it('should throw error when challenge creation fails', async () => {
      const mockError = {
        message: 'Challenge creation failed',
        status: 400,
      };

      mockSupabase.auth.mfa.challenge.mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        authService.mfa.challenge('factor-123'),
      ).rejects.toMatchObject({
        message: 'Challenge creation failed',
        status: 400,
        code: 'MFA_CHALLENGE_ERROR',
      });
    });

    it('should throw error when challenge ID is missing', async () => {
      mockSupabase.auth.mfa.challenge.mockResolvedValue({
        data: { id: null },
        error: null,
      });

      await expect(
        authService.mfa.challenge('factor-123'),
      ).rejects.toMatchObject({
        message: 'Failed to create MFA challenge.',
        status: 500,
        code: 'MFA_CHALLENGE_ID_ERROR',
      });
    });
  });

  describe('mfa.verify', () => {
    it('should verify MFA code successfully', async () => {
      mockSupabase.auth.mfa.verify.mockResolvedValue({
        data: { verified: true },
        error: null,
      });

      await authService.mfa.verify({
        factorId: 'factor-123',
        challengeId: 'challenge-123',
        code: '123456',
      });

      expect(mockSupabase.auth.mfa.verify).toHaveBeenCalledWith({
        factorId: 'factor-123',
        challengeId: 'challenge-123',
        code: '123456',
      });
    });

    it('should throw error when verification fails', async () => {
      const mockError = {
        message: 'Invalid code',
        status: 400,
      };

      mockSupabase.auth.mfa.verify.mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        authService.mfa.verify({
          factorId: 'factor-123',
          challengeId: 'challenge-123',
          code: 'wrong-code',
        }),
      ).rejects.toMatchObject({
        message: 'Invalid code',
        status: 400,
        code: 'MFA_VERIFY_ERROR',
      });
    });
  });

  describe('mfa.unenroll', () => {
    it('should unenroll MFA successfully', async () => {
      mockSupabase.auth.mfa.unenroll.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      await authService.mfa.unenroll('factor-123');

      expect(mockSupabase.auth.mfa.unenroll).toHaveBeenCalledWith({
        factorId: 'factor-123',
      });
    });

    it('should throw error when unenroll fails', async () => {
      const mockError = {
        message: 'Unenroll failed',
        status: 400,
      };

      mockSupabase.auth.mfa.unenroll.mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        authService.mfa.unenroll('factor-123'),
      ).rejects.toMatchObject({
        message: 'Unenroll failed',
        status: 400,
        code: 'MFA_UNENROLL_ERROR',
      });
    });
  });

  describe('mfa.getAuthenticatorAssuranceLevel', () => {
    it('should get AAL successfully', async () => {
      const mockData = {
        currentLevel: 'aal1',
        nextLevel: 'aal2',
      };

      mockSupabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await authService.mfa.getAuthenticatorAssuranceLevel();

      expect(result).toEqual({
        currentLevel: 'aal1',
        nextLevel: 'aal2',
      });
    });

    it('should return null when no levels available', async () => {
      mockSupabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await authService.mfa.getAuthenticatorAssuranceLevel();

      expect(result).toEqual({
        currentLevel: null,
        nextLevel: null,
      });
    });

    it('should throw error when get AAL fails', async () => {
      const mockError = {
        message: 'Failed to get AAL',
        status: 500,
      };

      mockSupabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(
        authService.mfa.getAuthenticatorAssuranceLevel(),
      ).rejects.toMatchObject({
        message: 'Failed to get AAL',
        status: 500,
        code: 'MFA_AAL_ERROR',
      });
    });
  });

  describe('mfa.getStatus', () => {
    it('should get MFA status with enabled factors', async () => {
      const mockFactors: Factor[] = [
        {
          id: 'factor-1',
          type: 'totp',
          status: 'verified',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      mockSupabase.auth.mfa.listFactors.mockResolvedValue({
        data: { totp: mockFactors },
        error: null,
      });

      const result = await authService.mfa.getStatus();

      expect(result).toEqual({
        isEnabled: true,
        factors: mockFactors,
        hasUnverifiedFactors: false,
      });
    });

    it('should get MFA status with unverified factors', async () => {
      const mockFactors: Factor[] = [
        {
          id: 'factor-1',
          type: 'totp',
          status: 'unverified',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      mockSupabase.auth.mfa.listFactors.mockResolvedValue({
        data: { totp: mockFactors },
        error: null,
      });

      const result = await authService.mfa.getStatus();

      expect(result).toEqual({
        isEnabled: false,
        factors: [],
        hasUnverifiedFactors: true,
      });
    });

    it('should get MFA status when no factors exist', async () => {
      mockSupabase.auth.mfa.listFactors.mockResolvedValue({
        data: { totp: [] },
        error: null,
      });

      const result = await authService.mfa.getStatus();

      expect(result).toEqual({
        isEnabled: false,
        factors: [],
        hasUnverifiedFactors: false,
      });
    });

    it('should throw error when get status fails', async () => {
      const mockError = {
        message: 'Failed to get MFA status',
        status: 500,
      };

      mockSupabase.auth.mfa.listFactors.mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(authService.mfa.getStatus()).rejects.toMatchObject({
        message: 'Failed to get MFA status',
        status: 500,
        code: 'MFA_STATUS_ERROR',
      });
    });
  });
});
