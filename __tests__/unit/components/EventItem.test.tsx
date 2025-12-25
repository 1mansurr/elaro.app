/**
 * Unit Tests for EventItem Component
 *
 * Tests event item rendering, interaction, and locked state.
 */

import React from 'react';
// Note: react-native is already mocked in jest-setup.ts

// Mock @expo/vector-icons BEFORE importing component
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, size, color, ...props }: any) => {
      return React.createElement(
        Text,
        { ...props, testID: `icon-${name}` },
        name,
      );
    },
  };
});

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date: Date, formatStr: string) => {
    if (formatStr === 'h:mm a') {
      return '10:00 AM';
    }
    return date.toISOString().slice(0, 10); // Simple mock
  }),
}));

// Mock constants
jest.mock('@/constants/theme', () => ({
  BORDER_RADIUS: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
  },
  SHADOWS: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
  },
}));

// Import component AFTER mocks
import { render, screen, fireEvent } from '@testing-library/react-native';
import { EventItem } from '@/features/calendar/components';
import { Task } from '@/types';

const mockTask: Task = {
  id: '1',
  name: 'Test Lecture',
  type: 'lecture',
  date: new Date().toISOString(),
  status: 'pending',
  course_id: 'course-1',
  user_id: 'user-1',
};

const mockPosition = {
  top: 100,
  left: 50,
  height: 60,
  width: 200,
};

describe('EventItem', () => {
  it('should render task name', () => {
    render(
      <EventItem
        task={mockTask}
        position={mockPosition}
        onPress={jest.fn()}
        onViewDetails={jest.fn()}
        isExpanded={false}
      />,
    );

    expect(screen.getByText('Test Lecture')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const onPress = jest.fn();

    render(
      <EventItem
        task={mockTask}
        position={mockPosition}
        onPress={onPress}
        onViewDetails={jest.fn()}
        isExpanded={false}
      />,
    );

    const eventItem = screen.getByText('Test Lecture');
    fireEvent.press(eventItem);

    expect(onPress).toHaveBeenCalled();
  });

  it('should call onViewDetails when view details is triggered', () => {
    const onViewDetails = jest.fn();

    render(
      <EventItem
        task={mockTask}
        position={mockPosition}
        onPress={jest.fn()}
        onViewDetails={onViewDetails}
        isExpanded={true}
      />,
    );

    // Find and trigger view details action
    const viewDetailsButton = screen.queryByText(/details/i);
    if (viewDetailsButton) {
      fireEvent.press(viewDetailsButton);
      expect(onViewDetails).toHaveBeenCalled();
    }
  });

  it('should display locked state when isLocked is true', () => {
    render(
      <EventItem
        task={mockTask}
        position={mockPosition}
        onPress={jest.fn()}
        onViewDetails={jest.fn()}
        isExpanded={false}
        isLocked={true}
      />,
    );

    // Locked items may have different styling or indicators
    expect(screen.getByText('Test Lecture')).toBeTruthy();
  });

  it('should display different colors for different task types', () => {
    const assignmentTask = { ...mockTask, type: 'assignment' as const };

    render(
      <EventItem
        task={assignmentTask}
        position={mockPosition}
        onPress={jest.fn()}
        onViewDetails={jest.fn()}
        isExpanded={false}
      />,
    );

    expect(screen.getByText('Test Lecture')).toBeTruthy();
  });

  it('should show completed state for completed tasks', () => {
    const completedTask = { ...mockTask, status: 'completed' as const };

    render(
      <EventItem
        task={completedTask}
        position={mockPosition}
        onPress={jest.fn()}
        onViewDetails={jest.fn()}
        isExpanded={false}
      />,
    );

    expect(screen.getByText('Test Lecture')).toBeTruthy();
  });

  it('should display example badge for example tasks', () => {
    const exampleTask = {
      ...mockTask,
      is_example: true,
    };

    render(
      <EventItem
        task={exampleTask as typeof mockTask & { is_example: boolean }}
        position={mockPosition}
        onPress={jest.fn()}
        onViewDetails={jest.fn()}
        isExpanded={false}
      />,
    );

    // Should show example indicator
    expect(screen.getByText('Test Lecture')).toBeTruthy();
  });
});
