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
        const errorMessage =
          error instanceof Error && error.message
            ? error.message
            : typeof error === 'string'
              ? error
              : 'Unknown error';

        // Check for HTTP status codes in error object
        const httpStatus = (error as any)?.status || (error as any)?.statusCode;
        const isHttpError = httpStatus !== undefined;
        const isAuthError = httpStatus === 401 || httpStatus === 403;

        // Check if it's an auth/API error that should be handled gracefully
        const isHandledError =
          errorMessage.includes('No valid session') ||
            errorMessage.includes('Failed to refresh token') ||
            errorMessage.includes('Session expired') ||
            errorMessage.includes('Edge Function returned a non-2xx') ||
            errorMessage.includes('Authentication required') ||
            errorMessage.includes('Auth session missing') ||
          (error as any).name === 'FunctionsHttpError' ||
          isAuthError ||
          (isHttpError && httpStatus >= 400 && httpStatus < 500);

        if (isHandledError) {
          // Only log warnings in development to reduce production noise
          if (__DEV__) {
            const statusInfo = httpStatus ? ` (HTTP ${httpStatus})` : '';
            console.warn(
              `⚠️ Auth/API error in templates, returning empty array${statusInfo}:`,
              errorMessage,
            );
          }
          return [];
        }

        // For other errors (network, server errors), log more details but still handle gracefully
        if (__DEV__ && isHttpError) {
          console.error(
            `❌ Template API error (HTTP ${httpStatus}):`,
            errorMessage,
          );
        }

        // Re-throw unexpected errors
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
