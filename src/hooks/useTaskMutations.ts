import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { Task, HomeScreenData } from '@/types';
import { mixpanelService } from '@/services/mixpanel';
import { AnalyticsEvents } from '@/services/analyticsEvents';
import { TASK_EVENTS } from '@/utils/analyticsEvents';
import { Alert } from 'react-native';
import { useNetwork } from '@/contexts/NetworkContext';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { syncManager } from '@/services/syncManager';
import { cache } from '@/utils/cache';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';

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
  const { isOnline } = useNetwork();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ taskId, taskType }: CompleteTaskParams) => {
      // OFFLINE MODE: Add to queue instead of calling server
      if (!isOnline) {
        console.log(`📴 Offline: Queueing COMPLETE action for ${taskType} ${taskId}`);
        
        // Add to sync queue
        if (user?.id) {
          await syncManager.addToQueue(
            'COMPLETE',
            taskType as 'assignment' | 'lecture' | 'study_session',
            {
              type: 'COMPLETE',
              resourceId: taskId,
            },
            user.id,
            { syncImmediately: false }
          );
        }
        
        // Return immediately - optimistic update already handled by onMutate
        return { success: true, offline: true };
      }

      // ONLINE MODE: Execute server mutation
      console.log(`🌐 Online: Executing COMPLETE action for ${taskType} ${taskId}`);
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

      // Optimistically update the React Query cache
      const updatedData = queryClient.setQueryData<HomeScreenData | null>(['homeScreenData'], (old) => {
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

      // OFFLINE SUPPORT: Also persist optimistic update to AsyncStorage
      // This ensures the change persists even if the app is closed/restarted while offline
      if (updatedData) {
        await cache.setShort('homeScreenData', updatedData);
        console.log(`💾 Persisted optimistic update to AsyncStorage for task ${taskId}`);
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

      // Track error
      mixpanelService.trackEvent(TASK_EVENTS.TASK_COMPLETION_FAILED.name, {
        task_id: taskId,
        task_type: taskType,
        error: error.message,
        source: 'task_detail_sheet',
      });

      // Show error alert (only for online errors - offline actions are queued)
      if (isOnline) {
        const errorTitle = getErrorTitle(error);
        const errorMessage = mapErrorCodeToMessage(error);
        Alert.alert(errorTitle, errorMessage);
      }
    },

    // Refetch after success to ensure consistency (skip when offline)
    onSettled: () => {
      // Only invalidate when online - offline changes are in the queue
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });
      }
    },

    // On success, track the event
    onSuccess: (data, { taskId, taskType, taskTitle }) => {
      // Track successful completion (includes both online and offline modes)
      mixpanelService.trackEvent(TASK_EVENTS.TASK_COMPLETED.name, {
        task_id: taskId,
        task_type: taskType,
        task_title: taskTitle,
        completion_time: new Date().toISOString(),
        source: 'task_detail_sheet',
        offline_mode: !isOnline,
      });
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
  const { isOnline } = useNetwork();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ taskId, taskType }: DeleteTaskParams) => {
      // OFFLINE MODE: Add to queue instead of calling server
      if (!isOnline) {
        console.log(`📴 Offline: Queueing DELETE action for ${taskType} ${taskId}`);
        
        // Add to sync queue
        if (user?.id) {
          await syncManager.addToQueue(
            'DELETE',
            taskType as 'assignment' | 'lecture' | 'study_session',
            {
              type: 'DELETE',
              resourceId: taskId,
            },
            user.id,
            { syncImmediately: false }
          );
        }
        
        // Return immediately - optimistic update already handled by onMutate
        return { success: true, offline: true };
      }

      // ONLINE MODE: Execute server mutation
      console.log(`🌐 Online: Executing DELETE action for ${taskType} ${taskId}`);
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

      // Optimistically update the React Query cache by removing the task
      const updatedData = queryClient.setQueryData<HomeScreenData | null>(['homeScreenData'], (old) => {
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

      // OFFLINE SUPPORT: Also persist optimistic update to AsyncStorage
      // This ensures the change persists even if the app is closed/restarted while offline
      if (updatedData) {
        await cache.setShort('homeScreenData', updatedData);
        console.log(`💾 Persisted optimistic deletion to AsyncStorage for task ${taskId}`);
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

      // Show error alert (only for online errors - offline actions are queued)
      if (isOnline) {
        const errorTitle = getErrorTitle(error);
        const errorMessage = mapErrorCodeToMessage(error);
        Alert.alert(errorTitle, errorMessage);
      }
    },

    // Refetch after success to ensure consistency (skip when offline)
    onSettled: () => {
      // Only invalidate when online - offline changes are in the queue
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });
      }
    },

    // On success, track the event
    onSuccess: (data, { taskId, taskType, taskTitle }) => {
      // Track successful deletion (includes both online and offline modes)
      mixpanelService.trackEvent(TASK_EVENTS.TASK_DELETED.name, {
        task_id: taskId,
        task_type: taskType,
        task_title: taskTitle,
        deletion_reason: 'user_request',
        was_completed: false,
        offline_mode: !isOnline,
      });
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
  const { isOnline } = useNetwork();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ taskId, taskType }: RestoreTaskParams) => {
      // Map task type to correct parameter name
      const getParameterName = (type: string) => {
        switch (type) {
          case 'assignment': return 'assignmentId';
          case 'lecture': return 'lectureId';
          case 'study_session': return 'studySessionId';
          default: return 'id';
        }
      };

      // OFFLINE MODE: Add to queue
      if (!isOnline) {
        console.log(`📴 Offline: Queueing RESTORE action for ${taskType} ${taskId}`);
        
        if (user?.id) {
          await syncManager.addToQueue(
            'RESTORE',
            taskType as 'assignment' | 'lecture' | 'study_session',
            {
              type: 'RESTORE',
              resourceId: taskId,
            },
            user.id,
            { syncImmediately: false }
          );
        }
        
        return { success: true, offline: true };
      }

      // ONLINE MODE: Execute server mutation
      console.log(`🌐 Online: Executing RESTORE action for ${taskType} ${taskId}`);
      const functionName = `restore-${taskType.replace('_', '-')}`;
      const parameterName = getParameterName(taskType);
      
      const { error } = await supabase.functions.invoke(functionName, {
        body: { [parameterName]: taskId },
      });

      if (error) throw error;
      return { success: true, offline: false };
    },

    // Optimistic update - invalidate queries to trigger refetch
    onMutate: async ({ taskId, taskType, taskTitle }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['homeScreenData'] });

      // Snapshot previous data
      const previousData = queryClient.getQueryData<HomeScreenData | null>(['homeScreenData']);

      // Note: We'll invalidate queries on success to refetch the restored task
      
      return { previousData };
    },

    // On error, rollback
    onError: (error, variables, context) => {
      console.error('❌ Error restoring task:', error);
      
      if (context?.previousData) {
        queryClient.setQueryData(['homeScreenData'], context.previousData);
      }

      if (isOnline) {
        const errorTitle = getErrorTitle(error);
        const errorMessage = mapErrorCodeToMessage(error);
        Alert.alert(errorTitle, errorMessage);
      }
    },

    // Refetch to get latest data
    onSettled: () => {
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });
        queryClient.invalidateQueries({ queryKey: ['calendarData'] });
        queryClient.invalidateQueries({ queryKey: ['deletedItems'] });
      }
    },

    // Track restore event
    onSuccess: (data, { taskId, taskType, taskTitle }) => {
      mixpanelService.trackEvent(TASK_EVENTS.TASK_RESTORED.name, {
        task_id: taskId,
        task_type: taskType,
        task_title: taskTitle,
        restore_source: 'undo_toast',
        offline_mode: !isOnline,
      });
    },
  });
};

