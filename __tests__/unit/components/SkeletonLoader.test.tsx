/**
 * Unit Tests for SkeletonLoader Component
 *
 * Tests skeleton loader rendering, animation, and customization.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { SkeletonLoader } from '@/shared/components/SkeletonLoader';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Mock theme context
const mockTheme = {
  background: '#FFFFFF',
  text: '#000000',
  accent: '#2C5EFF',
};

const mockThemeContextValue = {
  theme: mockTheme,
  toggleTheme: jest.fn(),
  isDarkMode: false,
  isDark: false,
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider value={mockThemeContextValue}>{children}</ThemeProvider>
);

describe('SkeletonLoader', () => {
  it('should render with default props', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <SkeletonLoader testID="skeleton" />
      </TestWrapper>,
    );

    expect(getByTestId('skeleton')).toBeTruthy();
  });

  it('should render with custom width', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <SkeletonLoader testID="skeleton" width={200} />
      </TestWrapper>,
    );

    expect(getByTestId('skeleton')).toBeTruthy();
  });

  it('should render with percentage width', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <SkeletonLoader testID="skeleton" width="100%" />
      </TestWrapper>,
    );

    expect(getByTestId('skeleton')).toBeTruthy();
  });

  it('should render with custom height', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <SkeletonLoader testID="skeleton" height={40} />
      </TestWrapper>,
    );

    expect(getByTestId('skeleton')).toBeTruthy();
  });

  it('should render with custom borderRadius', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <SkeletonLoader testID="skeleton" borderRadius={20} />
      </TestWrapper>,
    );

    expect(getByTestId('skeleton')).toBeTruthy();
  });

  it('should apply custom style', () => {
    const customStyle = { marginTop: 10 };

    const { getByTestId } = render(
      <TestWrapper>
        <SkeletonLoader testID="skeleton" style={customStyle} />
      </TestWrapper>,
    );

    expect(getByTestId('skeleton')).toBeTruthy();
  });

  it('should render circle skeleton for avatar', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <SkeletonLoader
          testID="avatar-skeleton"
          width={40}
          height={40}
          borderRadius={20}
        />
      </TestWrapper>,
    );

    expect(getByTestId('avatar-skeleton')).toBeTruthy();
  });
});
