import { useState, useEffect } from 'react';
import { debounce } from '@/utils/debounce';

/**
 * Hook that debounces a value.
 * Returns the debounced value that only updates after the specified delay.
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 500ms)
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedSearchQuery = useDebounce(searchQuery, 500);
 *
 * // Use debouncedSearchQuery in your API calls
 * useEffect(() => {
 *   fetchData(debouncedSearchQuery);
 * }, [debouncedSearchQuery]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Create debounced function
    const { debounced, cancel } = debounce(() => {
      setDebouncedValue(value);
    }, delay);

    // Call the debounced function
    debounced();

    // Cleanup: cancel any pending debounce on unmount or value change
    return () => {
      cancel();
    };
  }, [value, delay]);

  return debouncedValue;
}
