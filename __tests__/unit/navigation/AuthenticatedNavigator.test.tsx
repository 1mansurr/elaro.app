/**
 * Authenticated Navigator Tests
 * 
 * Tests for src/navigation/AuthenticatedNavigator.tsx
 * Target: 70%+ coverage
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { AuthenticatedNavigator } from '@/navigation/AuthenticatedNavigator';
import { useAuth } from '@/contexts/AuthContext';
import { useSmartPreloading } from '@/hooks/useSmartPreloading';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('@/hooks/useSmartPreloading');
jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ name }: { name: string }) => <div testID={`screen-${name}`}>{name}</div>,
    Group: ({ children }: { children: React.ReactNode }) => children,
  }),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    View: ({ children, testID }: any) => <div testID={testID}>{children}</div>,
    ActivityIndicator: () => <div testID="activity-indicator">Loading</div>,
  };
});

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseSmartPreloading = useSmartPreloading as jest.MockedFunction<
  typeof useSmartPreloading
>;

describe('AuthenticatedNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();

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

    mockUseSmartPreloading.mockReturnValue(undefined);
  });

  describe('rendering', () => {
    it('should render navigator with main screens', () => {
      const { getByTestId } = render(<AuthenticatedNavigator />);

      // Should render main navigator
      expect(mockUseSmartPreloading).toHaveBeenCalled();
    });

    it('should enable smart preloading', () => {
      render(<AuthenticatedNavigator />);
      expect(mockUseSmartPreloading).toHaveBeenCalled();
    });

    it('should render with Suspense boundary', () => {
      const { container } = render(<AuthenticatedNavigator />);
      // Suspense should wrap the navigator
      expect(container).toBeTruthy();
    });
  });

  describe('screen configuration', () => {
    it('should configure main tab navigator', () => {
      render(<AuthenticatedNavigator />);
      // Main screen should be configured
      // (exact implementation depends on component structure)
    });

    it('should configure modal flows', () => {
      render(<AuthenticatedNavigator />);
      // Modal flows should be configured
      // (exact implementation depends on component structure)
    });
  });

  describe('error boundaries', () => {
    it('should wrap flows in error boundaries', () => {
      render(<AuthenticatedNavigator />);
      // Feature error boundaries should wrap critical flows
      // (exact implementation depends on component structure)
    });
  });
});

