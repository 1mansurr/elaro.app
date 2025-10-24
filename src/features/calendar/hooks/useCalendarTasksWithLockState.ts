import { useMemo, useState, useEffect } from 'react';
import { User } from '@/types';
import { usePermissions } from '@/features/auth/hooks/usePermissions';

export const useCalendarTasksWithLockState = (
  calendarData: Record<string, any[]> | undefined,
  user: User | null
) => {
  const { isPremium } = usePermissions(user);
  const [premiumStatus, setPremiumStatus] = useState<boolean | null>(null);

  useEffect(() => {
    const checkPremiumStatus = async () => {
      if (!user) {
        setPremiumStatus(false);
        return;
      }

      try {
        const premium = await isPremium();
        setPremiumStatus(premium);
      } catch (error) {
        console.error('❌ Error checking premium status:', error);
        setPremiumStatus(false);
      }
    };

    checkPremiumStatus();
  }, [user, isPremium]);

  const tasksWithLockState = useMemo(() => {
    if (!calendarData || !user || premiumStatus === true) {
      return Object.values(calendarData || {}).flat().map(task => ({ ...task, isLocked: false }));
    }

    const allTasks = Object.values(calendarData).flat();
    
    const limits: Record<string, number> = {
      assignment: 15,
      lecture: 15,
      study_session: 15,
    };

    return allTasks.map(task => {
      const taskType = task.type as keyof typeof limits;
      const limit = limits[taskType] || 15;
      
      // Check if task is within limit based on creation order
      const tasksOfSameType = allTasks
        .filter(t => t.type === task.type)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      const taskIndex = tasksOfSameType.findIndex(t => t.id === task.id);
      const isLocked = taskIndex >= limit;

      return {
        ...task,
        isLocked,
      };
    });
  }, [calendarData, user, premiumStatus]);

  return {
    tasksWithLockState,
    isLoading: premiumStatus === null,
  };
};
