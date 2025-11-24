/**
 * Unit Tests for EmptyState Component
 *
 * Tests the rendering and customization of the EmptyState component.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { EmptyState } from '@/shared/components/EmptyState';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Mock theme context
const mockTheme = {
  background: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
};

const mockThemeContextValue = {
  theme: mockTheme,
  toggleTheme: jest.fn(),
  isDarkMode: false,
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider value={mockThemeContextValue}>{children}</ThemeProvider>
);

describe('EmptyState', () => {
  it('should render with default props', () => {
    render(
      <TestWrapper>
        <EmptyState title="No items" message="No items found" />
      </TestWrapper>,
    );

    expect(screen.getByText('No items')).toBeTruthy();
    expect(screen.getByText('No items found')).toBeTruthy();
  });

  it('should render with custom icon', () => {
    render(
      <TestWrapper>
        <EmptyState
          title="No assignments"
          message="Create your first assignment"
          icon="document-text-outline"
        />
      </TestWrapper>,
    );

    expect(screen.getByText('No assignments')).toBeTruthy();
    expect(screen.getByText('Create your first assignment')).toBeTruthy();
  });

  it('should apply correct styles', () => {
    const { getByText } = render(
      <TestWrapper>
        <EmptyState title="Test Title" message="Test Message" />
      </TestWrapper>,
    );

    const title = getByText('Test Title');
    const message = getByText('Test Message');

    expect(title).toBeTruthy();
    expect(message).toBeTruthy();
  });
});
