import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatReminderLabel } from '@/utils/reminderUtils';

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
  const { user } = useAuth();

  return useQuery({
    queryKey: ['taskReminders', taskType, taskId],
    queryFn: async () => {
      if (!taskId || !taskType || !user) {
        return [];
      }

      // Map task type to reminder field name
      const reminderFieldMap = {
        assignment: 'assignment_id',
        lecture: 'lecture_id',
        study_session: 'session_id',
      };

      const reminderField = reminderFieldMap[taskType];

      // Fetch reminders for this task
      const { data, error } = await supabase
        .from('reminders')
        .select('id, reminder_time, reminder_type, minutes_before')
        .eq('user_id', user.id)
        .eq(reminderField, taskId)
        .eq('completed', false)
        .order('reminder_time', { ascending: true });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Format reminders with labels
      return data.map((reminder: Reminder) => {
        // Calculate minutes before if not stored
        let minutesBefore = reminder.minutes_before;
        if (!minutesBefore && reminder.reminder_time) {
          // This would require the task's date/time to calculate
          // For now, we'll use a default or fetch from reminder metadata
        }

        // Use standard reminder options if minutes_before is available
        const label = minutesBefore
          ? formatReminderLabel(minutesBefore)
          : 'Reminder';

        return {
          id: reminder.id,
          reminderTime: reminder.reminder_time,
          reminderType: reminder.reminder_type,
          minutesBefore: minutesBefore || 0,
          label,
        };
      });
    },
    enabled: !!taskId && !!taskType && !!user,
  });
};

