import { useQuery } from '@tanstack/react-query';
import { Assignment, Lecture, StudySession } from '@/types';

type TaskType = 'assignment' | 'lecture' | 'study_session';

interface UseTaskDetailOptions {
  enabled?: boolean;
}

export const useTaskDetail = (
  taskId: string | null | undefined,
  taskType: TaskType | null | undefined,
  options: UseTaskDetailOptions = {},
) => {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['taskDetail', taskType, taskId],
    queryFn: async (): Promise<Assignment | Lecture | StudySession | null> => null,
    enabled: enabled && !!taskId && !!taskType,
  });
};
