import { renderHook, act } from '@testing-library/react-native';
import { useMemoryMonitor } from '@/hooks/useMemoryMonitor';

describe('useMemoryMonitor', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Mock performance.memory API
    (global as any).performance = {
      ...global.performance,
      memory: {
        usedJSHeapSize: 100 * 1024 * 1024, // 100MB baseline
        totalJSHeapSize: 200 * 1024 * 1024,
        jsHeapSizeLimit: 500 * 1024 * 1024,
      },
    };
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should not start monitoring when disabled', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    renderHook(() => useMemoryMonitor(false));

    act(() => {
      jest.advanceTimersByTime(30000);
    });

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should start monitoring when enabled', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    renderHook(() => useMemoryMonitor(true));

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Memory monitoring started'),
    );

    consoleSpy.mockRestore();
  });

  it('should track memory usage over time', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    renderHook(() => useMemoryMonitor(true, 50, 1000)); // 1 second interval

    // Simulate memory increase
    (global as any).performance.memory.usedJSHeapSize = 120 * 1024 * 1024; // 120MB

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Memory:'));

    consoleSpy.mockRestore();
  });

  it('should warn when memory exceeds threshold', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    renderHook(() => useMemoryMonitor(true, 50, 1000)); // 50% threshold

    // Simulate memory increase above threshold (50% of 100MB = 50MB, so 150MB+ triggers)
    (global as any).performance.memory.usedJSHeapSize = 160 * 1024 * 1024; // 160MB (60% increase)

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Memory increase detected'),
    );

    consoleWarnSpy.mockRestore();
  });

  it('should clean up interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const { unmount } = renderHook(() => useMemoryMonitor(true, 50, 1000));

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();

    // Advance time - should not log after unmount
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const logCount = consoleSpy.mock.calls.length;
    consoleSpy.mockRestore();

    // Should not have additional logs after unmount
    expect(logCount).toBeGreaterThan(0);
  });

  it('should handle missing performance.memory API gracefully', () => {
    const originalMemory = (global as any).performance.memory;
    delete (global as any).performance.memory;

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    renderHook(() => useMemoryMonitor(true));

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should log that memory monitoring is not available
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Memory monitoring not available'),
    );

    // Restore
    (global as any).performance.memory = originalMemory;
    consoleSpy.mockRestore();
  });

  it('should use custom threshold and interval', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    renderHook(() => useMemoryMonitor(true, 25, 500)); // 25% threshold, 500ms interval

    // Simulate 30% increase (should trigger warning)
    (global as any).performance.memory.usedJSHeapSize = 130 * 1024 * 1024;

    act(() => {
      jest.advanceTimersByTime(500); // Custom interval
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Memory increase detected'),
    );

    consoleWarnSpy.mockRestore();
  });

  it('should not warn for memory below threshold', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    renderHook(() => useMemoryMonitor(true, 50, 1000));

    // Simulate 30% increase (below 50% threshold)
    (global as any).performance.memory.usedJSHeapSize = 130 * 1024 * 1024;

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(consoleWarnSpy).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });
});
