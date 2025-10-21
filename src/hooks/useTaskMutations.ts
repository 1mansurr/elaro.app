import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { Task, HomeScreenData } from '@/types';
import { mixpanelService } from '@/services/mixpanel';
import { AnalyticsEvents } from '@/services/analyticsEvents';
import { TASK_EVENTS } from '@/utils/analyticsEvents';
import { Alert } from 'react-native';

interface CompleteTaskParams {
  taskId: string;
  taskType: 'lecture' | 'study_session' | 'assignment';
  taskTitle: string;
}

interface DeleteTaskParams {
  taskId: string;
  taskType: 'lecture' | 'study_session' | 'assignment';
  taskTitle: string;
}

/**
 * Hook for completing a task with optimistic updates.
 * The UI updates instantly before the server confirms the change.
 */
export const useCompleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, taskType }: CompleteTaskParams) => {
      const functionName = `update-${taskType}`;
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          [`${taskType}Id`]: taskId,
          updates: { status: 'completed' },
        },
      });

      if (error) throw error;
      return data;
    },
    
    // Optimistic update - runs before the mutation
    onMutate: async ({ taskId, taskType, taskTitle }: CompleteTaskParams) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['homeScreenData'] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<HomeScreenData | null>(['homeScreenData']);

      // Optimistically update the cache
      queryClient.setQueryData<HomeScreenData | null>(['homeScreenData'], (old) => {
        if (!old) return old;

        // Update the next upcoming task if it's the one being completed
        if (old.nextUpcomingTask && old.nextUpcomingTask.id === taskId) {
          return {
            ...old,
            nextUpcomingTask: {
              ...old.nextUpcomingTask,
              status: 'completed' as const,
            },
          };
        }

        return old;
      });

      // Return context with the previous data for rollback
      return { previousData };
    },

    // Rollback on error
    onError: (error, { taskId, taskType, taskTitle }, context) => {
      // Rollback to previous data
      if (context?.previousData) {
        queryClient.setQueryData(['homeScreenData'], context.previousData);
      }

      // Track error
      mixpanelService.trackEvent(TASK_EVENTS.TASK_COMPLETION_FAILED, {
        task_id: taskId,
        task_type: taskType,
        error: error.message,
        source: 'task_detail_sheet',
      });

      // Show error alert
      Alert.alert('Error', 'Could not mark task as complete. Please try again.');
    },

    // Always refetch after error or success to ensure consistency
    onSettled: ({ taskId, taskType, taskTitle }) => {
      // Invalidate to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });
    },

    // On success, track the event
    onSuccess: (data, { taskId, taskType, taskTitle }) => {
      // Track successful completion
      mixpanelService.trackEvent(TASK_EVENTS.TASK_COMPLETED, {
        task_id: taskId,
        task_type: taskType,
        task_title: taskTitle,
        completion_time: new Date().toISOString(),
        source: 'task_detail_sheet',
      });
    },
  });
};

/**
 * Hook for deleting a task with optimistic updates.
 * The task disappears instantly before the server confirms deletion.
 */
export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, taskType }: DeleteTaskParams) => {
      const functionName = `delete-${taskType}`;
      const { error } = await supabase.functions.invoke(functionName, {
        body: { [`${taskType}Id`]: taskId },
      });

      if (error) throw error;
    },

    // Optimistic update - runs before the mutation
    onMutate: async ({ taskId, taskType, taskTitle }: DeleteTaskParams) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['homeScreenData'] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<HomeScreenData | null>(['homeScreenData']);

      // Optimistically update the cache by removing the task
      queryClient.setQueryData<HomeScreenData | null>(['homeScreenData'], (old) => {
        if (!old) return old;

        // If the next upcoming task is the one being deleted, set it to null
        if (old.nextUpcomingTask && old.nextUpcomingTask.id === taskId) {
          return {
            ...old,
            nextUpcomingTask: null,
          };
        }

        return old;
      });

      // Return context with the previous data for rollback
      return { previousData };
    },

    // Rollback on error
    onError: (error, { taskId, taskType, taskTitle }, context) => {
      // Rollback to previous data
      if (context?.previousData) {
        queryClient.setQueryData(['homeScreenData'], context.previousData);
      }

      // Show error alert
      Alert.alert('Error', 'Could not delete task. Please try again.');
    },

    // Always refetch after error or success to ensure consistency
    onSettled: () => {
      // Invalidate to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });
    },

    // On success, track the event
    onSuccess: (data, { taskId, taskType, taskTitle }) => {
      // Track successful deletion
      mixpanelService.trackEvent(TASK_EVENTS.TASK_DELETED, {
        task_id: taskId,
        task_type: taskType,
        task_title: taskTitle,
        deletion_reason: 'user_request',
        was_completed: false,
      });
    },
  });
};

