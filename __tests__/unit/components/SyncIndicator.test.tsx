/**
 * Unit Tests for SyncIndicator Component
 *
 * Tests sync indicator display and state management.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react-native';
// Note: react-native is already mocked in jest-setup.ts

// Mock syncManager
jest.mock('@/services/syncManager', () => ({
  syncManager: {
    getQueueStats: jest.fn(),
    getIsSyncing: jest.fn(),
    subscribe: jest.fn(),
  },
}));

// Mock ThemeContext
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

// Import component AFTER mocks
import { SyncIndicator } from '@/shared/components/SyncIndicator';
import { syncManager } from '@/services/syncManager';

describe('SyncIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should not render when there are no pending items and not syncing', () => {
    (syncManager.getQueueStats as jest.Mock).mockReturnValue({
      pending: 0,
      failed: 0,
      completed: 0,
    });
    (syncManager.getIsSyncing as jest.Mock).mockReturnValue(false);
    (syncManager.subscribe as jest.Mock).mockReturnValue(jest.fn());

    render(<SyncIndicator />);

    expect(screen.queryByText(/syncing/i)).toBeNull();
    expect(screen.queryByText(/waiting/i)).toBeNull();
  });

  it('should render sync message when syncing', () => {
    (syncManager.getQueueStats as jest.Mock).mockReturnValue({
      pending: 3,
      failed: 0,
      completed: 0,
    });
    (syncManager.getIsSyncing as jest.Mock).mockReturnValue(true);
    (syncManager.subscribe as jest.Mock).mockImplementation(callback => {
      // Call callback immediately to simulate subscription
      callback({ pending: 3, failed: 0, completed: 0 });
      return jest.fn(); // Return unsubscribe function
    });

    render(<SyncIndicator />);

    // Advance timers to trigger interval
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByText(/Syncing/i)).toBeTruthy();
    expect(screen.getByText(/3 items/i)).toBeTruthy();
  });

  it('should render waiting message when items are pending but not syncing', () => {
    (syncManager.getQueueStats as jest.Mock).mockReturnValue({
      pending: 2,
      failed: 0,
      completed: 0,
    });
    (syncManager.getIsSyncing as jest.Mock).mockReturnValue(false);
    (syncManager.subscribe as jest.Mock).mockImplementation(callback => {
      callback({ pending: 2, failed: 0, completed: 0 });
      return jest.fn();
    });

    render(<SyncIndicator />);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByText(/waiting to sync/i)).toBeTruthy();
    expect(screen.getByText(/2 items/i)).toBeTruthy();
  });

  it('should display failed count when there are failed items', () => {
    (syncManager.getQueueStats as jest.Mock).mockReturnValue({
      pending: 1,
      failed: 2,
      completed: 0,
    });
    (syncManager.getIsSyncing as jest.Mock).mockReturnValue(false);
    (syncManager.subscribe as jest.Mock).mockImplementation(callback => {
      callback({ pending: 1, failed: 2, completed: 0 });
      return jest.fn();
    });

    render(<SyncIndicator />);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByText(/2 failed/i)).toBeTruthy();
  });

  it('should use singular form for single item', () => {
    (syncManager.getQueueStats as jest.Mock).mockReturnValue({
      pending: 1,
      failed: 0,
      completed: 0,
    });
    (syncManager.getIsSyncing as jest.Mock).mockReturnValue(true);
    (syncManager.subscribe as jest.Mock).mockImplementation(callback => {
      callback({ pending: 1, failed: 0, completed: 0 });
      return jest.fn();
    });

    render(<SyncIndicator />);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByText(/1 item/i)).toBeTruthy();
    expect(screen.queryByText(/1 items/i)).toBeNull();
  });
});
