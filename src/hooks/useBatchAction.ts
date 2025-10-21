import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { cache } from '@/utils/cache';
import { useNetwork } from '@/contexts/NetworkContext';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { syncManager } from '@/services/syncManager';

export type BatchActionType = 'RESTORE' | 'DELETE_PERMANENTLY';

export interface BatchItem {
  id: string;
  type: 'assignment' | 'lecture' | 'study_session' | 'course';
}

export interface BatchActionRequest {
  action: BatchActionType;
  items: BatchItem[];
}

export interface BatchActionResult {
  message: string;
  results: {
    total: number;
    succeeded: number;
    failed: number;
    details: {
      success: Array<{ id: string; type: string }>;
      failed: Array<{ id: string; type: string; error: string }>;
    };
  };
}

async function batchAction(request: BatchActionRequest): Promise<BatchActionResult> {
  console.log(`🔄 Batch ${request.action} for ${request.items.length} items`);
  
  const { data, error } = await supabase.functions.invoke('batch-action', {
    body: request,
  });

  if (error) {
    throw new Error(error.message || 'Batch operation failed');
  }

  return data;
}

export function useBatchAction() {
  const queryClient = useQueryClient();
  const { isOnline } = useNetwork();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (request: BatchActionRequest) => {
      // OFFLINE MODE: Add to queue instead of calling server
      if (!isOnline) {
        console.log(`📴 Offline: Queueing BATCH ${request.action} for ${request.items.length} items`);
        
        // Add to sync queue
        if (user?.id) {
          await syncManager.addToQueue(
            request.action === 'RESTORE' ? 'BATCH_RESTORE' : 'BATCH_DELETE',
            'assignment', // This is just for type - batch actions work across types
            {
              type: 'BATCH',
              action: request.action === 'RESTORE' ? 'RESTORE' : 'DELETE',
              items: request.items.map(item => ({
                id: item.id,
                type: item.type as any,
              })),
            },
            user.id,
            { syncImmediately: false }
          );
        }
        
        // Return optimistic result
        return {
          message: `Batch ${request.action} queued for sync`,
          results: {
            total: request.items.length,
            succeeded: request.items.length,
            failed: 0,
            details: {
              success: request.items.map(item => ({ id: item.id, type: item.type })),
              failed: [],
            },
          },
          offline: true,
        };
      }

      // ONLINE MODE: Execute server mutation
      console.log(`🌐 Online: Executing batch ${request.action} for ${request.items.length} items`);
      return batchAction(request);
    },
    onSuccess: async (data, variables) => {
      console.log(`✅ Batch operation completed:`, data);

      // Only invalidate queries when online - offline changes are in the queue
      if (isOnline) {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['deletedItems'] });
        
        // Clear cache for home screen and calendar data
        // since items might have been restored
        await cache.remove('homeScreenData');
        
        // Also invalidate other queries based on item types
        const types = [...new Set(variables.items.map(item => item.type))];
        types.forEach(type => {
          if (type === 'assignment') {
            queryClient.invalidateQueries({ queryKey: ['assignments'] });
            cache.remove('assignments');
          } else if (type === 'lecture') {
            queryClient.invalidateQueries({ queryKey: ['lectures'] });
            cache.remove('lectures');
          } else if (type === 'study_session') {
            queryClient.invalidateQueries({ queryKey: ['studySessions'] });
            cache.remove('studySessions');
          } else if (type === 'course') {
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            cache.remove('courses:all');
          }
        });
      }
    },
    onError: (error: Error) => {
      console.error('❌ Batch operation failed:', error);
    },
  });
}

