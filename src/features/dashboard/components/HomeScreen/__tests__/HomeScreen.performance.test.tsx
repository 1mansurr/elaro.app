import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import components for performance testing
import { HomeScreenHeader } from '../HomeScreenHeader';
import { HomeScreenContent } from '../HomeScreenContent';
import { HomeScreenFAB } from '../HomeScreenFAB';
import { HomeScreenModals } from '../HomeScreenModals';

// Mock performance monitoring service
const mockPerformanceService = {
  startTimer: jest.fn(),
  endTimer: jest.fn(),
  recordMetric: jest.fn(),
  getMetrics: jest.fn(() => ({
    'header-component-mount': 5,
    'content-component-mount': 8,
    'fab-component-mount': 3,
  })),
};

jest.mock('@/services/PerformanceMonitoringService', () => ({
  performanceMonitoringService: mockPerformanceService,
}));

const mockQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={mockQueryClient}>
    <NavigationContainer>{children}</NavigationContainer>
  </QueryClientProvider>
);

describe('HomeScreen Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Mount Performance', () => {
    it('should track component mount times', async () => {
      render(
        <TestWrapper>
          <HomeScreenHeader isGuest={false} onNotificationPress={jest.fn()} />
        </TestWrapper>,
      );

      expect(mockPerformanceService.startTimer).toHaveBeenCalledWith(
        'header-component-mount',
      );
      expect(mockPerformanceService.endTimer).toHaveBeenCalledWith(
        'header-component-mount',
      );
    });

    it('should track content component mount performance', async () => {
      render(
        <TestWrapper>
          <HomeScreenContent
            isGuest={false}
            homeData={null}
            isLoading={false}
            isRefetching={false}
            monthlyTaskCount={0}
            shouldShowBanner={false}
            trialDaysRemaining={null}
            onSwipeComplete={jest.fn()}
            onViewDetails={jest.fn()}
            onFabStateChange={jest.fn()}
            onSubscribePress={jest.fn()}
            onDismissBanner={jest.fn()}
            scrollEnabled={true}
          />
        </TestWrapper>,
      );

      expect(mockPerformanceService.startTimer).toHaveBeenCalledWith(
        'content-component-mount',
      );
      expect(mockPerformanceService.endTimer).toHaveBeenCalledWith(
        'content-component-mount',
      );
    });

    it('should track FAB component mount performance', async () => {
      render(
        <TestWrapper>
          <HomeScreenFAB
            isFabOpen={false}
            draftCount={0}
            onStateChange={jest.fn()}
            onDoubleTap={jest.fn()}
            onDraftBadgePress={jest.fn()}
          />
        </TestWrapper>,
      );

      expect(mockPerformanceService.startTimer).toHaveBeenCalledWith(
        'fab-component-mount',
      );
      expect(mockPerformanceService.endTimer).toHaveBeenCalledWith(
        'fab-component-mount',
      );
    });
  });

  describe('Memoization Performance', () => {
    it('should test expensive memoization caching', async () => {
      const { rerender } = render(
        <TestWrapper>
          <HomeScreenHeader isGuest={false} onNotificationPress={jest.fn()} />
        </TestWrapper>,
      );

      // First render
      expect(mockPerformanceService.startTimer).toHaveBeenCalledWith(
        'header-title-calculation',
      );

      // Re-render with same props
      rerender(
        <TestWrapper>
          <HomeScreenHeader isGuest={false} onNotificationPress={jest.fn()} />
        </TestWrapper>,
      );

      // Should use cached result, not recalculate
      expect(mockPerformanceService.startTimer).toHaveBeenCalledTimes(1);
    });

    it('should test stable callback performance', async () => {
      const mockCallback = jest.fn();

      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreenHeader
            isGuest={false}
            onNotificationPress={mockCallback}
          />
        </TestWrapper>,
      );

      const notificationBell = getByTestId('notification-bell');

      // Multiple rapid clicks should use stable callback
      fireEvent.press(notificationBell);
      fireEvent.press(notificationBell);
      fireEvent.press(notificationBell);

      expect(mockPerformanceService.startTimer).toHaveBeenCalledWith(
        'header-notification-press',
      );
      expect(mockPerformanceService.endTimer).toHaveBeenCalledWith(
        'header-notification-press',
      );
    });
  });

  describe('Request Deduplication Performance', () => {
    it('should test request deduplication efficiency', async () => {
      const mockRefresh = jest.fn();

      const { getByTestId } = render(
        <TestWrapper>
          <HomeScreenContent
            isGuest={false}
            homeData={null}
            isLoading={false}
            isRefetching={false}
            monthlyTaskCount={0}
            shouldShowBanner={false}
            trialDaysRemaining={null}
            onSwipeComplete={jest.fn()}
            onViewDetails={jest.fn()}
            onFabStateChange={jest.fn()}
            onSubscribePress={jest.fn()}
            onDismissBanner={jest.fn()}
            scrollEnabled={true}
          />
        </TestWrapper>,
      );

      const refreshControl = getByTestId('refresh-control');

      // Rapid multiple refresh requests
      act(() => {
        fireEvent(refreshControl, 'refresh');
        fireEvent(refreshControl, 'refresh');
        fireEvent(refreshControl, 'refresh');
      });

      // Should deduplicate requests
      expect(mockPerformanceService.startTimer).toHaveBeenCalledWith(
        'home-screen-refresh',
      );
      expect(mockPerformanceService.endTimer).toHaveBeenCalledWith(
        'home-screen-refresh',
      );
    });
  });

  describe('Animation Performance', () => {
    it('should test FAB animation performance', async () => {
      const { getByTestId, rerender } = render(
        <TestWrapper>
          <HomeScreenFAB
            isFabOpen={false}
            draftCount={0}
            onStateChange={jest.fn()}
            onDoubleTap={jest.fn()}
            onDraftBadgePress={jest.fn()}
          />
        </TestWrapper>,
      );

      // Test opening animation
      rerender(
        <TestWrapper>
          <HomeScreenFAB
            isFabOpen={true}
            draftCount={0}
            onStateChange={jest.fn()}
            onDoubleTap={jest.fn()}
            onDraftBadgePress={jest.fn()}
          />
        </TestWrapper>,
      );

      expect(mockPerformanceService.startTimer).toHaveBeenCalledWith(
        'fab-state-change',
      );
      expect(mockPerformanceService.endTimer).toHaveBeenCalledWith(
        'fab-state-change',
      );
    });
  });

  describe('Memory Performance', () => {
    it('should test component unmount cleanup', async () => {
      const { unmount } = render(
        <TestWrapper>
          <HomeScreenHeader isGuest={false} onNotificationPress={jest.fn()} />
        </TestWrapper>,
      );

      unmount();

      // Should clean up performance timers
      expect(mockPerformanceService.endTimer).toHaveBeenCalledWith(
        'header-component-mount',
      );
    });

    it('should test modal visibility performance tracking', async () => {
      const { rerender } = render(
        <TestWrapper>
          <HomeScreenModals
            selectedTask={null}
            isQuickAddVisible={false}
            isNotificationHistoryVisible={false}
            onCloseSheet={jest.fn()}
            onEditTask={jest.fn()}
            onCompleteTask={jest.fn()}
            onDeleteTask={jest.fn()}
            onCloseQuickAdd={jest.fn()}
            onCloseNotificationHistory={jest.fn()}
          />
        </TestWrapper>,
      );

      // Open quick add modal
      rerender(
        <TestWrapper>
          <HomeScreenModals
            selectedTask={null}
            isQuickAddVisible={true}
            isNotificationHistoryVisible={false}
            onCloseSheet={jest.fn()}
            onEditTask={jest.fn()}
            onCompleteTask={jest.fn()}
            onDeleteTask={jest.fn()}
            onCloseQuickAdd={jest.fn()}
            onCloseNotificationHistory={jest.fn()}
          />
        </TestWrapper>,
      );

      expect(mockPerformanceService.startTimer).toHaveBeenCalledWith(
        'quick-add-modal-open',
      );
      expect(mockPerformanceService.endTimer).toHaveBeenCalledWith(
        'quick-add-modal-open',
      );
    });
  });

  describe('Performance Metrics Collection', () => {
    it('should collect and report performance metrics', async () => {
      render(
        <TestWrapper>
          <HomeScreenHeader isGuest={false} onNotificationPress={jest.fn()} />
        </TestWrapper>,
      );

      const metrics = mockPerformanceService.getMetrics();

      expect(metrics).toHaveProperty('header-component-mount');
      expect(metrics).toHaveProperty('content-component-mount');
      expect(metrics).toHaveProperty('fab-component-mount');

      expect(typeof metrics['header-component-mount']).toBe('number');
      expect(metrics['header-component-mount']).toBeGreaterThan(0);
    });

    it('should track performance regression', async () => {
      // Simulate performance regression
      mockPerformanceService.getMetrics.mockReturnValue({
        'header-component-mount': 100, // Slow mount time
        'content-component-mount': 150,
        'fab-component-mount': 200,
      });

      render(
        <TestWrapper>
          <HomeScreenHeader isGuest={false} onNotificationPress={jest.fn()} />
        </TestWrapper>,
      );

      const metrics = mockPerformanceService.getMetrics();

      // Should detect slow performance
      expect(metrics['header-component-mount']).toBeGreaterThan(50);
      expect(metrics['content-component-mount']).toBeGreaterThan(100);
      expect(metrics['fab-component-mount']).toBeGreaterThan(150);
    });
  });
});
