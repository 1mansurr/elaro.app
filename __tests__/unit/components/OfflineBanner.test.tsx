/**
 * Unit Tests for OfflineBanner Component
 *
 * Tests the offline banner display and visibility logic.
 */

import React from 'react';
// Note: react-native is already mocked in jest-setup.ts

// Mock NetworkContext
jest.mock('@/contexts/NetworkContext', () => ({
  useNetwork: jest.fn(),
  NetworkProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock ThemeContext
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { render, screen } from '@testing-library/react-native';
import { OfflineBanner } from '@/shared/components/OfflineBanner';
import { useNetwork } from '@/contexts/NetworkContext';
import { useTheme } from '@/contexts/ThemeContext';

const mockUseNetwork = useNetwork as jest.MockedFunction<typeof useNetwork>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

const mockTheme = {
  background: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  accent: '#2C5EFF',
  warning: '#FF9800',
};

const TestWrapper = ({
  children,
  isOffline = false,
}: {
  children: React.ReactNode;
  isOffline?: boolean;
}) => {
  mockUseNetwork.mockReturnValue({
    isOffline,
    isOnline: !isOffline,
    isConnected: !isOffline,
    isInternetReachable: !isOffline,
    networkType: isOffline ? 'none' : 'wifi',
  } as any);

  mockUseTheme.mockReturnValue({
    theme: mockTheme,
    toggleTheme: jest.fn(),
    isDarkMode: false,
    isDark: false,
  } as any);

  return <>{children}</>;
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
