import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useSmartPreloading } from '@/hooks/useSmartPreloading';
import { useAuth } from '@/contexts/AuthContext';

// Mock the auth context
jest.mock('@/contexts/AuthContext');

// Mock the bundle imports
jest.mock('@/navigation/bundles/DashboardBundle', () => ({}), {
  virtual: true,
});
jest.mock('@/navigation/bundles/AuthBundle', () => ({}), { virtual: true });
jest.mock('@/navigation/bundles/CoursesBundle', () => ({}), { virtual: true });
jest.mock('@/navigation/bundles/CalendarBundle', () => ({}), { virtual: true });

describe('useSmartPreloading', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should return preloadCalendarBundle function', () => {
    (useAuth as jest.Mock).mockReturnValue({
      session: null,
      user: null,
      loading: false,
    });

    const { result } = renderHook(() => useSmartPreloading());

    expect(result.current).toHaveProperty('preloadCalendarBundle');
    expect(typeof result.current.preloadCalendarBundle).toBe('function');
  });

  it('should not preload when auth is loading', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    (useAuth as jest.Mock).mockReturnValue({
      session: null,
      user: null,
      loading: true,
    });

    renderHook(() => useSmartPreloading());

    act(() => {
      jest.advanceTimersByTime(2000); // Advance past the 1 second delay
    });

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should preload DashboardBundle for authenticated user with completed onboarding', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    (useAuth as jest.Mock).mockReturnValue({
      session: { access_token: 'token' },
      user: { id: 'user-id', onboarding_completed: true },
      loading: false,
    });

    renderHook(() => useSmartPreloading());

    act(() => {
      jest.advanceTimersByTime(1000); // Trigger preload after delay
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('📦 Preloaded DashboardBundle');
      expect(consoleSpy).toHaveBeenCalledWith('📦 Preloaded CoursesBundle');
    });

    consoleSpy.mockRestore();
  });

  it('should preload AuthBundle for authenticated user without completed onboarding', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    (useAuth as jest.Mock).mockReturnValue({
      session: { access_token: 'token' },
      user: { id: 'user-id', onboarding_completed: false },
      loading: false,
    });

    renderHook(() => useSmartPreloading());

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('📦 Preloaded AuthBundle');
      expect(consoleSpy).toHaveBeenCalledWith('📦 Preloaded CoursesBundle');
    });

    consoleSpy.mockRestore();
  });

  it('should preload DashboardBundle for guest user', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    (useAuth as jest.Mock).mockReturnValue({
      session: null,
      user: null,
      loading: false,
    });

    renderHook(() => useSmartPreloading());

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '📦 Preloaded DashboardBundle for guest',
      );
    });

    consoleSpy.mockRestore();
  });

  it('should handle preload failures gracefully', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Mock a failing import
    jest.doMock(
      '@/navigation/bundles/DashboardBundle',
      () => {
        throw new Error('Failed to load bundle');
      },
      { virtual: true },
    );

    (useAuth as jest.Mock).mockReturnValue({
      session: null,
      user: null,
      loading: false,
    });

    renderHook(() => useSmartPreloading());

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to preload bundles:',
        expect.any(Error),
      );
    });

    consoleWarnSpy.mockRestore();
  });

  it('should preload CalendarBundle when preloadCalendarBundle is called', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    (useAuth as jest.Mock).mockReturnValue({
      session: null,
      user: null,
      loading: false,
    });

    const { result } = renderHook(() => useSmartPreloading());

    await result.current.preloadCalendarBundle();

    expect(consoleSpy).toHaveBeenCalledWith('📦 Preloaded CalendarBundle');
    consoleSpy.mockRestore();
  });

  it('should handle CalendarBundle preload failure gracefully', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Mock a failing CalendarBundle import
    jest.doMock(
      '@/navigation/bundles/CalendarBundle',
      () => {
        throw new Error('Failed to load CalendarBundle');
      },
      { virtual: true },
    );

    (useAuth as jest.Mock).mockReturnValue({
      session: null,
      user: null,
      loading: false,
    });

    const { result } = renderHook(() => useSmartPreloading());

    await result.current.preloadCalendarBundle();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Failed to preload CalendarBundle:',
      expect.any(Error),
    );

    consoleWarnSpy.mockRestore();
  });

  it('should clean up timeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    (useAuth as jest.Mock).mockReturnValue({
      session: null,
      user: null,
      loading: false,
    });

    const { unmount } = renderHook(() => useSmartPreloading());

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('should re-run preload when auth state changes', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const { rerender } = renderHook(() => useSmartPreloading(), {
      initialProps: {
        authState: {
          session: null,
          user: null,
          loading: false,
        },
      },
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '📦 Preloaded DashboardBundle for guest',
      );
    });

    consoleSpy.mockClear();

    // Change auth state
    (useAuth as jest.Mock).mockReturnValue({
      session: { access_token: 'token' },
      user: { id: 'user-id', onboarding_completed: true },
      loading: false,
    });

    rerender();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('📦 Preloaded DashboardBundle');
    });

    consoleSpy.mockRestore();
  });
});
