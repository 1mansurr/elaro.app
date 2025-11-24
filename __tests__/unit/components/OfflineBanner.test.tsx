/**
 * Unit Tests for OfflineBanner Component
 *
 * Tests the offline banner display and visibility logic.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { OfflineBanner } from '@/shared/components/OfflineBanner';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Mock theme context
const mockTheme = {
  background: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  accent: '#2C5EFF',
  warning: '#FF9800',
};

const mockThemeContextValue = {
  theme: mockTheme,
  toggleTheme: jest.fn(),
  isDarkMode: false,
  isDark: false,
};

const TestWrapper = ({
  children,
  isOffline = false,
}: {
  children: React.ReactNode;
  isOffline?: boolean;
}) => {
  const mockNetworkContext = {
    isOffline,
    isConnected: !isOffline,
    networkType: isOffline ? 'none' : 'wifi',
  };

  return (
    <NetworkProvider value={mockNetworkContext}>
      <ThemeProvider value={mockThemeContextValue}>{children}</ThemeProvider>
    </NetworkProvider>
  );
};

describe('OfflineBanner', () => {
  it('should not render when device is online', () => {
    render(
      <TestWrapper isOffline={false}>
        <OfflineBanner />
      </TestWrapper>,
    );

    expect(screen.queryByText(/offline/i)).toBeNull();
  });

  it('should render when device is offline', () => {
    render(
      <TestWrapper isOffline={true}>
        <OfflineBanner />
      </TestWrapper>,
    );

    expect(screen.getByText(/offline/i)).toBeTruthy();
    expect(screen.getByText(/sync when online/i)).toBeTruthy();
  });

  it('should display correct offline message', () => {
    render(
      <TestWrapper isOffline={true}>
        <OfflineBanner />
      </TestWrapper>,
    );

    const message = screen.getByText(/You are offline/i);
    expect(message).toBeTruthy();
  });
});
