import { useTemplateManagement } from '@/shared/hooks/useTemplateManagement';
import { useTemplateSelection } from '@/shared/hooks/useTemplateSelection';
import { clearDateFields } from '@/shared/utils/templateUtils';
import { Course } from '@/types';

export interface UseTaskTemplateOptions {
  taskType: 'lecture' | 'assignment' | 'study_session';
  courses: Course[];
  onTemplateDataLoad?: (templateData: any) => void;
}

export interface UseTaskTemplateReturn {
  isTemplateBrowserOpen: boolean;
  selectedTemplate: any | null;
  openTemplateBrowser: () => void;
  closeTemplateBrowser: () => void;
  selectTemplate: (template: any) => void;
  handleTemplateSelect: (template: any) => void;
  handleSaveAsTemplate: (formData: any, templateName?: string) => Promise<void>;
  hasTemplates: boolean;
  handleMyTemplatesPress: (onEmptyState: () => void) => void;
}

export const useTaskTemplate = (
  options: UseTaskTemplateOptions,
): UseTaskTemplateReturn => {
  const { taskType, courses, onTemplateDataLoad } = options;
  const { createTemplate, hasTemplates } = useTemplateManagement();
  const {
    isTemplateBrowserOpen,
    selectedTemplate,
    openTemplateBrowser,
    closeTemplateBrowser,
    selectTemplate,
    resetTemplateSelection,
  } = useTemplateSelection();

  const handleTemplateSelect = (template: any) => {
    selectTemplate(template);

    // Pre-fill form with template data
    if (template.template_data) {
      const templateData = clearDateFields(template.template_data);

      // Call the callback to let parent component handle the data loading
      onTemplateDataLoad?.(templateData);
    }
  };

  const handleSaveAsTemplate = async (
    formData: any,
    templateName?: string,
  ): Promise<void> => {
    if (!templateName) {
      throw new Error('Template name is required');
    }

    await createTemplate.mutateAsync({
      template_name: templateName.trim(),
      task_type: taskType,
      template_data: formData,
    });
  };

  const handleMyTemplatesPress = (onEmptyState: () => void) => {
    if (!hasTemplates()) {
      onEmptyState();
    } else {
      openTemplateBrowser();
    }
  };

  return {
    isTemplateBrowserOpen,
    selectedTemplate,
    openTemplateBrowser,
    closeTemplateBrowser,
    selectTemplate,
    handleTemplateSelect,
    handleSaveAsTemplate,
    hasTemplates: hasTemplates(),
    handleMyTemplatesPress,
  };
};
