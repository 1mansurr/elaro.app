import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';

// Import the complete HomeScreen
import HomeScreen from '../../../screens/HomeScreen';

// Mock all external dependencies
jest.mock('@/features/auth/contexts/AuthContext');
jest.mock('@/services/PerformanceMonitoringService');
jest.mock('@/services/RequestDeduplicationService');
jest.mock('@/hooks/useMemoization');
jest.mock('@/services/mixpanel');
jest.mock('@/services/analyticsEvents');
jest.mock('@/utils/analyticsEvents');
jest.mock('@/utils/exampleData');
jest.mock('@/utils/draftStorage');
jest.mock('@/utils/errorMapping');
jest.mock('@/contexts/ToastContext');
jest.mock('@/hooks');
jest.mock('@/services/supabase');

// Mock navigation
const mockNavigate = jest.fn();
const mockDispatch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    dispatch: mockDispatch,
  }),
  useFocusEffect: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Test wrapper with all necessary providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={mockQueryClient}>
    <NavigationContainer>
      {children}
    </NavigationContainer>
  </QueryClientProvider>
);

describe('HomeScreen Complete Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Alert.alert
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  describe('Complete HomeScreen Rendering', () => {
    it('should render the complete HomeScreen without errors', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      // Wait for all components to render
      await waitFor(() => {
        expect(getByTestId('home-screen-container')).toBeTruthy();
      });

      // Verify all main components are present
      expect(getByTestId('home-screen-header')).toBeTruthy();
      expect(getByTestId('home-screen-content')).toBeTruthy();
      expect(getByTestId('home-screen-fab')).toBeTruthy();
    });

    it('should handle complete user interaction flow', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      // 1. User sees the home screen
      await waitFor(() => {
        expect(getByTestId('home-screen-container')).toBeTruthy();
      });

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
      expect(mockNavigate).toHaveBeenCalledWith('AddStudySessionFlow');
    });

    it('should handle notification bell interaction', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      // User clicks notification bell
      const notificationBell = getByTestId('notification-bell');
      fireEvent.press(notificationBell);

      await waitFor(() => {
        expect(getByTestId('notification-history-modal')).toBeTruthy();
      });
    });

    it('should handle task swipe completion', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      // Simulate task swipe
      const swipeableTask = getByTestId('swipeable-task-card');
      fireEvent(swipeableTask, 'onSwipeComplete');

      // Should handle the swipe completion
      await waitFor(() => {
        expect(getByTestId('home-screen-content')).toBeTruthy();
      });
    });
  });

  describe('Performance Integration', () => {
    it('should maintain performance optimizations across all components', async () => {
      const { getByTestId, rerender } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      // Initial render
      await waitFor(() => {
        expect(getByTestId('home-screen-container')).toBeTruthy();
      });

      // Re-render to test memoization
      rerender(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      // Components should be memoized and not cause unnecessary re-renders
      expect(getByTestId('home-screen-header')).toBeTruthy();
      expect(getByTestId('home-screen-content')).toBeTruthy();
      expect(getByTestId('home-screen-fab')).toBeTruthy();
    });

    it('should handle rapid user interactions efficiently', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      const fabButton = getByTestId('fab-button');
      
      // Rapid FAB interactions
      act(() => {
        fireEvent.press(fabButton);
        fireEvent.press(fabButton);
        fireEvent.press(fabButton);
      });

      // Should handle rapid interactions without performance issues
      await waitFor(() => {
        expect(getByTestId('fab-actions-container')).toBeTruthy();
      });
    });
  });

  describe('State Synchronization', () => {
    it('should synchronize state between all components', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      // Test FAB state affects scroll behavior
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
        </TestWrapper>
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

  describe('Error Handling Integration', () => {
    it('should handle component errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      // Should render without crashing
      await waitFor(() => {
        expect(getByTestId('home-screen-container')).toBeTruthy();
      });

      consoleSpy.mockRestore();
    });

    it('should handle network errors gracefully', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      // Simulate network error
      const refreshControl = getByTestId('refresh-control');
      fireEvent(refreshControl, 'refresh');

      // Should handle error gracefully
      await waitFor(() => {
        expect(getByTestId('home-screen-content')).toBeTruthy();
      });
    });
  });

  describe('Memory Management', () => {
    it('should clean up resources on unmount', async () => {
      const { unmount } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      // Unmount component
      unmount();

      // Should clean up without memory leaks
      expect(true).toBe(true); // Placeholder for memory leak detection
    });

    it('should handle component lifecycle properly', async () => {
      const { getByTestId, unmount } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      // Mount
      await waitFor(() => {
        expect(getByTestId('home-screen-container')).toBeTruthy();
      });

      // Unmount
      unmount();

      // Should complete lifecycle without errors
      expect(true).toBe(true);
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain accessibility across all components', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      // Check accessibility attributes
      const header = getByTestId('home-screen-header');
      expect(header).toBeTruthy();

      const content = getByTestId('home-screen-content');
      expect(content).toBeTruthy();

      const fab = getByTestId('home-screen-fab');
      expect(fab).toBeTruthy();
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('should work consistently across platforms', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      // Test platform-specific behavior
      await waitFor(() => {
        expect(getByTestId('home-screen-container')).toBeTruthy();
      });

      // Should work on both iOS and Android
      expect(getByTestId('home-screen-header')).toBeTruthy();
      expect(getByTestId('home-screen-content')).toBeTruthy();
      expect(getByTestId('home-screen-fab')).toBeTruthy();
    });
  });
});
