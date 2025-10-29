import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { Course } from '@/types';

type TaskType = 'assignment' | 'lecture' | 'study_session';

interface QuickAddFormState {
  taskType: TaskType;
  title: string;
  selectedCourse: Course | null;
  dateTime: Date;
  saveAsTemplate: boolean;
  showCourseModal: boolean;
  showDatePicker: boolean;
  showTimePicker: boolean;
  courses: Course[];
  isLoadingCourses: boolean;
  isSaving: boolean;
  showEmptyStateModal: boolean;
}

interface QuickAddFormActions {
  setTaskType: (type: TaskType) => void;
  setTitle: (title: string) => void;
  setSelectedCourse: (course: Course | null) => void;
  setDateTime: (date: Date) => void;
  setSaveAsTemplate: (save: boolean) => void;
  setShowCourseModal: (show: boolean) => void;
  setShowDatePicker: (show: boolean) => void;
  setShowTimePicker: (show: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setShowEmptyStateModal: (show: boolean) => void;
  fetchCourses: () => Promise<void>;
  resetForm: () => void;
}

export const useQuickAddForm = (isVisible: boolean): QuickAddFormState & QuickAddFormActions => {
  const { user } = useAuth();
  // const { resetTemplateSelection } = useTemplateSelection();
  const resetTemplateSelection = () => {}; // Mock implementation

  // Form state
  const [taskType, setTaskType] = useState<TaskType>('assignment');
  const [title, setTitle] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [dateTime, setDateTime] = useState<Date>(new Date());
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  
  // Modal state
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEmptyStateModal, setShowEmptyStateModal] = useState(false);
  
  // Data state
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch courses when modal opens
  const fetchCourses = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingCourses(true);
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setIsLoadingCourses(false);
    }
  }, [user]);

  // Reset form when modal closes
  const resetForm = useCallback(() => {
    setTitle('');
    setSelectedCourse(null);
    setDateTime(new Date());
    setTaskType('assignment');
    setSaveAsTemplate(false);
    resetTemplateSelection();
  }, [resetTemplateSelection]);

  // Effects
  useEffect(() => {
    if (isVisible && user) {
      fetchCourses();
    }
  }, [isVisible, user, fetchCourses]);

  useEffect(() => {
    if (!isVisible) {
      resetForm();
    }
  }, [isVisible, resetForm]);

  return {
    // State
    taskType,
    title,
    selectedCourse,
    dateTime,
    saveAsTemplate,
    showCourseModal,
    showDatePicker,
    showTimePicker,
    courses,
    isLoadingCourses,
    isSaving,
    showEmptyStateModal,
    
    // Actions
    setTaskType,
    setTitle,
    setSelectedCourse,
    setDateTime,
    setSaveAsTemplate,
    setShowCourseModal,
    setShowDatePicker,
    setShowTimePicker,
    setIsSaving,
    setShowEmptyStateModal,
    fetchCourses,
    resetForm,
  };
};
