// Offline MVP stub — Supabase edge function calls removed
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

export const useTemplates = () => {
  return useQuery({
    queryKey: ['templates'],
    queryFn: async (): Promise<TaskTemplate[]> => [],
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      _templateData: CreateTemplateData,
    ): Promise<TaskTemplate> => {
      throw new Error('Template creation not available in offline mode');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
};

export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      _updateData: UpdateTemplateData,
    ): Promise<TaskTemplate> => {
      throw new Error('Template update not available in offline mode');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
};

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_templateId: string): Promise<void> => {
      throw new Error('Template deletion not available in offline mode');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
};

export const useTemplatesByType = (
  taskType: 'assignment' | 'lecture' | 'study_session',
) => {
  const { data: allTemplates, ...rest } = useTemplates();
  const templates =
    allTemplates?.filter(template => template.task_type === taskType) || [];
  return { templates, ...rest };
};
