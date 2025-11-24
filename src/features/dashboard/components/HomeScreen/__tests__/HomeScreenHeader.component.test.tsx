import React from 'react';
import { render } from '@testing-library/react-native';
import HomeScreenHeader from '../HomeScreenHeader';

// Mock all the dependencies
jest.mock(
  '@/features/notifications/components/NotificationBell',
  () => 'NotificationBell',
);
jest.mock('@/constants/theme', () => ({
  COLORS: {
    background: 'COLORS.white',
    textPrimary: 'COLORS.black',
    textSecondary: 'COLORS.textSecondary',
    accent: 'COLORS.primary',
  },
  FONT_SIZES: {
    xxl: 24,
    xl: 20,
    lg: 18,
    md: 16,
    sm: 14,
  },
  FONT_WEIGHTS: {
    bold: 'bold',
    medium: '500',
    normal: 'normal',
  },
  SPACING: {
    lg: 24,
    md: 16,
    sm: 8,
  },
}));

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

jest.mock('@/services/PerformanceMonitoringService', () => ({
  performanceMonitoringService: {
    startTimer: jest.fn(),
    endTimer: jest.fn(),
  },
}));

describe('HomeScreenHeader Component', () => {
  const mockProps = {
    isGuest: false,
    onNotificationPress: jest.fn(),
  };

  it('renders without crashing', () => {
    expect(() => {
      render(<HomeScreenHeader {...mockProps} />);
    }).not.toThrow();
  });

  it('renders guest mode correctly', () => {
    const { getByText } = render(
      <HomeScreenHeader isGuest={true} onNotificationPress={jest.fn()} />,
    );

    expect(getByText("Let's Make Today Count")).toBeTruthy();
  });

  it('renders authenticated mode correctly', () => {
    const { getByText } = render(
      <HomeScreenHeader isGuest={false} onNotificationPress={jest.fn()} />,
    );

    // Should contain a greeting with the user's name
    expect(getByText(/Good/)).toBeTruthy();
  });
});
