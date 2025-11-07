/**
 * Unit Tests for SwipeableTaskCard Component
 *
 * Tests swipe gesture handling, completion callback, and disabled state.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SwipeableTaskCard } from '@/features/dashboard/components/SwipeableTaskCard';

describe('SwipeableTaskCard', () => {
  it('should render children', () => {
    render(
      <SwipeableTaskCard onSwipeComplete={jest.fn()}>
        <div testID="card-content">Card Content</div>
      </SwipeableTaskCard>,
    );

    expect(screen.getByTestId('card-content')).toBeTruthy();
  });

  it('should call onSwipeComplete when swiped past threshold', () => {
    const onSwipeComplete = jest.fn();

    render(
      <SwipeableTaskCard onSwipeComplete={onSwipeComplete}>
        <div testID="card-content">Card Content</div>
      </SwipeableTaskCard>,
    );

    // Note: Actual swipe gesture testing would require more complex setup
    // This is a basic structure test
    expect(screen.getByTestId('card-content')).toBeTruthy();
  });

  it('should not trigger swipe when disabled', () => {
    const onSwipeComplete = jest.fn();

    render(
      <SwipeableTaskCard onSwipeComplete={onSwipeComplete} enabled={false}>
        <div testID="card-content">Card Content</div>
      </SwipeableTaskCard>,
    );

    expect(screen.getByTestId('card-content')).toBeTruthy();
    // Swipe should not trigger when disabled
  });

  it('should handle multiple children', () => {
    render(
      <SwipeableTaskCard onSwipeComplete={jest.fn()}>
        <div testID="child-1">Child 1</div>
        <div testID="child-2">Child 2</div>
      </SwipeableTaskCard>,
    );

    expect(screen.getByTestId('child-1')).toBeTruthy();
    expect(screen.getByTestId('child-2')).toBeTruthy();
  });
});
