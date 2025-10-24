import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';

export interface TaskTemplate {
  id: string;
  user_id: string;
  template_name: string;
  task_type: 'assignment' | 'lecture' | 'study_session';
  template_data: any;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateData {
  template_name: string;
  task_type: 'assignment' | 'lecture' | 'study_session';
  template_data: any;
}

export interface UpdateTemplateData {
  id: string;
  template_name: string;
  template_data: any;
}

// Fetch all templates for the current user
export const useTemplates = () => {
  return useQuery({
    queryKey: ['templates'],
    queryFn: async (): Promise<TaskTemplate[]> => {
      const { data, error } = await supabase.functions.invoke('template-actions', {
        method: 'GET',
      });

      if (error) {
        throw error;
      }

      return data.templates || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Create a new template
export const useCreateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateData: CreateTemplateData): Promise<TaskTemplate> => {
      const { data, error } = await supabase.functions.invoke('template-actions', {
        method: 'POST',
        body: templateData,
      });

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
    mutationFn: async (updateData: UpdateTemplateData): Promise<TaskTemplate> => {
      const { data, error } = await supabase.functions.invoke('template-actions', {
        method: 'PUT',
        body: updateData,
      });

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
      const { error } = await supabase.functions.invoke('template-actions', {
        method: 'DELETE',
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
export const useTemplatesByType = (taskType: 'assignment' | 'lecture' | 'study_session') => {
  const { data: allTemplates, ...rest } = useTemplates();
  
  const templates = allTemplates?.filter(template => template.task_type === taskType) || [];
  
  return {
    templates,
    ...rest,
  };
};
