import { supabase } from '@/services/supabase';
import { StudySession } from '@/types';
import {
  CreateStudySessionRequest,
  UpdateStudySessionRequest,
} from '@/types/api';
import { handleApiError } from '@/services/api/errors';
import { syncManager } from '@/services/syncManager';
import { generateTempId } from '@/utils/uuid';
import { invokeEdgeFunctionWithAuth } from '@/utils/invokeEdgeFunction';

export const studySessionsApiMutations = {
  /**
   * Create a new study session
   *
   * OFFLINE SUPPORT:
   * - When online: Executes server mutation immediately
   * - When offline: Generates temp ID, adds to sync queue, returns optimistic data
   */
  async create(
    request: CreateStudySessionRequest,
    isOnline: boolean,
    userId: string,
  ): Promise<StudySession> {
    try {
      // OFFLINE MODE: Generate temp ID and queue for later sync
      if (!isOnline) {
        console.log('📴 Offline: Queueing CREATE study_session action');

        const tempId = generateTempId('study_session');

        // Add to sync queue
        await syncManager.addToQueue(
          'CREATE',
          'study_session',
          {
            type: 'CREATE',
            data: request,
          },
          userId,
          { syncImmediately: false },
        );

        // Return optimistic study session with temp ID
        const optimisticStudySession: StudySession = {
          id: tempId,
          user_id: userId,
          course_id: request.course_id,
          topic: request.topic,
          date: request.session_date,
          duration_minutes: null,
          notes: request.notes || null,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
          _offline: true, // Mark as offline-created
          _tempId: tempId, // Store temp ID for reference
        } as any;

        console.log(
          `✅ Created optimistic study session with temp ID: ${tempId}`,
        );
        return optimisticStudySession;
      }

      // ONLINE MODE: Execute server mutation
      console.log('🌐 Online: Creating study session on server');
      const { data, error } = await invokeEdgeFunctionWithAuth(
        'create-study-session',
        { body: request },
      );
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Update an existing study session
   *
   * OFFLINE SUPPORT:
   * - When online: Executes server mutation immediately
   * - When offline: Adds to sync queue for later sync
   */
  async update(
    sessionId: string,
    request: UpdateStudySessionRequest,
    isOnline: boolean,
    userId: string,
  ): Promise<StudySession> {
    try {
      // OFFLINE MODE: Queue for later sync and return optimistic data
      if (!isOnline) {
        console.log('📴 Offline: Queueing UPDATE study_session action');

        // Get cached task data
        const { getCachedTask, mergeTaskUpdates } =
          await import('@/utils/taskCache');
        const cachedTask = await getCachedTask(sessionId, 'study_session');

        if (!cachedTask) {
          throw new Error(
            'Study session not found in cache. Please sync and try again.',
          );
        }

        // Merge updates with cached data
        const optimisticTask = mergeTaskUpdates(
          cachedTask as StudySession,
          request,
        );

        // Add to sync queue
        await syncManager.addToQueue(
          'UPDATE',
          'study_session',
          {
            type: 'UPDATE',
            id: sessionId,
            data: request,
          },
          userId,
          { syncImmediately: false },
        );

        console.log(
          `✅ Created optimistic update for study session ${sessionId}`,
        );
        return optimisticTask as StudySession;
      }

      // ONLINE MODE: Execute server mutation
      console.log('🌐 Online: Updating study session on server');
      const { data, error } = await invokeEdgeFunctionWithAuth(
        'update-study-session',
        {
          body: {
            study_session_id: sessionId,
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
