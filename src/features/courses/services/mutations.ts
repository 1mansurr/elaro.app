import { supabase } from '@/services/supabase';
import { handleApiError } from '@/services/api/errors';
import { Course, CreateCourseRequest } from '@/types';
import { syncManager } from '@/services/syncManager';
import { generateTempId } from '@/utils/uuid';
import { invokeEdgeFunctionWithAuth } from '@/utils/invokeEdgeFunction';

export const coursesApiMutations = {
  /**
   * Update an existing course
   *
   * OFFLINE SUPPORT:
   * - When online: Executes server mutation immediately
   * - When offline: Adds to sync queue
   */
  async update(
    courseId: string,
    updates: Partial<CreateCourseRequest>,
    isOnline: boolean,
    userId: string,
  ): Promise<Course> {
    try {
      // OFFLINE MODE: Queue for later sync
      if (!isOnline) {
        console.log(
          `📴 Offline: Queueing UPDATE course action for ${courseId}`,
        );

        await syncManager.addToQueue(
          'UPDATE',
          'course',
          {
            type: 'UPDATE',
            resourceId: courseId,
            updates,
          },
          userId,
          { syncImmediately: false },
        );

        // Return optimistic result
        return { id: courseId, ...updates } as Course;
      }

      // ONLINE MODE: Execute server mutation
      console.log(`🌐 Online: Updating course ${courseId} on server`);
      const { data, error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', courseId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Delete a course (soft delete)
   *
   * OFFLINE SUPPORT:
   * - When online: Executes server mutation immediately
   * - When offline: Adds to sync queue
   */
  async delete(
    courseId: string,
    isOnline: boolean,
    userId: string,
  ): Promise<void> {
    try {
      // OFFLINE MODE: Queue for later sync
      if (!isOnline) {
        console.log(
          `📴 Offline: Queueing DELETE course action for ${courseId}`,
        );

        await syncManager.addToQueue(
          'DELETE',
          'course',
          {
            type: 'DELETE',
            resourceId: courseId,
          },
          userId,
          { syncImmediately: false },
        );

        return;
      }

      // ONLINE MODE: Execute server mutation
      console.log(`🌐 Online: Deleting course ${courseId} on server`);
      const { error } = await supabase
        .from('courses')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', courseId);

      if (error) throw error;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Restore a soft-deleted course
   *
   * OFFLINE SUPPORT:
   * - When online: Executes server mutation immediately
   * - When offline: Adds to sync queue
   */
  async restore(
    courseId: string,
    isOnline: boolean,
    userId: string,
  ): Promise<Course> {
    try {
      // OFFLINE MODE: Queue for later sync
      if (!isOnline) {
        console.log(
          `📴 Offline: Queueing RESTORE course action for ${courseId}`,
        );

        await syncManager.addToQueue(
          'RESTORE',
          'course',
          {
            type: 'RESTORE',
            resourceId: courseId,
          },
          userId,
          { syncImmediately: false },
        );

        // Return optimistic result (partial course object)
        return { id: courseId, deleted_at: null } as any;
      }

      // ONLINE MODE: Execute server mutation
      console.log(`🌐 Online: Restoring course ${courseId} on server`);
      const { data, error } = await supabase
        .from('courses')
        .update({ deleted_at: null })
        .eq('id', courseId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
