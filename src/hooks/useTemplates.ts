import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { getFreshAccessToken } from '@/utils/getFreshAccessToken';

export interface TaskTemplate {
  id: string;
  user_id: string;
  template_name: string;
  task_type: 'assignment' | 'lecture' | 'study_session';
  template_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateData {
  template_name: string;
  task_type: 'assignment' | 'lecture' | 'study_session';
  template_data: Record<string, unknown>;
}

export interface UpdateTemplateData {
  id: string;
  template_name: string;
  template_data: Record<string, unknown>;
}

// Fetch all templates for the current user
export const useTemplates = () => {
  return useQuery({
    queryKey: ['templates'],
    queryFn: async (): Promise<TaskTemplate[]> => {
      try {
        const accessToken = await getFreshAccessToken();
      const { data, error } = await supabase.functions.invoke(
        'template-actions',
        {
          method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
        },
      );

      if (error) {
        throw error;
      }

      return data.templates || [];
      } catch (error) {
        // On auth errors, return empty array instead of throwing
        if (
          error instanceof Error &&
          (error.message.includes('No valid session') ||
            error.message.includes('Failed to refresh token') ||
            error.message.includes('Session expired') ||
            error.message.includes('Edge Function returned a non-2xx') ||
            error.message.includes('Authentication required') ||
            error.message.includes('Auth session missing') ||
            (error as any).name === 'FunctionsHttpError')
        ) {
          // Only log warnings in development to reduce production noise
          if (__DEV__) {
            console.warn('⚠️ Auth/API error in templates, returning empty array:', error.message);
          }
          return [];
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Create a new template
export const useCreateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      templateData: CreateTemplateData,
    ): Promise<TaskTemplate> => {
      const accessToken = await getFreshAccessToken();
      const { data, error } = await supabase.functions.invoke(
        'template-actions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: templateData,
        },
      );

      if (error) {
        throw error;
      }

      return data.template;
    },
    onSuccess: () => {
      // Invalidate templates query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
};

// Update an existing template
export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      updateData: UpdateTemplateData,
    ): Promise<TaskTemplate> => {
      const accessToken = await getFreshAccessToken();
      const { data, error } = await supabase.functions.invoke(
        'template-actions',
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: updateData,
        },
      );

      if (error) {
        throw error;
      }

      return data.template;
    },
    onSuccess: () => {
      // Invalidate templates query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
};

// Delete a template
export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string): Promise<void> => {
      const accessToken = await getFreshAccessToken();
      const { error } = await supabase.functions.invoke('template-actions', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: { id: templateId },
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate templates query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
};

// Get templates by task type
export const useTemplatesByType = (
  taskType: 'assignment' | 'lecture' | 'study_session',
) => {
  const { data: allTemplates, ...rest } = useTemplates();

  const templates =
    allTemplates?.filter(template => template.task_type === taskType) || [];

  return {
    templates,
    ...rest,
  };
};
