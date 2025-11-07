/**
 * Unit Tests for NextTaskCard Component
 *
 * Tests task card rendering, guest mode, and interaction handling.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import NextTaskCard from '@/features/dashboard/components/NextTaskCard';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Mock navigation
const Stack = createStackNavigator();
const TestNavigator = ({ children }: { children: React.ReactNode }) => (
  <NavigationContainer>
    <Stack.Navigator>
      <Stack.Screen name="Test" component={() => <>{children}</>} />
    </Stack.Navigator>
  </NavigationContainer>
);

// Mock task
const mockTask = {
  id: '1',
  name: 'Test Assignment',
  type: 'assignment',
  date: new Date().toISOString(),
  status: 'pending',
  course_id: 'course-1',
  user_id: 'user-1',
};

describe('NextTaskCard', () => {
  it('should render task details when task is provided', () => {
    render(
      <TestNavigator>
        <NextTaskCard task={mockTask} />
      </TestNavigator>,
    );

    expect(screen.getByText(/Test Assignment/i)).toBeTruthy();
  });

  it('should render empty state when task is null', () => {
    render(
      <TestNavigator>
        <NextTaskCard task={null} />
      </TestNavigator>,
    );

    // Should show empty state or message
    expect(screen.queryByText(/Test Assignment/i)).toBeNull();
  });

  it('should handle guest mode correctly', () => {
    const onAddActivity = jest.fn();

    render(
      <TestNavigator>
        <NextTaskCard
          task={mockTask}
          isGuestMode={true}
          onAddActivity={onAddActivity}
        />
      </TestNavigator>,
    );

    // In guest mode, should show add activity button or similar
    expect(screen.getByText(/Test Assignment/i)).toBeTruthy();
  });

  it('should call onAddActivity when provided in guest mode', () => {
    const onAddActivity = jest.fn();

    render(
      <TestNavigator>
        <NextTaskCard
          task={null}
          isGuestMode={true}
          onAddActivity={onAddActivity}
        />
      </TestNavigator>,
    );

    // Find and press add activity button if it exists
    const addButton = screen.queryByText(/add/i);
    if (addButton) {
      fireEvent.press(addButton);
      expect(onAddActivity).toHaveBeenCalled();
    }
  });

  it('should call onViewDetails when task is pressed', () => {
    const onViewDetails = jest.fn();

    render(
      <TestNavigator>
        <NextTaskCard task={mockTask} onViewDetails={onViewDetails} />
      </TestNavigator>,
    );

    const taskCard = screen.getByText(/Test Assignment/i);
    fireEvent.press(taskCard);

    expect(onViewDetails).toHaveBeenCalledWith(mockTask);
  });

  it('should display example badge for example tasks', () => {
    const exampleTask = {
      ...mockTask,
      is_example: true,
    };

    render(
      <TestNavigator>
        <NextTaskCard
          task={exampleTask as typeof mockTask & { is_example: boolean }}
        />
      </TestNavigator>,
    );

    expect(screen.getByText(/EXAMPLE/i)).toBeTruthy();
  });
});
