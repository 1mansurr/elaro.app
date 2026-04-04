import { useMutation, useQueryClient } from '@tanstack/react-query';
import { HomeScreenData } from '@/types';
import { Alert } from 'react-native';
import { cache } from '@/utils/cache';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import { completeTask, deleteTask, restoreTask } from '@/services/database';

interface CompleteTaskParams {
  taskId: string;
  taskType: 'lecture' | 'study_session' | 'assignment';
  taskTitle: string;
  skipNotificationCancellation?: boolean; // For recurring lectures - don't cancel future reminders
}

interface DeleteTaskParams {
  taskId: string;
  taskType: 'lecture' | 'study_session' | 'assignment';
  taskTitle: string;
}

interface RestoreTaskParams {
  taskId: string;
  taskType: 'lecture' | 'study_session' | 'assignment';
  taskTitle: string;
}

/**
 * Hook for completing a task with optimistic updates.
 * The UI updates instantly before the server confirms the change.
 *
 * OFFLINE SUPPORT:
 * - When online: Executes server mutation immediately
 * - When offline: Adds action to sync queue and updates local cache
 */
export const useCompleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId }: CompleteTaskParams) => {
      await completeTask(taskId);
      return { success: true };
    },

    // Optimistic update - runs before the mutation
    onMutate: async ({ taskId, taskType, taskTitle }: CompleteTaskParams) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['homeScreenData'] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<HomeScreenData | null>([
        'homeScreenData',
      ]);

      // Optimistically update the React Query cache
      const updatedData = queryClient.setQueryData<HomeScreenData | null>(
        ['homeScreenData'],
        old => {
          if (!old) return old;

          // Mark the task as completed in todaysTasks and upcomingTasks
          return {
            ...old,
            todaysTasks: old.todaysTasks.map(t =>
              t.id === taskId ? { ...t, status: 'completed' as const } : t,
            ),
            upcomingTasks: old.upcomingTasks.map(t =>
              t.id === taskId ? { ...t, status: 'completed' as const } : t,
            ),
          };
        },
      );

      // OFFLINE SUPPORT: Also persist optimistic update to AsyncStorage
      // This ensures the change persists even if the app is closed/restarted while offline
      if (updatedData) {
        await cache.setShort('homeScreenData', updatedData);
        console.log(
          `💾 Persisted optimistic update to AsyncStorage for task ${taskId}`,
        );
      }

      // Return context with the previous data for rollback
      return { previousData };
    },

    // Rollback on error
    onError: async (error, { taskId, taskType, taskTitle }, context) => {
      // Rollback to previous data in both caches
      if (context?.previousData) {
        queryClient.setQueryData(['homeScreenData'], context.previousData);
        await cache.setShort('homeScreenData', context.previousData);
        console.log(`↩️ Rolled back optimistic update for task ${taskId}`);
      }

      const errorTitle = getErrorTitle(error);
      const errorMessage = mapErrorCodeToMessage(error);
      Alert.alert(errorTitle, errorMessage);
    },

    onSettled: async () => {
      const { invalidateTaskQueries } =
        await import('@/utils/queryInvalidation');
      await invalidateTaskQueries(queryClient);
    },

    // On success, cancel notifications
    onSuccess: async (
      data,
      { taskId, taskType, taskTitle, skipNotificationCancellation },
    ) => {
      // Cancel local notifications for this task (skip for recurring lectures)
      if (!skipNotificationCancellation) {
        try {
          const { notificationService } =
            await import('@/services/notifications');
          await notificationService.cancelItemReminders(taskId);
        } catch (error) {
          console.error(
            'Error cancelling notifications for completed task:',
            error,
          );
          // Don't block completion if notification cancellation fails
        }
      } else {
        console.log(
          `⏭️ Skipping notification cancellation for recurring lecture ${taskId}`,
        );
      }
    },
  });
};

/**
 * Hook for deleting a task with optimistic updates.
 * The task disappears instantly before the server confirms deletion.
 *
 * OFFLINE SUPPORT:
 * - When online: Executes server mutation immediately
 * - When offline: Adds action to sync queue and updates local cache
 */
export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId }: DeleteTaskParams) => {
      await deleteTask(taskId);
    },

    // Optimistic update - runs before the mutation
    onMutate: async ({ taskId, taskType, taskTitle }: DeleteTaskParams) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['homeScreenData'] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<HomeScreenData | null>([
        'homeScreenData',
      ]);

      // Optimistically update the React Query cache by removing the task
      const updatedData = queryClient.setQueryData<HomeScreenData | null>(
        ['homeScreenData'],
        old => {
          if (!old) return old;

          // Remove the deleted task from todaysTasks and upcomingTasks
          return {
            ...old,
            todaysTasks: old.todaysTasks.filter(t => t.id !== taskId),
            upcomingTasks: old.upcomingTasks.filter(t => t.id !== taskId),
          };
        },
      );

      // OFFLINE SUPPORT: Also persist optimistic update to AsyncStorage
      // This ensures the change persists even if the app is closed/restarted while offline
      if (updatedData) {
        await cache.setShort('homeScreenData', updatedData);
        console.log(
          `💾 Persisted optimistic deletion to AsyncStorage for task ${taskId}`,
        );
      }

      // Return context with the previous data for rollback
      return { previousData };
    },

    // Rollback on error
    onError: async (error, { taskId, taskType, taskTitle }, context) => {
      // Rollback to previous data in both caches
      if (context?.previousData) {
        queryClient.setQueryData(['homeScreenData'], context.previousData);
        await cache.setShort('homeScreenData', context.previousData);
        console.log(`↩️ Rolled back optimistic deletion for task ${taskId}`);
      }

      const errorTitle = getErrorTitle(error);
      const errorMessage = mapErrorCodeToMessage(error);
      Alert.alert(errorTitle, errorMessage);
    },

    onSettled: async () => {
      const { invalidateTaskQueries } =
        await import('@/utils/queryInvalidation');
      await invalidateTaskQueries(queryClient);
    },

    // On success, cancel notifications
    onSuccess: async (data, { taskId, taskType, taskTitle }) => {
      // Cancel local notifications for this task
      try {
        const { notificationService } =
          await import('@/services/notifications');
        await notificationService.cancelItemReminders(taskId);
      } catch (error) {
        console.error(
          'Error cancelling notifications for deleted task:',
          error,
        );
        // Don't block deletion if notification cancellation fails
      }
    },
  });
};

/**
 * Hook for restoring a deleted task (undo delete).
 * Used when user clicks "Undo" in the toast notification.
 *
 * OFFLINE SUPPORT:
 * - When online: Calls restore API immediately
 * - When offline: Adds restore action to sync queue
 */
export const useRestoreTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId }: RestoreTaskParams) => {
      await restoreTask(taskId);
      return { success: true };
    },

    onMutate: async ({ taskId }) => {
      await queryClient.cancelQueries({ queryKey: ['homeScreenData'] });
      const previousData = queryClient.getQueryData<HomeScreenData | null>([
        'homeScreenData',
      ]);
      return { previousData };
    },

    onError: (error, variables, context) => {
      console.error('❌ Error restoring task:', error);
      if (context?.previousData) {
        queryClient.setQueryData(['homeScreenData'], context.previousData);
      }
      const errorTitle = getErrorTitle(error);
      const errorMessage = mapErrorCodeToMessage(error);
      Alert.alert(errorTitle, errorMessage);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });
      queryClient.invalidateQueries({ queryKey: ['calendarData'] });
      queryClient.invalidateQueries({ queryKey: ['calendarMonthData'] });
      queryClient.invalidateQueries({ queryKey: ['deletedItems'] });
    },
  });
};
