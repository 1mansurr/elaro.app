import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cache } from '@/utils/cache';
import { useNetwork } from '@/contexts/NetworkContext';
import { invokeEdgeFunctionWithAuth } from '@/utils/invokeEdgeFunction';

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

async function batchAction(
  request: BatchActionRequest,
): Promise<BatchActionResult> {
  console.log(`🔄 Batch ${request.action} for ${request.items.length} items`);

  const { data, error } = await invokeEdgeFunctionWithAuth('batch-action', {
    body: request,
  });

  if (error) {
    throw new Error(error.message || 'Batch operation failed');
  }

  // NULL SAFETY: If data is null (empty response), return a default result
  if (!data) {
    return {
      message: 'Batch operation completed',
      results: {
        total: request.items.length,
        succeeded: 0,
        failed: request.items.length,
        details: {
          success: [],
          failed: request.items.map(item => ({
            id: item.id,
            type: item.type,
            error: 'No response from server',
          })),
        },
      },
    };
  }

  return data;
}

export function useBatchAction() {
  const queryClient = useQueryClient();
  const { isOnline } = useNetwork();

  return useMutation({
    mutationFn: async (request: BatchActionRequest) => {
      // OFFLINE MODE: Return optimistic result
      if (!isOnline) {
        console.log(
          `📴 Offline: Batch ${request.action} for ${request.items.length} items (no sync queue in offline mode)`,
        );
        return {
          message: `Batch ${request.action} not available offline`,
          results: {
            total: request.items.length,
            succeeded: 0,
            failed: request.items.length,
            details: {
              success: [],
              failed: request.items.map(item => ({
                id: item.id,
                type: item.type,
                error: 'Offline mode',
              })),
            },
          },
          offline: true,
        };
      }

      // ONLINE MODE: Execute server mutation
      console.log(
        `🌐 Online: Executing batch ${request.action} for ${request.items.length} items`,
      );
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
