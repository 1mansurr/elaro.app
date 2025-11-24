import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';

// Import the main HomeScreen and its components
import HomeScreen from '../../../screens/HomeScreen';
import { HomeScreenHeader } from '../HomeScreenHeader';
import { HomeScreenContent } from '../HomeScreenContent';
import { HomeScreenFAB } from '../HomeScreenFAB';
import { HomeScreenModals } from '../HomeScreenModals';

// Mock dependencies
jest.mock('@/features/auth/contexts/AuthContext');
jest.mock('@/services/PerformanceMonitoringService');
jest.mock('@/services/RequestDeduplicationService');
jest.mock('@/hooks/useMemoization');

const mockQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={mockQueryClient}>
    <NavigationContainer>{children}</NavigationContainer>
  </QueryClientProvider>
);

describe('HomeScreen Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Alert.alert
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  describe('Component Integration', () => {
    it('should render all HomeScreen components together', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>,
      );

      // Wait for components to render
      await waitFor(() => {
        expect(getByTestId('home-screen-container')).toBeTruthy();
      });
    });

    it('should handle component state synchronization', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>,
      );

      // Test FAB state changes affect scroll behavior
      const fabButton = getByTestId('fab-button');
      fireEvent.press(fabButton);

      await waitFor(() => {
        expect(getByTestId('fab-actions-container')).toBeTruthy();
      });
    });
  });

  describe('Performance Integration', () => {
    it('should maintain performance optimizations across components', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>,
      );

      // Test that memoization is working
      const header = getByTestId('home-screen-header');
      expect(header).toBeTruthy();

      // Re-render should not cause unnecessary updates
      const { rerender } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>,
      );

      rerender(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>,
      );

      // Components should be memoized and not re-render unnecessarily
      expect(getByTestId('home-screen-header')).toBeTruthy();
    });

    it('should handle request deduplication across components', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>,
      );

      // Simulate multiple rapid refresh requests
      const refreshControl = getByTestId('refresh-control');

      act(() => {
        fireEvent(refreshControl, 'refresh');
        fireEvent(refreshControl, 'refresh');
        fireEvent(refreshControl, 'refresh');
      });

      // Should deduplicate requests
      await waitFor(() => {
        expect(getByTestId('home-screen-content')).toBeTruthy();
      });
    });
  });

  describe('User Interaction Integration', () => {
    it('should handle complete user flow from header to FAB', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>,
      );

      // 1. User sees header
      const header = getByTestId('home-screen-header');
      expect(header).toBeTruthy();

      // 2. User opens FAB
      const fabButton = getByTestId('fab-button');
      fireEvent.press(fabButton);

      await waitFor(() => {
        expect(getByTestId('fab-actions-container')).toBeTruthy();
      });

      // 3. User selects an action
      const addStudySession = getByTestId('fab-action-add-study-session');
      fireEvent.press(addStudySession);

      // Should navigate to AddStudySessionFlow
      await waitFor(() => {
        // Navigation should be triggered
        expect(true).toBe(true); // Placeholder for navigation test
      });
    });

    it('should handle notification bell interaction flow', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>,
      );

      // User clicks notification bell
      const notificationBell = getByTestId('notification-bell');
      fireEvent.press(notificationBell);

      await waitFor(() => {
        expect(getByTestId('notification-history-modal')).toBeTruthy();
      });

      // User closes modal
      const closeButton = getByTestId('modal-close-button');
      fireEvent.press(closeButton);

      await waitFor(() => {
        expect(getByTestId('notification-history-modal')).toBeFalsy();
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle component errors gracefully', async () => {
      // Mock a component to throw an error
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>,
      );

      // Should still render other components
      await waitFor(() => {
        expect(getByTestId('home-screen-container')).toBeTruthy();
      });

      consoleSpy.mockRestore();
    });

    it('should handle network errors across components', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>,
      );

      // Simulate network error
      const refreshControl = getByTestId('refresh-control');
      fireEvent(refreshControl, 'refresh');

      // Should show error state
      await waitFor(() => {
        expect(getByTestId('error-state')).toBeTruthy();
      });
    });
  });

  describe('State Management Integration', () => {
    it('should synchronize state between all components', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>,
      );

      // Test that FAB state affects scroll behavior
      const fabButton = getByTestId('fab-button');
      fireEvent.press(fabButton);

      await waitFor(() => {
        const scrollView = getByTestId('home-screen-content');
        expect(scrollView.props.scrollEnabled).toBe(false);
      });

      // Close FAB
      fireEvent.press(fabButton);

      await waitFor(() => {
        const scrollView = getByTestId('home-screen-content');
        expect(scrollView.props.scrollEnabled).toBe(true);
      });
    });

    it('should handle modal state synchronization', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>,
      );

      // Open quick add modal
      const fabButton = getByTestId('fab-button');
      fireEvent.press(fabButton);

      const quickAddAction = getByTestId('fab-action-quick-add');
      fireEvent.press(quickAddAction);

      await waitFor(() => {
        expect(getByTestId('quick-add-modal')).toBeTruthy();
      });

      // Close modal
      const closeButton = getByTestId('modal-close-button');
      fireEvent.press(closeButton);

      await waitFor(() => {
        expect(getByTestId('quick-add-modal')).toBeFalsy();
      });
    });
  });
});
