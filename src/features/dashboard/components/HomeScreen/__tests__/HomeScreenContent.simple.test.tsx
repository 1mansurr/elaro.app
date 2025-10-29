import React from 'react';
import { render } from '@testing-library/react-native';
import { HomeScreenContent } from '../HomeScreenContent';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
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

// Mock query client
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
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
  it('renders guest content for guest users', () => {
    const { getByText } = render(
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
    );
    
    expect(getByText('View Full Calendar')).toBeTruthy();
  });
});
