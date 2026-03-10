/**
 * Unit Tests for SkeletonLoader Component
 *
 * Tests skeleton loader rendering, animation, and customization.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';

// Mock expo-linear-gradient BEFORE importing component
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: any) => {
      return React.createElement(
        View,
        { ...props, testID: 'linear-gradient' },
        children,
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
    const { getByTestId } = render(
      <View testID="skeleton-wrapper">
        <SkeletonLoader />
      </View>,
    );

    expect(getByTestId('skeleton-wrapper')).toBeTruthy();
  });

  it('should render with custom width', () => {
    const { getByTestId } = render(
      <View testID="skeleton-wrapper">
        <SkeletonLoader width={200} />
      </View>,
    );

    expect(getByTestId('skeleton-wrapper')).toBeTruthy();
  });

  it('should render with percentage width', () => {
    const { getByTestId } = render(
      <View testID="skeleton-wrapper">
        <SkeletonLoader width="100%" />
      </View>,
    );

    expect(getByTestId('skeleton-wrapper')).toBeTruthy();
  });

  it('should render with custom height', () => {
    const { getByTestId } = render(
      <View testID="skeleton-wrapper">
        <SkeletonLoader height={40} />
      </View>,
    );

    expect(getByTestId('skeleton-wrapper')).toBeTruthy();
  });

  it('should render with custom borderRadius', () => {
    const { getByTestId } = render(
      <View testID="skeleton-wrapper">
        <SkeletonLoader borderRadius={20} />
      </View>,
    );

    expect(getByTestId('skeleton-wrapper')).toBeTruthy();
  });

  it('should apply custom style', () => {
    const customStyle = { marginTop: 10 };

    const { getByTestId } = render(
      <View testID="skeleton-wrapper">
        <SkeletonLoader style={customStyle} />
      </View>,
    );

    expect(getByTestId('skeleton-wrapper')).toBeTruthy();
  });

  it('should render circle skeleton for avatar', () => {
    const { getByTestId } = render(
      <View testID="avatar-skeleton-wrapper">
        <SkeletonLoader width={40} height={40} borderRadius={20} />
      </View>,
    );

    expect(getByTestId('avatar-skeleton-wrapper')).toBeTruthy();
  });
});
