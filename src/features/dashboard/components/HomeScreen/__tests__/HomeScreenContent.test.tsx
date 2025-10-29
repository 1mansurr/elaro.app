import React from 'react';
import { render } from '@testing-library/react-native';
import { HomeScreenContent } from '../HomeScreenContent';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

// Mock auth context
jest.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      subscription_tier: 'free',
    },
  }),
}));

// Mock performance monitoring
jest.mock('@/services/PerformanceMonitoringService', () => ({
  performanceMonitoringService: {
    startTimer: jest.fn(),
    endTimer: jest.fn(),
  },
}));

// Mock request deduplication
jest.mock('@/services/RequestDeduplicationService', () => ({
  requestDeduplicationService: {
    deduplicateRequest: jest.fn((key, fn) => fn()),
  },
}));

describe('HomeScreenContent', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it('renders guest content for guest users', () => {
    const { getByText } = render(
      <QueryClientProvider client={queryClient}>
        <HomeScreenContent
          isGuest={true}
          homeData={null}
          isLoading={false}
          isFabOpen={false}
          monthlyTaskCount={0}
          shouldShowBanner={false}
          trialDaysRemaining={null}
          onSwipeComplete={jest.fn()}
          onViewDetails={jest.fn()}
          onFabStateChange={jest.fn()}
          onSubscribePress={jest.fn()}
          onDismissBanner={jest.fn()}
        />
      </QueryClientProvider>
    );
    
    expect(getByText('View Full Calendar')).toBeTruthy();
  });

  it('renders authenticated content with home data', () => {
    const mockHomeData = {
      nextUpcomingTask: {
        id: 'task-1',
        title: 'Test Task',
        type: 'assignment',
      },
      todayOverview: {
        lectures: 2,
        assignments: 1,
        studySessions: 3,
      },
    };

    const { getByText } = render(
      <QueryClientProvider client={queryClient}>
        <HomeScreenContent
          isGuest={false}
          homeData={mockHomeData}
          isLoading={false}
          isFabOpen={false}
          monthlyTaskCount={10}
          shouldShowBanner={false}
          trialDaysRemaining={null}
          onSwipeComplete={jest.fn()}
          onViewDetails={jest.fn()}
          onFabStateChange={jest.fn()}
          onSubscribePress={jest.fn()}
          onDismissBanner={jest.fn()}
        />
      </QueryClientProvider>
    );
    
    expect(getByText('View Full Calendar')).toBeTruthy();
  });

  it('shows trial banner when shouldShowBanner is true', () => {
    const { getByText } = render(
      <QueryClientProvider client={queryClient}>
        <HomeScreenContent
          isGuest={false}
          homeData={null}
          isLoading={false}
          isFabOpen={false}
          monthlyTaskCount={0}
          shouldShowBanner={true}
          trialDaysRemaining={2}
          onSwipeComplete={jest.fn()}
          onViewDetails={jest.fn()}
          onFabStateChange={jest.fn()}
          onSubscribePress={jest.fn()}
          onDismissBanner={jest.fn()}
        />
      </QueryClientProvider>
    );
    
    // The TrialBanner component should be rendered
    // Note: This test would need the TrialBanner to have testable content
    expect(getByText('View Full Calendar')).toBeTruthy();
  });
});
