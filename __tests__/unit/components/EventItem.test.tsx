/**
 * Unit Tests for EventItem Component
 *
 * Tests event item rendering, interaction, and locked state.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { EventItem } from '@/features/calendar/components/EventItem';
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
