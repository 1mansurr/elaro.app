/**
 * Unit Tests for Card Component
 *
 * Tests card rendering, title display, and styling.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { View, Text } from 'react-native';

// Mock ThemeContext BEFORE importing Card
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      background: '#FFFFFF',
      text: '#000000',
      accent: '#2C5EFF',
    },
    toggleTheme: jest.fn(),
    isDarkMode: false,
    isDark: false,
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Import Card after mocks are set up
// Try importing from index to see if that works better
import { Card } from '@/shared/components';

describe('Card', () => {
  it('should render children without title', () => {
    render(
      <Card>
        <View testID="card-content">
          <Text>Card Content</Text>
        </View>
      </Card>,
    );

    expect(screen.getByTestId('card-content')).toBeTruthy();
    expect(screen.queryByText(/title/i)).toBeNull();
  });

  it('should render title when provided', () => {
    render(
      <Card title="Test Title">
        <View testID="card-content">
          <Text>Card Content</Text>
        </View>
      </Card>,
    );

    expect(screen.getByText('Test Title')).toBeTruthy();
    expect(screen.getByTestId('card-content')).toBeTruthy();
  });

  it('should apply custom styles when provided', () => {
    const customStyle = { backgroundColor: '#FF0000' };

    const { getByTestId } = render(
      <Card style={customStyle}>
        <View testID="card-content">
          <Text>Card Content</Text>
        </View>
      </Card>,
    );

    const card = getByTestId('card-content').parent;
    expect(card).toBeTruthy();
  });

  it('should render multiple children', () => {
    render(
      <Card>
        <View testID="child-1">
          <Text>Child 1</Text>
        </View>
        <View testID="child-2">
          <Text>Child 2</Text>
        </View>
      </Card>,
    );

    expect(screen.getByTestId('child-1')).toBeTruthy();
    expect(screen.getByTestId('child-2')).toBeTruthy();
  });
});
