import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { authService } from '@/features/auth/services/authService';
import {
  checkAccountLockout,
  resetFailedAttempts,
  recordSuccessfulLogin,
} from '@/utils/authLockout';
import { updateLastActiveTimestamp } from '@/utils/sessionTimeout';
import { analyticsService } from '@/services/analytics';
import { AnalyticsEvents } from '@/services/analyticsEvents';

// Mock dependencies
jest.mock('@/features/auth/services/authService');
jest.mock('@/utils/authLockout');
jest.mock('@/utils/sessionTimeout');
jest.mock('@/services/analytics');
jest.mock('@/services/analyticsEvents', () => ({
  AnalyticsEvents: {
    USER_SIGNED_UP: 'user_signed_up',
    ERROR_OCCURRED: 'error_occurred',
  },
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockCheckAccountLockout = checkAccountLockout as jest.MockedFunction<
  typeof checkAccountLockout
>;
const mockResetFailedAttempts = resetFailedAttempts as jest.MockedFunction<
  typeof resetFailedAttempts
>;
const mockRecordSuccessfulLogin = recordSuccessfulLogin as jest.MockedFunction<
  typeof recordSuccessfulLogin
>;
const mockUpdateLastActiveTimestamp =
  updateLastActiveTimestamp as jest.MockedFunction<
    typeof updateLastActiveTimestamp
  >;
const mockAnalyticsService = analyticsService as jest.Mocked<
  typeof analyticsService
>;

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckAccountLockout.mockResolvedValue({
      isLocked: false,
      minutesRemaining: undefined,
    });
    mockResetFailedAttempts.mockResolvedValue();
    mockRecordSuccessfulLogin.mockResolvedValue();
    mockUpdateLastActiveTimestamp.mockResolvedValue();
    mockAnalyticsService.track = jest.fn();
  });

  describe('initialization', () => {
    it('should initialize with null user and loading state', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(true);
    });
  });

  describe('signIn', () => {
    it('should sign in user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const mockSession = {
        access_token: 'token',
        user: mockUser,
      };

      mockAuthService.login = jest.fn().mockResolvedValue({
        user: mockUser,
        session: mockSession,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await act(async () => {
        const response = await result.current.signIn({
          email: 'test@example.com',
          password: 'password123',
        });

        expect(response.error).toBeNull();
      });

      await waitFor(() => {
        expect(result.current.user).toBeTruthy();
      });

      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockUpdateLastActiveTimestamp).toHaveBeenCalled();
      expect(mockRecordSuccessfulLogin).toHaveBeenCalled();
      expect(mockResetFailedAttempts).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle account lockout', async () => {
      mockCheckAccountLockout.mockResolvedValue({
        isLocked: true,
        minutesRemaining: 15,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await act(async () => {
        const response = await result.current.signIn({
          email: 'test@example.com',
          password: 'password123',
        });

        expect(response.error).toBeTruthy();
        expect(response.error?.message).toContain('locked');
      });

      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should handle invalid credentials', async () => {
      const mockError = { message: 'Invalid email or password' };
      mockAuthService.login = jest.fn().mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await act(async () => {
        const response = await result.current.signIn({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

        expect(response.error).toBeTruthy();
        expect(response.error?.message).toBe('Invalid email or password');
      });
    });
  });

  describe('signUp', () => {
    it('should sign up user successfully', async () => {
      mockAuthService.signUp = jest.fn().mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        session: null,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await act(async () => {
        const response = await result.current.signUp({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        });

        expect(response.error).toBeNull();
      });

      expect(mockAuthService.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      });
      expect(mockAnalyticsService.track).toHaveBeenCalledWith(
        'user_signed_up',
        expect.objectContaining({
          signup_method: 'email',
        }),
      );
    });

    it('should handle sign up errors', async () => {
      const mockError = { message: 'Email already registered' };
      mockAuthService.signUp = jest.fn().mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await act(async () => {
        const response = await result.current.signUp({
          email: 'existing@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        });

        expect(response.error).toBeTruthy();
        expect(response.error?.message).toBe('Email already registered');
      });
    });
  });

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      mockAuthService.signOut = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockAuthService.signOut).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });

    it('should handle sign out errors', async () => {
      const mockError = { message: 'Sign out failed' };
      mockAuthService.signOut = jest.fn().mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await act(async () => {
        await expect(result.current.signOut()).rejects.toEqual(mockError);
      });
    });
  });
});
