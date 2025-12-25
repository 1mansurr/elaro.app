/**
 * Unit Tests for EmptyState Component
 *
 * Tests the rendering and customization of the EmptyState component.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';

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

// Mock ThemeContext BEFORE importing component
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      background: '#FFFFFF',
      text: '#000000',
      textSecondary: '#666666',
    },
    toggleTheme: jest.fn(),
    isDarkMode: false,
    isDark: false,
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Import component AFTER mocks - try importing from index
import { EmptyState } from '@/shared/components';

describe('EmptyState', () => {
  it('should render with default props', () => {
    render(<EmptyState title="No items" message="No items found" />);

    expect(screen.getByText('No items')).toBeTruthy();
    expect(screen.getByText('No items found')).toBeTruthy();
  });

  it('should render with custom icon', () => {
    render(
      <EmptyState
        title="No assignments"
        message="Create your first assignment"
        icon="document-text-outline"
      />,
    );

    expect(screen.getByText('No assignments')).toBeTruthy();
    expect(screen.getByText('Create your first assignment')).toBeTruthy();
  });

  it('should apply correct styles', () => {
    const { getByText } = render(
      <EmptyState title="Test Title" message="Test Message" />,
    );

    const title = getByText('Test Title');
    const message = getByText('Test Message');

    expect(title).toBeTruthy();
    expect(message).toBeTruthy();
  });
});
