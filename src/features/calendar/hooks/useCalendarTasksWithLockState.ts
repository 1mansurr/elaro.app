import { useMemo, useState, useEffect } from 'react';
import { User, CalendarData } from '@/types';
import { usePermissions } from '@/shared/hooks/usePermissions';

export const useCalendarTasksWithLockState = (
  calendarData: CalendarData | undefined,
  user: User | null,
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
      return Object.values(calendarData || {})
        .flat()
        .map(task => ({ ...task, isLocked: false }));
    }

    const allTasks = Object.values(calendarData).flat();
    const limits: Record<string, number> = {
      assignment: 15,
      lecture: 15,
      study_session: 15,
    };

    // Pre-compute sorted tasks by type once (O(n log n) instead of O(n²))
    const tasksByType = new Map<string, typeof allTasks>();
    const taskTypeSet = new Set(allTasks.map(t => t.type));

    // Sort tasks by type once
    taskTypeSet.forEach(type => {
      const tasksOfType = allTasks
        .filter(t => t.type === type)
        .sort((a, b) => {
          // Task type doesn't have created_at, use date instead for sorting
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateA - dateB;
        });
      tasksByType.set(type, tasksOfType);
    });

    // Create a map for O(1) lookup of task index
    const taskIndexMap = new Map<string, number>();
    tasksByType.forEach((tasks, type) => {
      const limit = limits[type] || 15;
      tasks.forEach((task, index) => {
        taskIndexMap.set(task.id, index);
      });
    });

    // Now map tasks with lock state (O(n) instead of O(n²))
    return allTasks.map(task => {
      const taskType = task.type as keyof typeof limits;
      const limit = limits[taskType] || 15;
      const taskIndex = taskIndexMap.get(task.id) ?? -1;
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
