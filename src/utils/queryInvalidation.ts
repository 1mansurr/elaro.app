/**
 * Query Invalidation Utilities
 *
 * Provides standardized query invalidation for task-related operations.
 * Ensures all affected queries are invalidated when tasks are created, updated, or deleted.
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Invalidate all queries affected by task creation/update/deletion
 *
 * @param queryClient - The React Query client instance
 * @param taskType - Optional specific task type to invalidate, or undefined to invalidate all
 */
export async function invalidateTaskQueries(
  queryClient: QueryClient,
  taskType?: 'assignment' | 'lecture' | 'study_session',
): Promise<void> {
  // Invalidate task-specific queries
  if (taskType === 'assignment') {
    await queryClient.invalidateQueries({ queryKey: ['assignments'] });
  } else if (taskType === 'lecture') {
    await queryClient.invalidateQueries({ queryKey: ['lectures'] });
  } else if (taskType === 'study_session') {
    await queryClient.invalidateQueries({ queryKey: ['studySessions'] });
  } else {
    // Invalidate all task types if not specified
    await queryClient.invalidateQueries({ queryKey: ['assignments'] });
    await queryClient.invalidateQueries({ queryKey: ['lectures'] });
    await queryClient.invalidateQueries({ queryKey: ['studySessions'] });
  }

  // Always invalidate these queries (they depend on all task types)
  await queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });
  
  // Invalidate calendar queries to ensure tasks appear immediately
  await queryClient.invalidateQueries({ queryKey: ['calendarData'] });
  await queryClient.invalidateQueries({ queryKey: ['calendarMonthData'] });
}

