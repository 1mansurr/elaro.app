import { useQuery } from '@tanstack/react-query';
import { versionedApiClient } from '@/services/VersionedApiClient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';

type ItemType = 'courses' | 'assignments' | 'lectures' | 'study_sessions';

const fetchTotalItemCount = async (itemType: ItemType, userId: string) => {
  try {
    const response = await versionedApiClient.getCount(itemType, {
      deleted_at: null,
    });

    if (response.error) {
      throw new Error(
        response.message || response.error || 'Failed to fetch item count',
      );
    }

    return response.data?.count || 0;
  } catch (error) {
    // Fallback to direct Supabase query if Edge Function fails
    const errorMessage =
      error instanceof Error && error.message
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unknown error';

    if (
      errorMessage.includes('Function failed to start') ||
      errorMessage.includes('Edge Function returned a non-2xx') ||
      errorMessage.includes('WORKER_ERROR')
    ) {
      console.warn(
        `⚠️ [useLockedItemsCount] Edge Function failed for ${itemType}, falling back to direct Supabase query`,
      );

      try {
        // Map itemType to table name
        const tableName =
          itemType === 'study_sessions' ? 'study_sessions' : itemType;

        const { count, error: dbError } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .is('deleted_at', null);

        if (dbError) {
          throw dbError;
        }

        return count || 0;
      } catch (fallbackError) {
        console.error(
          `⚠️ [useLockedItemsCount] Fallback query also failed for ${itemType}:`,
          fallbackError,
        );
        // If fallback also fails, throw the original error
        throw error;
      }
    }

    // Re-throw other errors
    throw error;
  }
};

export const useLockedItemsCount = (itemType: ItemType) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['totalItemCount', itemType, user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User ID is required');
      }
      const totalCount = await fetchTotalItemCount(itemType, user.id);
      return { totalCount, lockedCount: 0 };
    },
    enabled: !!user,
    retry: 2, // Reduce retries since we have fallback
    retryDelay: 1000,
  });
};
