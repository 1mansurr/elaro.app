import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { SimpleNotificationPreferences } from '@/services/notifications/interfaces/SimpleNotificationPreferences';

export const useNotificationPreferences = () => {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading, isError } = useQuery<SimpleNotificationPreferences | null, Error>({
    queryKey: ['notificationPreferences'],
    queryFn: async () => {
      // Mock implementation - replace with actual API call
      return {
        enabled: true,
        reminders: true,
        assignments: true,
        lectures: true,
        studySessions: true,
        dailySummaries: false,
        marketing: false,
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00'
        },
        userId: 'mock-user-id',
        updatedAt: new Date()
      };
    },
  });

  const updateMutation = useMutation<SimpleNotificationPreferences, Error, Partial<SimpleNotificationPreferences>>({
    mutationFn: async (newPreferences) => {
      // Mock implementation - replace with actual API call
      return { ...preferences!, ...newPreferences };
    },
    onSuccess: (data) => {
      // When the mutation is successful, update the query cache with the latest data
      queryClient.setQueryData(['notificationPreferences'], data);
    },
  });

  return {
    preferences,
    isLoading,
    isError,
    updatePreferences: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
};
