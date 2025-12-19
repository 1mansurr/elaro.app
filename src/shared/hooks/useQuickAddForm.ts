import { useState, useEffect, useCallback } from 'react';
import { Course } from '@/types';
import { useCourseSelector } from './task-forms/useCourseSelector';
import { useTaskTemplate } from './task-forms/useTaskTemplate';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types';

type TaskType = 'assignment' | 'lecture' | 'study_session';

interface UseQuickAddFormOptions {
  isVisible: boolean;
  onClose: () => void;
}

interface UseQuickAddFormReturn {
  // Form state
  taskType: TaskType;
  title: string;
  selectedCourse: Course | null;
  dateTime: Date;
  saveAsTemplate: boolean;

  // UI state
  showDatePicker: boolean;
  showTimePicker: boolean;
  showCourseModal: boolean;
  isSaving: boolean;

  // Courses
  courses: Course[];
  isLoadingCourses: boolean;

  // Template
  isTemplateBrowserOpen: boolean;
  selectedTemplate: any | null;
  hasTemplates: boolean;
  isUsingTemplate: boolean;

  // Actions
  setTaskType: (type: TaskType) => void;
  setTitle: (title: string) => void;
  setSelectedCourse: (course: Course | null) => void;
  setDateTime: (date: Date) => void;
  setSaveAsTemplate: (value: boolean) => void;
  setShowDatePicker: (show: boolean) => void;
  setShowTimePicker: (show: boolean) => void;
  setShowCourseModal: (show: boolean) => void;
  handleDateChange: (event: any, selectedDate?: Date) => void;
  handleTimeChange: (event: any, selectedTime?: Date) => void;
  handleTemplateSelect: (template: any) => void;
  handleMyTemplatesPress: () => void;
  openTemplateBrowser: () => void;
  closeTemplateBrowser: () => void;

  // Validation
  isFormValid: boolean;
}

export const useQuickAddForm = (
  options: UseQuickAddFormOptions,
): UseQuickAddFormReturn => {
  const { isVisible, onClose } = options;
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { session } = useAuth();
  const isGuest = !session;

  // Course selector
  const { courses, isLoading: isLoadingCourses } = useCourseSelector();

  // Form state
  const [taskType, setTaskType] = useState<TaskType>('assignment');
  const [title, setTitle] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [dateTime, setDateTime] = useState<Date>(new Date());
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Template hook
  const {
    isTemplateBrowserOpen,
    selectedTemplate,
    openTemplateBrowser,
    closeTemplateBrowser,
    handleTemplateSelect: baseHandleTemplateSelect,
    hasTemplates,
  } = useTaskTemplate({
    taskType,
    courses,
    onTemplateDataLoad: templateData => {
      if (templateData.title) {
        setTitle(templateData.title);
      }
      if (templateData.lecture_name) {
        setTitle(templateData.lecture_name);
      }
      if (templateData.topic) {
        setTitle(templateData.topic);
      }
      if (templateData.course_id) {
        const course = courses.find(c => c.id === templateData.course_id);
        if (course) {
          setSelectedCourse(course);
        }
      }
      if (templateData.dateTime) {
        setDateTime(new Date(templateData.dateTime));
      }
      if (templateData.due_date) {
        setDateTime(new Date(templateData.due_date));
      }
      if (templateData.start_time) {
        setDateTime(new Date(templateData.start_time));
      }
      if (templateData.session_date) {
        setDateTime(new Date(templateData.session_date));
      }
    },
  });

  // Block Quick Add for unauthenticated users
  useEffect(() => {
    if (isVisible && isGuest) {
      onClose();
      navigation.navigate('Auth', { mode: 'signup' });
    }
  }, [isVisible, isGuest, onClose, navigation]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isVisible) {
      setTitle('');
      setSelectedCourse(null);
      setDateTime(new Date());
      setSaveAsTemplate(false);
      setShowDatePicker(false);
      setShowTimePicker(false);
      setShowCourseModal(false);
    }
  }, [isVisible]);

  const handleDateChange = useCallback(
    (event: any, selectedDate?: Date) => {
      setShowDatePicker(false);
      if (selectedDate) {
        const newDateTime = new Date(selectedDate);
        newDateTime.setHours(dateTime.getHours());
        newDateTime.setMinutes(dateTime.getMinutes());
        setDateTime(newDateTime);
      }
    },
    [dateTime],
  );

  const handleTimeChange = useCallback(
    (event: any, selectedTime?: Date) => {
      setShowTimePicker(false);
      if (selectedTime) {
        const newDateTime = new Date(dateTime);
        newDateTime.setHours(selectedTime.getHours());
        newDateTime.setMinutes(selectedTime.getMinutes());
        setDateTime(newDateTime);
      }
    },
    [dateTime],
  );

  const handleTemplateSelect = useCallback(
    (template: any) => {
      baseHandleTemplateSelect(template);
      closeTemplateBrowser();
    },
    [baseHandleTemplateSelect, closeTemplateBrowser],
  );

  const handleMyTemplatesPress = useCallback(() => {
    if (!hasTemplates) {
      // Could show empty state modal here
      return;
    }
    openTemplateBrowser();
  }, [hasTemplates, openTemplateBrowser]);

  // Validation
  const isFormValid =
    selectedCourse !== null && title.trim().length > 0 && dateTime > new Date();

  return {
    // Form state
    taskType,
    title,
    selectedCourse,
    dateTime,
    saveAsTemplate,

    // UI state
    showDatePicker,
    showTimePicker,
    showCourseModal,
    isSaving,

    // Courses
    courses,
    isLoadingCourses,

    // Template
    isTemplateBrowserOpen,
    selectedTemplate,
    hasTemplates,
    isUsingTemplate: !!selectedTemplate,

    // Actions
    setTaskType,
    setTitle,
    setSelectedCourse,
    setDateTime,
    setSaveAsTemplate,
    setShowDatePicker,
    setShowTimePicker,
    setShowCourseModal,
    handleDateChange,
    handleTimeChange,
    handleTemplateSelect,
    handleMyTemplatesPress,
    openTemplateBrowser,
    closeTemplateBrowser,

    // Validation
    isFormValid,
  };
};
