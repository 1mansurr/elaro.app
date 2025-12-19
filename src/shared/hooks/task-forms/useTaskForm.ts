import { useState, useEffect, useCallback } from 'react';
import { debounce } from '@/utils/debounce';
import {
  saveDraft,
  getDraft,
  clearDraft,
  DraftType,
} from '@/utils/draftStorage';
import { Course } from '@/types';

export interface TaskFormData {
  selectedCourse: Course | null;
  title: string;
  // For single date/time (assignments)
  date?: Date;
  // For range (lectures)
  startTime?: Date;
  endTime?: Date;
  // Optional fields
  description?: string;
  venue?: string;
  recurrence?: 'none' | 'weekly' | 'bi-weekly';
  submissionMethod?: 'Online' | 'In-person' | null;
  submissionLink?: string;
  reminders: number[];
  [key: string]: any; // Allow additional fields
}

export interface UseTaskFormOptions {
  taskType: DraftType;
  initialData?: Partial<TaskFormData>;
  onSave: (data: TaskFormData) => Promise<void>;
  validate?: (data: TaskFormData) => boolean;
  enableDraftAutoSave?: boolean;
}

export interface UseTaskFormReturn {
  // Form state
  formData: TaskFormData;
  isValid: boolean;
  isSaving: boolean;
  errors: Record<string, string>;

  // Form actions
  updateField: (field: string, value: any) => void;
  updateFields: (fields: Partial<TaskFormData>) => void;
  handleSave: () => Promise<void>;
  resetForm: () => void;

  // Draft management
  saveDraft: () => void;
  loadDraft: () => void;
  clearDraft: () => void;
}

const defaultFormData: TaskFormData = {
  selectedCourse: null,
  title: '',
  reminders: [],
};

export const useTaskForm = (options: UseTaskFormOptions): UseTaskFormReturn => {
  const {
    taskType,
    initialData,
    onSave,
    validate,
    enableDraftAutoSave = true,
  } = options;

  const [formData, setFormData] = useState<TaskFormData>(() => {
    const draft = getDraft(taskType);
    const baseData = {
      ...defaultFormData,
      ...initialData,
      ...(draft && {
        title: draft.title || initialData?.title || '',
        selectedCourse: draft.course || initialData?.selectedCourse || null,
        dateTime: draft.dateTime
          ? new Date(draft.dateTime)
          : initialData?.date || new Date(),
        reminders: draft.reminders || initialData?.reminders || [],
      }),
    };
    return baseData as TaskFormData;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Default validation function
  const defaultValidate = useCallback((data: TaskFormData): boolean => {
    if (!data.selectedCourse) return false;
    if (!data.title || data.title.trim().length === 0) return false;

    // For range mode (lectures)
    if (data.startTime && data.endTime) {
      if (data.startTime >= data.endTime) return false;
    }

    // For single mode (assignments)
    if (data.date) {
      if (data.date <= new Date()) return false;
    }

    return true;
  }, []);

  const validateForm = useCallback(
    (data: TaskFormData): boolean => {
      const validator = validate || defaultValidate;
      return validator(data);
    },
    [validate, defaultValidate],
  );

  const isValid = validateForm(formData);

  // Update single field
  const updateField = useCallback(
    (field: string, value: any) => {
      setFormData(prev => {
        const updated = { ...prev, [field]: value };

        // Clear error for this field when updated
        if (errors[field]) {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
          });
        }

        return updated;
      });
    },
    [errors],
  );

  // Update multiple fields at once
  const updateFields = useCallback((fields: Partial<TaskFormData>) => {
    setFormData(prev => ({ ...prev, ...fields }));
  }, []);

  // Save draft (debounced)
  const saveDraftToStorage = useCallback(() => {
    if (!enableDraftAutoSave || !formData.selectedCourse) return;

    const debouncedSave = debounce(() => {
      saveDraft(taskType, {
        title: formData.title,
        course: formData.selectedCourse,
        dateTime: formData.date || formData.startTime || new Date(),
        endTime: formData.endTime,
        recurrence: formData.recurrence,
        reminders: formData.reminders,
        description: formData.description,
        submissionMethod: formData.submissionMethod,
        submissionLink: formData.submissionLink,
        venue: formData.venue,
      });
    }, 1000);

    debouncedSave.debounced();

    return () => {
      debouncedSave.cancel();
    };
  }, [taskType, formData, enableDraftAutoSave]);

  // Auto-save draft when form data changes
  useEffect(() => {
    if (!enableDraftAutoSave) return;
    return saveDraftToStorage();
  }, [
    formData.selectedCourse,
    formData.title,
    formData.date,
    formData.startTime,
    formData.endTime,
    formData.venue,
    formData.recurrence,
    formData.reminders,
    enableDraftAutoSave,
    saveDraftToStorage,
  ]);

  // Load draft
  const loadDraftFromStorage = useCallback(() => {
    const draft = getDraft(taskType);
    if (draft) {
      setFormData(prev => ({
        ...prev,
        title: draft.title || prev.title,
        selectedCourse: draft.course || prev.selectedCourse,
        date: draft.dateTime ? new Date(draft.dateTime) : prev.date,
        startTime: draft.dateTime ? new Date(draft.dateTime) : prev.startTime,
        endTime: draft.endTime ? new Date(draft.endTime) : prev.endTime,
        recurrence: draft.recurrence || prev.recurrence,
        reminders: draft.reminders || prev.reminders,
        description: draft.description || prev.description,
        submissionMethod: draft.submissionMethod || prev.submissionMethod,
        submissionLink: draft.submissionLink || prev.submissionLink,
        venue: draft.venue || prev.venue,
      }));
    }
  }, [taskType]);

  // Clear draft
  const clearDraftFromStorage = useCallback(() => {
    clearDraft(taskType);
  }, [taskType]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!isValid) {
      setErrors({ general: 'Please fill in all required fields.' });
      return;
    }

    setIsSaving(true);
    setErrors({});

    try {
      await onSave(formData);
      // Clear draft after successful save
      clearDraftFromStorage();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to save';
      setErrors({ general: errorMessage });
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [formData, isValid, onSave, clearDraftFromStorage]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({ ...defaultFormData, ...initialData } as TaskFormData);
    setErrors({});
  }, [initialData]);

  return {
    formData,
    isValid,
    isSaving,
    errors,
    updateField,
    updateFields,
    handleSave,
    resetForm,
    saveDraft: saveDraftToStorage,
    loadDraft: loadDraftFromStorage,
    clearDraft: clearDraftFromStorage,
  };
};
