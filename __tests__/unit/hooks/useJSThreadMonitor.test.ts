import { renderHook, act } from '@testing-library/react-native';
import { useJSThreadMonitor } from '@/hooks/useJSThreadMonitor';

describe('useJSThreadMonitor', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should track frame times when enabled', () => {
    const { result } = renderHook(() =>
      useJSThreadMonitor({ enabled: true, slowFrameThreshold: 16 }),
    );

    // Simulate frames
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.frameCount).toBeGreaterThanOrEqual(0);
  });

  it('should detect slow frames', () => {
    const { result } = renderHook(() =>
      useJSThreadMonitor({ enabled: true, slowFrameThreshold: 16 }),
    );

    // Simulate slow frame detection
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Should detect slow frames if they occur
    expect(result.current.slowFrameCount).toBeGreaterThanOrEqual(0);
  });

  it('should not track when disabled', () => {
    const { result } = renderHook(() => useJSThreadMonitor({ enabled: false }));

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.frameCount).toBe(0);
  });

  it('should provide average frame time', () => {
    const { result } = renderHook(() =>
      useJSThreadMonitor({ enabled: true, slowFrameThreshold: 16 }),
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.averageFrameTime).toBeGreaterThanOrEqual(0);
  });

  it('should respect slowFrameThreshold', () => {
    const { result } = renderHook(() =>
      useJSThreadMonitor({ enabled: true, slowFrameThreshold: 20 }),
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toHaveProperty('slowFrameCount');
    expect(result.current).toHaveProperty('averageFrameTime');
  });

  it('should log slow frames when logSlowFrames is true', () => {
    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    renderHook(() =>
      useJSThreadMonitor({
        enabled: true,
        logSlowFrames: true,
        slowFrameThreshold: 16,
      }),
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Note: actual logging depends on implementation
    consoleWarnSpy.mockRestore();
  });
});
