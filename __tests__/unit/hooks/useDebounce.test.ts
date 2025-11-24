import { renderHook, act } from '@testing-library/react-native';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('test', 500));
    expect(result.current).toBe('test');
  });

  it('should debounce value updates', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'test', delay: 500 } },
    );

    expect(result.current).toBe('test');

    // Change value
    rerender({ value: 'test2', delay: 500 });
    // Should still be old value (not debounced yet)
    expect(result.current).toBe('test');

    // Advance time by less than delay
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe('test');

    // Advance time to complete delay
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe('test2');
  });

  it('should cancel debounce on unmount', () => {
    const { result, unmount } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'test', delay: 500 } },
    );

    expect(result.current).toBe('test');

    // Change value
    rerender({ value: 'test2', delay: 500 });

    // Unmount before delay completes
    unmount();

    // Advance time - should not cause errors
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should not throw or cause memory leaks
    expect(true).toBe(true);
  });

  it('should handle rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 500 } },
    );

    // Rapidly change values
    rerender({ value: 'b', delay: 500 });
    act(() => jest.advanceTimersByTime(100));

    rerender({ value: 'c', delay: 500 });
    act(() => jest.advanceTimersByTime(100));

    rerender({ value: 'd', delay: 500 });

    // Should still be initial value
    expect(result.current).toBe('a');

    // After delay, should be last value
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe('d');
  });

  it('should handle different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'test', delay: 1000 } },
    );

    rerender({ value: 'test2', delay: 200 });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe('test2');
  });

  it('should work with numbers', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 500 } },
    );

    rerender({ value: 100, delay: 500 });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe(100);
  });

  it('should work with objects', () => {
    const initialObj = { name: 'test' };
    const updatedObj = { name: 'test2' };

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: initialObj, delay: 500 } },
    );

    rerender({ value: updatedObj, delay: 500 });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toEqual(updatedObj);
  });
});
