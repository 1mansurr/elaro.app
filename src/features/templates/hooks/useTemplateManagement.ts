import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTemplates } from '@/hooks/useTemplates';
import { supabase } from '@/services/supabase';
import { TaskTemplate } from '@/hooks/useTemplates';

export interface CreateTemplateData {
  template_name: string;
  task_type: 'assignment' | 'lecture' | 'study_session';
  template_data: any;
}

export const useTemplateManagement = () => {
  const { templates, loading } = useTemplates();
  const queryClient = useQueryClient();

  // Create template mutation
  const createTemplate = useMutation({
    mutationFn: async (data: CreateTemplateData) => {
      const { data: newTemplate, error } = await supabase
        .from('task_templates')
        .insert({
          template_name: data.template_name,
          task_type: data.task_type,
          template_data: data.template_data,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create template: ${error.message}`);
      }

      return newTemplate;
    },
    onSuccess: () => {
      // Invalidate templates query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  // Delete template mutation (soft delete)
  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('task_templates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', templateId);

      if (error) {
        throw new Error(`Failed to delete template: ${error.message}`);
      }
    },
    onSuccess: () => {
      // Invalidate templates query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  // Get templates filtered by task type
  const getTemplatesByType = (taskType: 'assignment' | 'lecture' | 'study_session') => {
    return templates.filter(template => template.task_type === taskType);
  };

  // Get all templates ordered by creation date (latest first)
  const getAllTemplates = () => {
    return [...templates].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  };

  // Check if user has any templates
  const hasTemplates = () => {
    return templates.length > 0;
  };

  // Check if user has templates for specific task type
  const hasTemplatesForType = (taskType: 'assignment' | 'lecture' | 'study_session') => {
    return templates.some(template => template.task_type === taskType);
  };

  return {
    templates,
    loading,
    createTemplate,
    deleteTemplate,
    getTemplatesByType,
    getAllTemplates,
    hasTemplates,
    hasTemplatesForType,
  };
};
