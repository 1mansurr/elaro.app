import { supabase } from '@/services/supabase';
import { Assignment } from '@/types';
import { CreateAssignmentRequest, UpdateAssignmentRequest } from '@/types/api';
import { handleApiError } from '@/services/api/errors';
import { syncManager } from '@/services/syncManager';
import { generateTempId } from '@/utils/uuid';

export const assignmentsApiMutations = {
  /**
   * Create a new assignment
   *
   * OFFLINE SUPPORT:
   * - When online: Executes server mutation immediately
   * - When offline: Generates temp ID, adds to sync queue, returns optimistic data
   */
  async create(
    request: CreateAssignmentRequest,
    isOnline: boolean,
    userId: string,
  ): Promise<Assignment> {
    try {
      // OFFLINE MODE: Generate temp ID and queue for later sync
      if (!isOnline) {
        console.log('📴 Offline: Queueing CREATE assignment action');

        const tempId = generateTempId('assignment');

        // Add to sync queue
        await syncManager.addToQueue(
          'CREATE',
          'assignment',
          {
            type: 'CREATE',
            data: request,
          },
          userId,
          { syncImmediately: false },
        );

        // Return optimistic assignment with temp ID
        const optimisticAssignment: Assignment = {
          id: tempId,
          user_id: userId,
          course_id: request.course_id,
          title: request.title,
          description: request.description || null,
          due_date: request.due_date,
          submission_method: request.submission_method || null,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
          _offline: true, // Mark as offline-created
          _tempId: tempId, // Store temp ID for reference
        } as any;

        console.log(`✅ Created optimistic assignment with temp ID: ${tempId}`);
        return optimisticAssignment;
      }

      // ONLINE MODE: Execute server mutation
      console.log('🌐 Online: Creating assignment on server');
      const { data, error } = await supabase.functions.invoke(
        'create-assignment',
        { body: request },
      );
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Update an existing assignment
   *
   * OFFLINE SUPPORT:
   * - When online: Executes server mutation immediately
   * - When offline: Adds to sync queue for later sync
   */
  async update(
    assignmentId: string,
    request: UpdateAssignmentRequest,
    isOnline: boolean,
    userId: string,
  ): Promise<Assignment> {
    try {
      // OFFLINE MODE: Queue for later sync and return optimistic data
      if (!isOnline) {
        console.log('📴 Offline: Queueing UPDATE assignment action');

        // Get cached task data
        const { getCachedTask, mergeTaskUpdates } = await import('@/utils/taskCache');
        const cachedTask = await getCachedTask(assignmentId, 'assignment');

        if (!cachedTask) {
          throw new Error(
            'Assignment not found in cache. Please sync and try again.',
          );
        }

        // Merge updates with cached data
        const optimisticTask = mergeTaskUpdates(
          cachedTask as Assignment,
          request,
        );

        // Add to sync queue
        await syncManager.addToQueue(
          'UPDATE',
          'assignment',
          {
            type: 'UPDATE',
            id: assignmentId,
            data: request,
          },
          userId,
          { syncImmediately: false },
        );

        console.log(
          `✅ Created optimistic update for assignment ${assignmentId}`,
        );
        return optimisticTask as Assignment;
      }

      // ONLINE MODE: Execute server mutation
      console.log('🌐 Online: Updating assignment on server');
      const { data, error } = await supabase.functions.invoke(
        'update-assignment',
        {
          body: {
            assignment_id: assignmentId,
            ...request,
          },
        },
      );
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
