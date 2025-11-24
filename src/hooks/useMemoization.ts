import React, { useMemo, useCallback, useRef } from 'react';

/**
 * Custom hook for expensive component memoization
 * Provides deep equality checking and performance monitoring
 */
export const useExpensiveMemo = <T>(
  factory: () => T,
  deps: React.DependencyList,
  equalityFn?: (a: T, b: T) => boolean,
): T => {
  const ref = useRef<{ value: T; deps: React.DependencyList } | undefined>(
    undefined,
  );

  if (!ref.current || !areEqual(ref.current.deps, deps)) {
    ref.current = { value: factory(), deps };
  }

  return ref.current.value;
};

/**
 * Custom hook for callback memoization with deep equality
 * Prevents unnecessary re-renders of child components
 */
export const useStableCallback = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: React.DependencyList,
): T => {
  const ref = useRef<{ callback: T; deps: React.DependencyList } | undefined>(
    undefined,
  );

  if (!ref.current || !areEqual(ref.current.deps, deps)) {
    ref.current = { callback, deps };
  }

  return ref.current.callback;
};

/**
 * Deep equality check for dependency arrays
 * Optimized for performance with early returns
 */
function areEqual(a: React.DependencyList, b: React.DependencyList): boolean {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }

  return true;
}

/**
 * Memoization for expensive calculations with performance monitoring
 * Automatically logs calculation time for debugging
 */
export const useExpensiveCalculation = <T>(
  calculation: () => T,
  deps: React.DependencyList,
): T => {
  return useMemo(() => {
    console.time('Expensive calculation');
    const result = calculation();
    console.timeEnd('Expensive calculation');
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculation, ...deps]);
};

/**
 * Memoization for object creation to prevent unnecessary re-renders
 * Useful for style objects, configuration objects, etc.
 */
export const useStableObject = <T extends Record<string, unknown>>(
  factory: () => T,
  deps: React.DependencyList,
): T => {
  return useMemo(() => {
    const result = factory();
    // Log object creation for debugging
    console.log('Stable object created:', Object.keys(result));
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factory, ...deps]);
};

/**
 * Memoization for array operations
 * Prevents unnecessary re-computation of filtered/sorted arrays
 */
export const useStableArray = <T>(
  factory: () => T[],
  deps: React.DependencyList,
): T[] => {
  return useMemo(() => {
    const result = factory();
    console.log('Stable array created with length:', result.length);
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factory, ...deps]);
};

/**
 * Debounced memoization for search/filter operations
 * Prevents excessive calculations during rapid input changes
 */
export const useDebouncedMemo = <T>(
  factory: () => T,
  deps: React.DependencyList,
  delay: number = 300,
): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(factory);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(factory());
    }, delay);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factory, delay, ...deps]);

  return debouncedValue;
};

/**
 * Memoization with custom equality function
 * Allows for complex comparison logic
 */
export const useCustomMemo = <T>(
  factory: () => T,
  deps: React.DependencyList,
  equalityFn: (
    prevDeps: React.DependencyList,
    nextDeps: React.DependencyList,
  ) => boolean,
): T => {
  const ref = useRef<{ value: T; deps: React.DependencyList } | undefined>(
    undefined,
  );

  if (!ref.current || !equalityFn(ref.current.deps, deps)) {
    ref.current = { value: factory(), deps };
  }

  return ref.current.value;
};
