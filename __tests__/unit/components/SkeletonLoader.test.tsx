/**
 * Unit Tests for SkeletonLoader Component
 *
 * Tests skeleton loader rendering, animation, and customization.
 */

import React from 'react';
import { render } from '@testing-library/react-native';

// Mock expo-linear-gradient BEFORE importing component
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: any) => {
      return React.createElement(View, { ...props, testID: 'linear-gradient' }, children);
    },
  };
});

// Mock ThemeContext BEFORE importing component
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

// Import component AFTER mocks - try importing from index
import { SkeletonLoader } from '@/shared/components';

describe('SkeletonLoader', () => {
  it('should render with default props', () => {
    const { getByTestId } = render(<SkeletonLoader testID="skeleton" />);

    expect(getByTestId('skeleton')).toBeTruthy();
  });

  it('should render with custom width', () => {
    const { getByTestId } = render(
      <SkeletonLoader testID="skeleton" width={200} />,
    );

    expect(getByTestId('skeleton')).toBeTruthy();
  });

  it('should render with percentage width', () => {
    const { getByTestId } = render(
      <SkeletonLoader testID="skeleton" width="100%" />,
    );

    expect(getByTestId('skeleton')).toBeTruthy();
  });

  it('should render with custom height', () => {
    const { getByTestId } = render(
      <SkeletonLoader testID="skeleton" height={40} />,
    );

    expect(getByTestId('skeleton')).toBeTruthy();
  });

  it('should render with custom borderRadius', () => {
    const { getByTestId } = render(
      <SkeletonLoader testID="skeleton" borderRadius={20} />,
    );

    expect(getByTestId('skeleton')).toBeTruthy();
  });

  it('should apply custom style', () => {
    const customStyle = { marginTop: 10 };

    const { getByTestId } = render(
      <SkeletonLoader testID="skeleton" style={customStyle} />,
    );

    expect(getByTestId('skeleton')).toBeTruthy();
  });

  it('should render circle skeleton for avatar', () => {
    const { getByTestId } = render(
      <SkeletonLoader
        testID="avatar-skeleton"
        width={40}
        height={40}
        borderRadius={20}
      />,
    );

    expect(getByTestId('avatar-skeleton')).toBeTruthy();
  });
});
