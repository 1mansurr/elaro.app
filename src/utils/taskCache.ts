/**
 * Task Cache Utilities
 *
 * Provides helper functions for accessing and merging cached task data
 * for offline update operations.
 */

import { cache } from '@/utils/cache';
import { Assignment, Lecture, StudySession } from '@/types';
import { QueryClient } from '@tanstack/react-query';

/**
 * Get cached task data from React Query cache or AsyncStorage
 */
export async function getCachedTask(
  taskId: string,
  taskType: 'assignment' | 'lecture' | 'study_session',
  queryClient?: QueryClient,
): Promise<Assignment | Lecture | StudySession | null> {
  // 1. Check React Query cache first (if queryClient provided)
  if (queryClient) {
    const queryKey = [
      taskType === 'assignment'
        ? 'assignments'
        : taskType === 'lecture'
          ? 'lectures'
          : 'studySessions',
    ];
    const cached = queryClient.getQueryData(queryKey);

    if (cached && Array.isArray(cached)) {
      const task = cached.find((t: any) => t.id === taskId);
      if (task) {
        console.log(`✅ Found task ${taskId} in React Query cache`);
        return task;
      }
    }
  }

  // 2. Check AsyncStorage cache
  try {
    const cacheKey = `${taskType}_${taskId}`;
    const stored = await cache.get<Assignment | Lecture | StudySession>(
      cacheKey,
    );
    if (stored) {
      console.log(`✅ Found task ${taskId} in AsyncStorage cache`);
      return stored;
    }
  } catch (error) {
    console.warn(`Failed to get task from AsyncStorage cache:`, error);
  }

  // 3. Try to get from homeScreenData cache (tasks might be there)
  try {
    const homeScreenData = await cache.get<any>('homeScreenData');
    if (homeScreenData) {
      // Check nextUpcomingTask
      if (
        homeScreenData.nextUpcomingTask &&
        homeScreenData.nextUpcomingTask.id === taskId
      ) {
        console.log(`✅ Found task ${taskId} in homeScreenData cache`);
        return homeScreenData.nextUpcomingTask;
      }

      // Check recent tasks arrays
      const recentTasks = [
        ...(homeScreenData.recentAssignments || []),
        ...(homeScreenData.recentLectures || []),
        ...(homeScreenData.recentStudySessions || []),
      ];
      const task = recentTasks.find((t: any) => t.id === taskId);
      if (task) {
        console.log(`✅ Found task ${taskId} in homeScreenData recent tasks`);
        return task;
      }
    }
  } catch (error) {
    console.warn(`Failed to get task from homeScreenData cache:`, error);
  }

  console.warn(`⚠️ Task ${taskId} not found in any cache`);
  return null;
}

/**
 * Merge task updates with cached task data
 */
export function mergeTaskUpdates(
  cachedTask: Assignment | Lecture | StudySession,
  updates: any,
): Assignment | Lecture | StudySession {
  return {
    ...cachedTask,
    ...updates,
    updated_at: new Date().toISOString(),
    _offline: true, // Mark as offline-updated
  } as any;
}

/**
 * Check if an ID is a temporary ID
 */
export function isTempId(id: string): boolean {
  return (
    id.startsWith('temp_') ||
    id.startsWith('temp-assignment') ||
    id.startsWith('temp-lecture') ||
    id.startsWith('temp-study_session')
  );
}

/**
 * Resolve a temporary ID to a real ID using syncManager
 */
export async function resolveTaskId(
  taskId: string,
  taskType: 'assignment' | 'lecture' | 'study_session',
): Promise<string> {
  // If not a temp ID, return as-is
  if (!isTempId(taskId)) {
    return taskId;
  }

  // Try to resolve from sync manager
  try {
    const { syncManager } = await import('@/services/syncManager');
    // Use the public resolveTempId method
    if (syncManager && typeof syncManager.resolveTempId === 'function') {
      const realId = syncManager.resolveTempId(taskId);
      if (realId && realId !== taskId) {
        console.log(`✅ Resolved temp ID ${taskId} to real ID ${realId}`);
        return realId;
      }
    }
  } catch (error) {
    console.warn(`Failed to resolve temp ID ${taskId}:`, error);
  }

  // Return original if not resolved yet
  return taskId;
}
