import { supabase } from '@/services/supabase';
import { StudySession } from '@/types';
import { CreateStudySessionRequest } from '@/types/api';
import { handleApiError } from '@/services/api/errors';
import { syncManager } from '@/services/syncManager';
import { generateTempId } from '@/utils/uuid';

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
      const { data, error } = await supabase.functions.invoke(
        'create-study-session',
        { body: request },
      );
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
