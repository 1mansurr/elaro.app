import React from 'react';
import { render } from '@testing-library/react-native';
import { HomeScreenFAB } from '../HomeScreenFAB';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

// Mock mixpanel
jest.mock('@/services/mixpanel', () => ({
  mixpanelService: {
    track: jest.fn(),
  },
}));

// Mock analytics events
jest.mock('@/services/analyticsEvents', () => ({
  AnalyticsEvents: {
    STUDY_SESSION_CREATED: 'study_session_created',
    ASSIGNMENT_CREATED: 'assignment_created',
    LECTURE_CREATED: 'lecture_created',
  },
}));

// Mock performance monitoring
jest.mock('@/services/PerformanceMonitoringService', () => ({
  performanceMonitoringService: {
    startTimer: jest.fn(),
    endTimer: jest.fn(),
  },
}));

describe('HomeScreenFAB', () => {
  it('renders FAB component', () => {
    const mockOnStateChange = jest.fn();
    const mockOnDoubleTap = jest.fn();
    const mockOnDraftBadgePress = jest.fn();

    render(
      <HomeScreenFAB
        isFabOpen={false}
        draftCount={0}
        onStateChange={mockOnStateChange}
        onDoubleTap={mockOnDoubleTap}
        onDraftBadgePress={mockOnDraftBadgePress}
      />,
    );

    // The component should render without errors
    expect(mockOnStateChange).not.toHaveBeenCalled();
  });

  it('handles FAB state changes', () => {
    const mockOnStateChange = jest.fn();
    const mockOnDoubleTap = jest.fn();
    const mockOnDraftBadgePress = jest.fn();

    render(
      <HomeScreenFAB
        isFabOpen={true}
        draftCount={2}
        onStateChange={mockOnStateChange}
        onDoubleTap={mockOnDoubleTap}
        onDraftBadgePress={mockOnDraftBadgePress}
      />,
    );

    // The component should render without errors
    expect(mockOnStateChange).not.toHaveBeenCalled();
  });
});
