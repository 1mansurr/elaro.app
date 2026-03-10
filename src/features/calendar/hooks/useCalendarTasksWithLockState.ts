import { useMemo } from 'react';
import { User, CalendarData } from '@/types';

export const useCalendarTasksWithLockState = (
  calendarData: CalendarData | undefined,
  user: User | null,
) => {
  const tasksWithLockState = useMemo(() => {
    return Object.values(calendarData || {})
      .flat()
      .map(task => ({ ...task, isLocked: false }));
  }, [calendarData]);

  return {
    tasksWithLockState,
    isLoading: false,
  };
};
