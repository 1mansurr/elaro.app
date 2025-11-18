/**
 * App Navigator Tests
 * 
 * Tests for src/navigation/AppNavigator.tsx
 * Target: 70%+ coverage
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { AppNavigator } from '@/navigation/AppNavigator';
import { useAuth } from '@/contexts/AuthContext';
import { AuthenticatedNavigator } from '@/navigation/AuthenticatedNavigator';
import { AuthNavigator } from '@/navigation/AuthNavigator';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('@/navigation/AuthenticatedNavigator');
jest.mock('@/navigation/AuthNavigator');
jest.mock('@/hooks/useScreenTracking', () => ({
  useScreenTracking: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const MockAuthenticatedNavigator = AuthenticatedNavigator as jest.MockedFunction<
  typeof AuthenticatedNavigator
>;
const MockAuthNavigator = AuthNavigator as jest.MockedFunction<
  typeof AuthNavigator
>;

describe('AppNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    MockAuthenticatedNavigator.mockReturnValue(
      <div testID="authenticated-navigator">Authenticated</div> as any,
    );
    MockAuthNavigator.mockReturnValue(
      <div testID="auth-navigator">Auth</div> as any,
    );
  });

  describe('loading state', () => {
    it('should show loading indicator when auth is loading', () => {
      mockUseAuth.mockReturnValue({
        session: null,
        user: null,
        loading: true,
        isGuest: true,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        refreshUser: jest.fn(),
      });

      const { getByTestId } = render(<AppNavigator />);

      // Should show loading indicator
      const loadingIndicator = getByTestId('activity-indicator');
      expect(loadingIndicator).toBeTruthy();
    });

    it('should not show navigator when loading', () => {
      mockUseAuth.mockReturnValue({
        session: null,
        user: null,
        loading: true,
        isGuest: true,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        refreshUser: jest.fn(),
      });

      const { queryByTestId } = render(<AppNavigator />);

      expect(queryByTestId('authenticated-navigator')).toBeNull();
      expect(queryByTestId('auth-navigator')).toBeNull();
    });
  });

  describe('authenticated state', () => {
    it('should render AuthenticatedNavigator when user is authenticated', () => {
      mockUseAuth.mockReturnValue({
        session: { user: { id: 'user-123' } } as any,
        user: { id: 'user-123', email: 'test@example.com' } as any,
        loading: false,
        isGuest: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        refreshUser: jest.fn(),
      });

      const { getByTestId } = render(<AppNavigator />);

      expect(getByTestId('authenticated-navigator')).toBeTruthy();
      expect(MockAuthenticatedNavigator).toHaveBeenCalled();
    });

    it('should not render AuthNavigator when authenticated', () => {
      mockUseAuth.mockReturnValue({
        session: { user: { id: 'user-123' } } as any,
        user: { id: 'user-123', email: 'test@example.com' } as any,
        loading: false,
        isGuest: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        refreshUser: jest.fn(),
      });

      const { queryByTestId } = render(<AppNavigator />);

      expect(queryByTestId('auth-navigator')).toBeNull();
    });
  });

  describe('unauthenticated state', () => {
    it('should render AuthNavigator when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        session: null,
        user: null,
        loading: false,
        isGuest: true,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        refreshUser: jest.fn(),
      });

      const { getByTestId } = render(<AppNavigator />);

      expect(getByTestId('auth-navigator')).toBeTruthy();
      expect(MockAuthNavigator).toHaveBeenCalled();
    });

    it('should not render AuthenticatedNavigator when unauthenticated', () => {
      mockUseAuth.mockReturnValue({
        session: null,
        user: null,
        loading: false,
        isGuest: true,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        refreshUser: jest.fn(),
      });

      const { queryByTestId } = render(<AppNavigator />);

      expect(queryByTestId('authenticated-navigator')).toBeNull();
    });
  });

  describe('screen tracking', () => {
    it('should enable screen tracking', () => {
      const { useScreenTracking } = require('@/hooks/useScreenTracking');
      mockUseAuth.mockReturnValue({
        session: null,
        user: null,
        loading: false,
        isGuest: true,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        refreshUser: jest.fn(),
      });

      render(<AppNavigator />);

      expect(useScreenTracking).toHaveBeenCalled();
    });
  });

  describe('state transitions', () => {
    it('should switch from unauthenticated to authenticated when session changes', () => {
      const { rerender } = render(<AppNavigator />);

      // Initially unauthenticated
      mockUseAuth.mockReturnValue({
        session: null,
        user: null,
        loading: false,
        isGuest: true,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        refreshUser: jest.fn(),
      });

      rerender(<AppNavigator />);
      expect(MockAuthNavigator).toHaveBeenCalled();

      // Then authenticated
      mockUseAuth.mockReturnValue({
        session: { user: { id: 'user-123' } } as any,
        user: { id: 'user-123' } as any,
        loading: false,
        isGuest: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        refreshUser: jest.fn(),
      });

      rerender(<AppNavigator />);
      expect(MockAuthenticatedNavigator).toHaveBeenCalled();
    });

    it('should switch from authenticated to unauthenticated when session ends', () => {
      // Initially authenticated
      mockUseAuth.mockReturnValue({
        session: { user: { id: 'user-123' } } as any,
        user: { id: 'user-123' } as any,
        loading: false,
        isGuest: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        refreshUser: jest.fn(),
      });

      const { rerender } = render(<AppNavigator />);
      expect(MockAuthenticatedNavigator).toHaveBeenCalled();

      // Then unauthenticated
      mockUseAuth.mockReturnValue({
        session: null,
        user: null,
        loading: false,
        isGuest: true,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        refreshUser: jest.fn(),
      });

      rerender(<AppNavigator />);
      expect(MockAuthNavigator).toHaveBeenCalled();
    });
  });
});

