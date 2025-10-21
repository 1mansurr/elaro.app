import { supabase } from '@/services/supabase';
import { Assignment } from '@/types';
import { CreateAssignmentRequest } from '@/types/api';
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
    userId: string
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
          { syncImmediately: false }
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
      const { data, error } = await supabase.functions.invoke('create-assignment', { body: request });
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
