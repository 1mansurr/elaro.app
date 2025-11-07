import { TaskTemplate } from '@/hooks/useTemplates';

/**
 * Generate template name from task title
 */
export const generateTemplateName = (title: string): string => {
  return `${title} Template`;
};

/**
 * Clear date fields from template data
 */
export const clearDateFields = (templateData: any): any => {
  const clearedData = { ...templateData };

  // Clear common date fields
  const dateFields = [
    'due_date',
    'start_time',
    'end_time',
    'session_date',
    'created_at',
    'updated_at',
    'deleted_at',
    'id',
    'user_id',
  ];

  dateFields.forEach(field => {
    if (clearedData[field] !== undefined) {
      delete clearedData[field];
    }
  });

  return clearedData;
};

/**
 * Validate template data
 */
export const validateTemplateData = (
  templateData: any,
  taskType: string,
): { isValid: boolean; error?: string } => {
  // Check if title exists
  const titleField = taskType === 'lecture' ? 'lecture_name' : 'title';

  if (!templateData[titleField] || templateData[titleField].trim() === '') {
    return {
      isValid: false,
      error: 'Title is required',
    };
  }

  return { isValid: true };
};

/**
 * Get task type icon
 */
export const getTaskTypeIcon = (taskType: string): string => {
  switch (taskType) {
    case 'assignment':
      return '📝';
    case 'lecture':
      return '👨‍🏫';
    case 'study_session':
      return '📚';
    default:
      return '📝';
  }
};

/**
 * Get task type display name
 */
export const getTaskTypeDisplayName = (taskType: string): string => {
  switch (taskType) {
    case 'assignment':
      return 'Assignments';
    case 'lecture':
      return 'Lectures';
    case 'study_session':
      return 'Study Sessions';
    default:
      return 'Unknown';
  }
};

/**
 * Create template data from task data
 */
export const createTemplateDataFromTask = (
  taskData: any,
  taskType: 'assignment' | 'lecture' | 'study_session',
): any => {
  const clearedData = clearDateFields(taskData);
  return clearedData;
};

/**
 * Check if template data is valid for saving
 */
export const canSaveAsTemplate = (
  taskData: any,
  taskType: 'assignment' | 'lecture' | 'study_session',
): boolean => {
  const validation = validateTemplateData(taskData, taskType);
  return validation.isValid;
};
