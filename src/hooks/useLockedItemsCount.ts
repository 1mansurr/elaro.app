import { useQuery } from '@tanstack/react-query';
import { versionedApiClient } from '@/services/VersionedApiClient';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/shared/hooks/usePermissions';

const FREE_TIER_LIMITS = {
  courses: 2,
  assignments: 15,
  lectures: 15,
  study_sessions: 15,
};

type ItemType = 'courses' | 'assignments' | 'lectures' | 'study_sessions';

const fetchTotalItemCount = async (itemType: ItemType) => {
  const response = await versionedApiClient.getCount(itemType, {
    deleted_at: null,
  });

  if (response.error) {
    throw new Error(response.message || response.error || 'Failed to fetch item count');
  }

  return response.data?.count || 0;
};

export const useLockedItemsCount = (itemType: ItemType) => {
  const { user } = useAuth();
  const { isPremium } = usePermissions(user);

  return useQuery({
    queryKey: ['totalItemCount', itemType, user?.id],
    queryFn: async () => {
      const totalCount = await fetchTotalItemCount(itemType);
      const premium = await isPremium();
      if (premium) {
        return { totalCount, lockedCount: 0 }; // No locked items for premium users
      }

      const limit = FREE_TIER_LIMITS[itemType];
      const lockedCount = Math.max(0, totalCount - limit);
      return { totalCount, lockedCount };
    },
    enabled: !!user,
  });
};
