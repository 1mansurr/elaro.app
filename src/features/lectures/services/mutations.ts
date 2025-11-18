import { supabase } from '@/services/supabase';
import { Lecture } from '@/types';
import { CreateLectureRequest, UpdateLectureRequest } from '@/types/api';
import { handleApiError } from '@/services/api/errors';
import { syncManager } from '@/services/syncManager';
import { generateTempId } from '@/utils/uuid';

export const lecturesApiMutations = {
  /**
   * Create a new lecture
   *
   * OFFLINE SUPPORT:
   * - When online: Executes server mutation immediately
   * - When offline: Generates temp ID, adds to sync queue, returns optimistic data
   */
  async create(
    request: CreateLectureRequest,
    isOnline: boolean,
    userId: string,
  ): Promise<Lecture> {
    try {
      // OFFLINE MODE: Generate temp ID and queue for later sync
      if (!isOnline) {
        console.log('📴 Offline: Queueing CREATE lecture action');

        const tempId = generateTempId('lecture');

        // Add to sync queue
        await syncManager.addToQueue(
          'CREATE',
          'lecture',
          {
            type: 'CREATE',
            data: request,
          },
          userId,
          { syncImmediately: false },
        );

        // Return optimistic lecture with temp ID
        const optimisticLecture: Lecture = {
          id: tempId,
          user_id: userId,
          course_id: request.course_id,
          date_time: request.start_time,
          recurrence_rule: request.is_recurring
            ? request.recurring_pattern
            : null,
          recurrence_end_date: null,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
          _offline: true, // Mark as offline-created
          _tempId: tempId, // Store temp ID for reference
        } as any;

        console.log(`✅ Created optimistic lecture with temp ID: ${tempId}`);
        return optimisticLecture;
      }

      // ONLINE MODE: Execute server mutation
      console.log('🌐 Online: Creating lecture on server');
      const { data, error } = await supabase.functions.invoke(
        'create-lecture',
        { body: request },
      );
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Update an existing lecture
   *
   * OFFLINE SUPPORT:
   * - When online: Executes server mutation immediately
   * - When offline: Adds to sync queue for later sync
   */
  async update(
    lectureId: string,
    request: UpdateLectureRequest,
    isOnline: boolean,
    userId: string,
  ): Promise<Lecture> {
    try {
      // OFFLINE MODE: Queue for later sync and return optimistic data
      if (!isOnline) {
        console.log('📴 Offline: Queueing UPDATE lecture action');

        // Get cached task data
        const { getCachedTask, mergeTaskUpdates } = await import('@/utils/taskCache');
        const cachedTask = await getCachedTask(lectureId, 'lecture');

        if (!cachedTask) {
          throw new Error(
            'Lecture not found in cache. Please sync and try again.',
          );
        }

        // Merge updates with cached data
        const optimisticTask = mergeTaskUpdates(cachedTask as Lecture, request);

        // Add to sync queue
        await syncManager.addToQueue(
          'UPDATE',
          'lecture',
          {
            type: 'UPDATE',
            id: lectureId,
            data: request,
          },
          userId,
          { syncImmediately: false },
        );

        console.log(`✅ Created optimistic update for lecture ${lectureId}`);
        return optimisticTask as Lecture;
      }

      // ONLINE MODE: Execute server mutation
      console.log('🌐 Online: Updating lecture on server');
      const { data, error } = await supabase.functions.invoke(
        'update-lecture',
        {
          body: {
            lecture_id: lectureId,
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
