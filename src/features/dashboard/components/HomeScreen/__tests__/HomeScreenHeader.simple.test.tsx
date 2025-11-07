import React from 'react';
import { render } from '@testing-library/react-native';
import { HomeScreenHeader } from '../HomeScreenHeader';

// Mock the auth context
jest.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
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

describe('HomeScreenHeader', () => {
  it('renders guest title for guest users', () => {
    const { getByText } = render(
      <HomeScreenHeader isGuest={true} onNotificationPress={jest.fn()} />,
    );

    expect(getByText("Let's Make Today Count")).toBeTruthy();
  });

  it('renders personalized title for authenticated users', () => {
    const { getByText } = render(
      <HomeScreenHeader isGuest={false} onNotificationPress={jest.fn()} />,
    );

    // Should contain a greeting with the username
    expect(
      getByText(/Good (morning|afternoon|evening), testuser!/),
    ).toBeTruthy();
  });
});
