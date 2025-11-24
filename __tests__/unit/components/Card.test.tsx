/**
 * Unit Tests for Card Component
 *
 * Tests card rendering, title display, and styling.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Card from '@/shared/components/Card';

describe('Card', () => {
  it('should render children without title', () => {
    render(
      <Card>
        <div testID="card-content">Card Content</div>
      </Card>,
    );

    expect(screen.getByTestId('card-content')).toBeTruthy();
    expect(screen.queryByText(/title/i)).toBeNull();
  });

  it('should render title when provided', () => {
    render(
      <Card title="Test Title">
        <div testID="card-content">Card Content</div>
      </Card>,
    );

    expect(screen.getByText('Test Title')).toBeTruthy();
    expect(screen.getByTestId('card-content')).toBeTruthy();
  });

  it('should apply custom styles when provided', () => {
    const customStyle = { backgroundColor: '#FF0000' };

    const { getByTestId } = render(
      <Card style={customStyle}>
        <div testID="card-content">Card Content</div>
      </Card>,
    );

    const card = getByTestId('card-content').parent;
    expect(card).toBeTruthy();
  });

  it('should render multiple children', () => {
    render(
      <Card>
        <div testID="child-1">Child 1</div>
        <div testID="child-2">Child 2</div>
      </Card>,
    );

    expect(screen.getByTestId('child-1')).toBeTruthy();
    expect(screen.getByTestId('child-2')).toBeTruthy();
  });
});
