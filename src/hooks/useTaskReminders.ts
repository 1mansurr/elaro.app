import { useQuery } from '@tanstack/react-query';

type TaskType = 'assignment' | 'lecture' | 'study_session';

interface Reminder {
  id: string;
  reminder_time: string;
  reminder_type: string;
  minutes_before?: number;
  label?: string;
}

export const useTaskReminders = (
  taskId: string | null | undefined,
  taskType: TaskType | null | undefined,
) => {
  return useQuery({
    queryKey: ['taskReminders', taskType, taskId],
    queryFn: async (): Promise<Reminder[]> => [],
    enabled: !!taskId && !!taskType,
  });
};
