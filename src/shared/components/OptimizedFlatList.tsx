/**
 * OptimizedFlatList - Pre-configured FlatList with Performance Optimizations
 *
 * This component provides a pre-configured FlatList with optimal performance settings
 * for React Native lists. Use this instead of FlatList directly for better performance.
 *
 * @example
 * ```tsx
 * <OptimizedFlatList
 *   data={items}
 *   renderItem={({ item }) => <ItemComponent item={item} />}
 *   keyExtractor={(item) => item.id}
 * />
 * ```
 */

import React from 'react';
import { FlatList, FlatListProps, ListRenderItem } from 'react-native';

interface OptimizedFlatListProps<T> extends Omit<
  FlatListProps<T>,
  'renderItem'
> {
  /**
   * Render function for list items
   * Prefer passing a memoized component
   */
  renderItem: ListRenderItem<T>;

  /**
   * Function to get item layout for fixed-height items
   * Providing this significantly improves performance for fixed-height lists
   */
  getItemLayout?: (
    data: ArrayLike<T> | null | undefined,
    index: number,
  ) => { length: number; offset: number; index: number };

  /**
   * Estimated item size (in pixels)
   * Used for initial layout estimation if getItemLayout is not provided
   */
  estimatedItemSize?: number;
}

/**
 * Pre-configured FlatList with performance optimizations
 *
 * Performance Features:
 * - removeClippedSubviews: Removes off-screen views from native view hierarchy
 * - maxToRenderPerBatch: Controls batch size for rendering
 * - windowSize: Controls viewport size multiplier
 * - updateCellsBatchingPeriod: Batch update timing
 * - initialNumToRender: Initial render count
 */
export function OptimizedFlatList<T>({
  renderItem,
  getItemLayout,
  estimatedItemSize = 80,
  ...props
}: OptimizedFlatListProps<T>) {
  // Performance optimization props
  const performanceProps = {
    // Remove off-screen views from native view hierarchy (better memory)
    removeClippedSubviews: true,

    // Render 10 items per batch (balanced performance vs smoothness)
    maxToRenderPerBatch: 10,

    // Viewport is 5x visible area (good balance)
    windowSize: 5,

    // Batch updates every 50ms (smooth scrolling)
    updateCellsBatchingPeriod: 50,

    // Initial render count (first screen worth of items)
    initialNumToRender: 10,

    // Legacy prop for older React Native versions
    legacyImplementation: false,
  };

  // If getItemLayout is provided, use it
  // Otherwise, estimate based on estimatedItemSize
  const itemLayout =
    getItemLayout ||
    (estimatedItemSize
      ? (data: ArrayLike<T> | null | undefined, index: number) => ({
          length: estimatedItemSize,
          offset: estimatedItemSize * index,
          index,
        })
      : undefined);

  return (
    <FlatList<T>
      {...props}
      {...performanceProps}
      renderItem={renderItem}
      getItemLayout={itemLayout}
    />
  );
}

/**
 * Helper to create getItemLayout for fixed-height items
 *
 * @example
 * ```tsx
 * const getItemLayout = createFixedHeightLayout(100); // 100px height
 *
 * <OptimizedFlatList
 *   getItemLayout={getItemLayout}
 *   ...
 * />
 * ```
 */
export function createFixedHeightLayout<T>(itemHeight: number) {
  return (data: ArrayLike<T> | null | undefined, index: number) => ({
    length: itemHeight,
    offset: itemHeight * index,
    index,
  });
}

/**
 * Helper to create getItemLayout for variable-height items with separator
 *
 * @example
 * ```tsx
 * const getItemLayout = createVariableHeightLayout(
 *   (item) => item.height || 80, // Item height getter
 *   8 // Separator height
 * );
 * ```
 */
export function createVariableHeightLayout<T>(
  getItemHeight: (item: T, index: number) => number,
  separatorHeight: number = 0,
) {
  return (data: ArrayLike<T> | null | undefined, index: number) => {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getItemHeight(data?.[i], i) + separatorHeight;
    }
    return {
      length: getItemHeight(data?.[index], index),
      offset,
      index,
    };
  };
}
