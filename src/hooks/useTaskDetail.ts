import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user } = useAuth();
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['taskDetail', taskType, taskId],
    queryFn: async () => {
      if (!taskId || !taskType || !user) {
        return null;
      }

      // Map task type to table name
      const tableName =
        taskType === 'study_session' ? 'study_sessions' : `${taskType}s`;

      // Fetch task with course data
      const { data, error } = await supabase
        .from(tableName)
        .select(
          `
          *,
          courses (
            id,
            course_name,
            course_code
          )
        `,
        )
        .eq('id', taskId)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      // Map to app types (handle snake_case to camelCase conversion)
      if (taskType === 'assignment') {
        return {
          id: data.id,
          userId: data.user_id,
          courseId: data.course_id,
          title: data.title,
          description: data.description,
          submissionMethod: data.submission_method,
          submissionLink: data.submission_link,
          dueDate: data.due_date,
          createdAt: data.created_at,
          course: data.courses
            ? {
                id: data.courses.id,
                courseName: data.courses.course_name,
                courseCode: data.courses.course_code,
              }
            : null,
        } as Assignment & { course: { id: string; courseName: string; courseCode?: string } | null };
      }

      if (taskType === 'lecture') {
        return {
          id: data.id,
          userId: data.user_id,
          courseId: data.course_id,
          lectureDate: data.lecture_date || data.start_time,
          startTime: data.start_time,
          endTime: data.end_time,
          isRecurring: data.is_recurring,
          recurringPattern: data.recurring_pattern,
          lectureName: data.lecture_name,
          description: data.description,
          venue: data.venue,
          createdAt: data.created_at,
          course: data.courses
            ? {
                id: data.courses.id,
                courseName: data.courses.course_name,
                courseCode: data.courses.course_code,
              }
            : null,
        } as Lecture & { course: { id: string; courseName: string; courseCode?: string } | null };
      }

      if (taskType === 'study_session') {
        return {
          id: data.id,
          userId: data.user_id,
          courseId: data.course_id,
          topic: data.topic,
          description: data.description,
          sessionDate: data.session_date,
          hasSpacedRepetition: data.has_spaced_repetition,
          createdAt: data.created_at,
          course: data.courses
            ? {
                id: data.courses.id,
                courseName: data.courses.course_name,
                courseCode: data.courses.course_code,
              }
            : null,
        } as StudySession & { course: { id: string; courseName: string; courseCode?: string } | null };
      }

      return null;
    },
    enabled: enabled && !!taskId && !!taskType && !!user,
  });
};

