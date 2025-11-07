import { useState, useCallback } from 'react';
import { TaskTemplate } from '@/hooks/useTemplates';

export interface TemplateSelectionState {
  isTemplateBrowserOpen: boolean;
  isUsingTemplate: boolean;
  selectedTemplate: TaskTemplate | null;
}

export const useTemplateSelection = () => {
  const [state, setState] = useState<TemplateSelectionState>({
    isTemplateBrowserOpen: false,
    isUsingTemplate: false,
    selectedTemplate: null,
  });

  // Open template browser
  const openTemplateBrowser = useCallback(() => {
    setState(prev => ({
      ...prev,
      isTemplateBrowserOpen: true,
    }));
  }, []);

  // Close template browser
  const closeTemplateBrowser = useCallback(() => {
    setState(prev => ({
      ...prev,
      isTemplateBrowserOpen: false,
    }));
  }, []);

  // Handle template selection
  const selectTemplate = useCallback((template: TaskTemplate) => {
    setState(prev => ({
      ...prev,
      selectedTemplate: template,
      isUsingTemplate: true,
    }));
  }, []);

  // Clear template selection
  const clearTemplateSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedTemplate: null,
      isUsingTemplate: false,
    }));
  }, []);

  // Reset all template selection state
  const resetTemplateSelection = useCallback(() => {
    setState({
      isTemplateBrowserOpen: false,
      isUsingTemplate: false,
      selectedTemplate: null,
    });
  }, []);

  return {
    ...state,
    openTemplateBrowser,
    closeTemplateBrowser,
    selectTemplate,
    clearTemplateSelection,
    resetTemplateSelection,
  };
};
