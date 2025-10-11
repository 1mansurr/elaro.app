import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { NotificationPreferences } from '@/types';

export const useNotificationPreferences = () => {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading, isError } = useQuery<NotificationPreferences | null, Error>({
    queryKey: ['notificationPreferences'],
    queryFn: api.notificationPreferences.get,
  });

  const updateMutation = useMutation<NotificationPreferences, Error, Partial<NotificationPreferences>>({
    mutationFn: (newPreferences) => api.mutations.notificationPreferences.update(newPreferences),
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
