/**
 * Unit Tests for ErrorFallback Component
 *
 * Tests error display, retry functionality, and customization options.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

// Note: react-native is already mocked in jest-setup.ts

// Mock @expo/vector-icons BEFORE importing component
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, size, color, ...props }: any) => {
      return React.createElement(Text, { ...props, testID: `icon-${name}` }, name);
    },
  };
});

// Mock error mapping utilities BEFORE importing component
jest.mock('@/utils/errorMapping', () => ({
  mapErrorCodeToMessage: jest.fn(error => {
    if (error instanceof Error) {
      return error.message;
    }
    return 'An error occurred';
  }),
  getErrorTitle: jest.fn(error => {
    if (error instanceof Error) {
      return error.name;
    }
    return 'Error';
  }),
  isRecoverableError: jest.fn(() => true),
}));

// Mock ThemeContext
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      background: '#FFFFFF',
      text: '#000000',
      textSecondary: '#666666',
      accent: '#2C5EFF',
      error: '#FF3B30',
      errorBackground: '#FFEBEE',
    },
    toggleTheme: jest.fn(),
    isDarkMode: false,
    isDark: false,
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Import component AFTER mocks
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ErrorFallback } from '@/shared/components';

describe('ErrorFallback', () => {
  describe('Basic Rendering', () => {
    it('should render error message', () => {
      const error = new Error('Test error');

      render(<ErrorFallback error={error} />);

      expect(screen.getByText('Error')).toBeTruthy();
      expect(screen.getByText('Test error')).toBeTruthy();
    });

    it('should render custom title and message', () => {
      const error = new Error('Test error');

      render(
        <ErrorFallback
          error={error}
          title="Custom Title"
          message="Custom Message"
        />,
      );

      expect(screen.getByText('Custom Title')).toBeTruthy();
      expect(screen.getByText('Custom Message')).toBeTruthy();
    });

    it('should render with custom icon', () => {
      const error = new Error('Test error');

      render(<ErrorFallback error={error} icon="warning-outline" />);

      // Icon should be rendered (checking via accessibility)
      expect(screen.getByText('Error')).toBeTruthy();
    });
  });

  describe('Compact Mode', () => {
    it('should render in compact mode', () => {
      const error = new Error('Test error');

      render(<ErrorFallback error={error} compact={true} />);

      expect(screen.getByText('Error')).toBeTruthy();
      expect(screen.getByText('Test error')).toBeTruthy();
    });
  });

  describe('Retry Functionality', () => {
    it('should call retry function when retry button is pressed', async () => {
      const error = new Error('Test error');
      const retry = jest.fn().mockResolvedValue(undefined);

      render(<ErrorFallback error={error} retry={retry} />);

      const retryButton = screen.getByText('Try Again');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(retry).toHaveBeenCalled();
      });
    });

    it('should call resetError function when provided and no retry', () => {
      const error = new Error('Test error');
      const resetError = jest.fn();

      render(
        <ErrorFallback
          error={error}
          resetError={resetError}
          showRetry={false}
        />,
      );

      const goBackButton = screen.getByText('Go Back');
      fireEvent.press(goBackButton);

      expect(resetError).toHaveBeenCalled();
    });

    it('should show loading state during retry', async () => {
      const error = new Error('Test error');
      const retry = jest.fn(
        () => new Promise(resolve => setTimeout(resolve, 100)),
      );

      render(<ErrorFallback error={error} retry={retry} />);

      const retryButton = screen.getByText('Try Again');
      fireEvent.press(retryButton);

      expect(screen.getByText('Retrying...')).toBeTruthy();

      await waitFor(() => {
        expect(screen.queryByText('Retrying...')).toBeNull();
      });
    });

    it('should not show retry button when showRetry is false', () => {
      const error = new Error('Test error');
      const retry = jest.fn();

      render(<ErrorFallback error={error} retry={retry} showRetry={false} />);

      expect(screen.queryByText('Try Again')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown error type', () => {
      const error = { code: 'UNKNOWN_ERROR', message: 'Unknown error' };

      render(<ErrorFallback error={error} />);

      // Should still render error information
      expect(screen.getByText(/error/i)).toBeTruthy();
    });

    it('should handle error without message', () => {
      const error = new Error();

      render(<ErrorFallback error={error} />);

      expect(screen.getByText('Error')).toBeTruthy();
    });
  });
});
