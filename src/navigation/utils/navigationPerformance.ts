/**
 * Navigation Performance Utilities
 *
 * Provides utilities for optimizing navigation performance, including
 * transition timing, back button handling, and navigation state management.
 */

import {
  NavigationState,
  CommonActions,
  NavigationContainerRef,
} from '@react-navigation/native';
import { InteractionManager } from 'react-native';
import { RootStackParamList } from '@/types/navigation';

/**
 * Optimize navigation state for performance
 */
export function optimizeNavigationState(
  state: NavigationState,
): NavigationState {
  // Limit navigation history to prevent memory issues
  const MAX_STACK_SIZE = 10;

  if (state.routes.length > MAX_STACK_SIZE) {
    // Keep only the most recent routes
    const routes = state.routes.slice(-MAX_STACK_SIZE);
    const index = Math.min(state.index || 0, routes.length - 1);

    return {
      ...state,
      routes,
      index,
    };
  }

  return state;
}

/**
 * Debounce navigation action
 */
export function debounceNavigation(
  action: () => void,
  delay: number = 300,
): () => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      action();
    }, delay);
  };
}

/**
 * Batch navigation actions for better performance
 */
export async function batchNavigationActions(
  actions: (() => void)[],
): Promise<void> {
  // Wait for interactions to complete
  await InteractionManager.runAfterInteractions(() => {
    actions.forEach(action => {
      try {
        action();
      } catch (error) {
        console.error('Navigation action failed:', error);
      }
    });
  });
}

/**
 * Safe navigation reset
 */
export function createSafeResetAction<K extends keyof RootStackParamList>(
  routeName: K,
  params?: RootStackParamList[K],
): typeof CommonActions.reset {
  return CommonActions.reset({
    index: 0,
    routes: [
      {
        name: routeName,
        params,
      },
    ],
  });
}

/**
 * Navigate after interaction completes (smoother transitions)
 */
export async function navigateAfterInteraction<
  K extends keyof RootStackParamList,
>(
  navigation: NavigationContainerRef<RootStackParamList>,
  routeName: K,
  params?: RootStackParamList[K],
): Promise<void> {
  await InteractionManager.runAfterInteractions(() => {
    try {
      navigation.navigate(routeName, params);
    } catch (error) {
      console.error('Delayed navigation failed:', error);
    }
  });
}

/**
 * Get navigation stack size
 */
export function getStackSize(state: NavigationState): number {
  let maxSize = 1;

  const countRoutes = (navState: NavigationState, depth: number = 1): void => {
    maxSize = Math.max(maxSize, depth);

    if (navState.routes) {
      navState.routes.forEach(route => {
        if (route.state) {
          countRoutes(route.state as NavigationState, depth + 1);
        }
      });
    }
  };

  countRoutes(state);
  return maxSize;
}

/**
 * Check if navigation stack is too deep
 */
export function isStackTooDeep(
  state: NavigationState,
  maxDepth: number = 10,
): boolean {
  return getStackSize(state) > maxDepth;
}

/**
 * Clear navigation stack safely
 */
export function clearNavigationStack(
  navigation: NavigationContainerRef<RootStackParamList>,
  targetRoute: keyof RootStackParamList = 'Main',
): void {
  try {
    navigation.dispatch(createSafeResetAction(targetRoute));
  } catch (error) {
    console.error('Failed to clear navigation stack:', error);
  }
}

/**
 * Navigation performance metrics
 */
export interface NavigationMetrics {
  stackSize: number;
  routeCount: number;
  currentRoute: string | null;
  isStackTooDeep: boolean;
}

/**
 * Get navigation performance metrics
 */
export function getNavigationMetrics(
  state: NavigationState,
): NavigationMetrics {
  const stackSize = getStackSize(state);
  const routeCount = state.routes?.length || 0;
  const currentRoute = state.routes?.[state.index || 0]?.name || null;

  return {
    stackSize,
    routeCount,
    currentRoute,
    isStackTooDeep: stackSize > 10,
  };
}
