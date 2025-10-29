import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { usePermissions } from '@/features/auth/hooks/usePermissions';

const FREE_TIER_LIMITS = {
  courses: 2,
  assignments: 15,
  lectures: 15,
  study_sessions: 15,
};

type ItemType = 'courses' | 'assignments' | 'lectures' | 'study_sessions';

const fetchTotalItemCount = async (itemType: ItemType, userId: string) => {
  const { count, error } = await supabase
    .from(itemType)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (error) throw new Error(error.message);
  return count || 0;
};

export const useLockedItemsCount = (itemType: ItemType) => {
  const { user } = useAuth();
  const { isPremium } = usePermissions(user);

  return useQuery({
    queryKey: ['totalItemCount', itemType, user?.id],
    queryFn: async () => {
      const totalCount = await fetchTotalItemCount(itemType, user!.id);
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

