import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import {
  useExpensiveMemo,
  useStableCallback,
  useExpensiveCalculation,
  useStableObject,
  useStableArray,
  useDebouncedMemo,
  useCustomMemo,
} from '@/hooks/useMemoization';

describe('useMemoization', () => {
  describe('useExpensiveMemo', () => {
    it('should memoize expensive computations', () => {
      const expensiveFn = jest.fn(() => ({ computed: 'value' }));

      const { result, rerender } = renderHook(
        ({ deps }) => useExpensiveMemo(expensiveFn, deps),
        { initialProps: { deps: [1, 2] } },
      );

      expect(expensiveFn).toHaveBeenCalledTimes(1);
      expect(result.current).toEqual({ computed: 'value' });

      // Re-render with same deps - should not recompute
      rerender({ deps: [1, 2] });
      expect(expensiveFn).toHaveBeenCalledTimes(1);

      // Re-render with different deps - should recompute
      rerender({ deps: [1, 3] });
      expect(expensiveFn).toHaveBeenCalledTimes(2);
    });

    it('should use custom equality function when provided', () => {
      const expensiveFn = jest.fn(() => 'value');
      const customEquality = (a: React.DependencyList, b: React.DependencyList) => {
        const aSum = (a as number[]).reduce((sum, n) => sum + n, 0);
        const bSum = (b as number[]).reduce((sum, n) => sum + n, 0);
        return aSum === bSum;
      };

      const { result, rerender } = renderHook(
        ({ deps }) => useExpensiveMemo(expensiveFn, deps, customEquality),
        { initialProps: { deps: [1, 2] } },
      );

      expect(expensiveFn).toHaveBeenCalledTimes(1);

      // [1, 2] and [2, 1] have same sum - should not recompute
      rerender({ deps: [2, 1] });
      expect(expensiveFn).toHaveBeenCalledTimes(1);
      expect(result.current).toBe('value');

      // [1, 3] has different sum - should recompute
      rerender({ deps: [1, 3] });
      expect(expensiveFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('useStableCallback', () => {
    it('should return stable callback reference', () => {
      const callback = jest.fn();

      const { result, rerender } = renderHook(
        ({ deps }) => useStableCallback(callback, deps),
        { initialProps: { deps: [1] } },
      );

      const firstCallback = result.current;

      // Re-render with same deps - callback should be same reference
      rerender({ deps: [1] });
      expect(result.current).toBe(firstCallback);

      // Re-render with different deps - callback should be new reference
      rerender({ deps: [2] });
      expect(result.current).not.toBe(firstCallback);
    });

    it('should call the callback with correct arguments', () => {
      const callback = jest.fn((a: number, b: string) => a + b);

      const { result } = renderHook(
        ({ deps }) =>
          useStableCallback(
            callback as (...args: unknown[]) => unknown,
            deps,
          ),
        { initialProps: { deps: [1] } },
      );

      (result.current as (a: number, b: string) => string)(5, 'test');
      expect(callback).toHaveBeenCalledWith(5, 'test');
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('useExpensiveCalculation', () => {
    it('should memoize calculation results', () => {
      const calculation = jest.fn(() => 42);

      const { result, rerender } = renderHook(
        ({ deps }) => useExpensiveCalculation(calculation, deps),
        { initialProps: { deps: [1] } },
      );

      expect(calculation).toHaveBeenCalledTimes(1);
      expect(result.current).toBe(42);

      // Re-render with same deps - should not recompute
      rerender({ deps: [1] });
      expect(calculation).toHaveBeenCalledTimes(1);

      // Re-render with different deps - should recompute
      rerender({ deps: [2] });
      expect(calculation).toHaveBeenCalledTimes(2);
    });
  });

  describe('useStableObject', () => {
    it('should memoize object creation', () => {
      const factory = jest.fn(() => ({ key: 'value', count: 1 }));

      const { result, rerender } = renderHook(
        ({ deps }) => useStableObject(factory, deps),
        { initialProps: { deps: [1] } },
      );

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result.current).toEqual({ key: 'value', count: 1 });

      // Re-render with same deps - should not recreate
      rerender({ deps: [1] });
      expect(factory).toHaveBeenCalledTimes(1);

      // Re-render with different deps - should recreate
      rerender({ deps: [2] });
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  describe('useStableArray', () => {
    it('should memoize array creation', () => {
      const factory = jest.fn(() => [1, 2, 3]);

      const { result, rerender } = renderHook(
        ({ deps }) => useStableArray(factory, deps),
        { initialProps: { deps: [1] } },
      );

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result.current).toEqual([1, 2, 3]);

      // Re-render with same deps - should not recreate
      rerender({ deps: [1] });
      expect(factory).toHaveBeenCalledTimes(1);

      // Re-render with different deps - should recreate
      rerender({ deps: [2] });
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  describe('useDebouncedMemo', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should debounce value updates', () => {
      const factory = jest.fn(() => 'value');

      const { result, rerender } = renderHook(
        ({ deps }) => useDebouncedMemo(factory, deps, 300),
        { initialProps: { deps: [1] } },
      );

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result.current).toBe('value');

      // Change deps
      rerender({ deps: [2] });
      expect(factory).toHaveBeenCalledTimes(1); // Still old value

      // Fast forward time with act()
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  describe('useCustomMemo', () => {
    it('should use custom equality function', () => {
      const factory = jest.fn(() => 'result');
      const equalityFn = (prev: React.DependencyList, next: React.DependencyList) => {
        const prevArr = prev as number[];
        const nextArr = next as number[];
        return (
          prevArr.length === nextArr.length &&
          prevArr.every((val, idx) => val === nextArr[idx])
        );
      };

      const { result, rerender } = renderHook(
        ({ deps }) => useCustomMemo(factory, deps, equalityFn),
        { initialProps: { deps: [1, 2] } },
      );

      expect(factory).toHaveBeenCalledTimes(1);

      // Same values - should not recompute
      rerender({ deps: [1, 2] });
      expect(factory).toHaveBeenCalledTimes(1);

      // Different values - should recompute
      rerender({ deps: [1, 3] });
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });
});
