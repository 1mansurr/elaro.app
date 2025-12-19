import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Switch,
  Text,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { Button } from './Button';
import { api } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/services/notifications';
import { useTotalTaskCount } from '@/hooks';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { savePendingTask } from '@/utils/taskPersistence';
import { useLimitCheck } from '@/hooks/useLimitCheck';
import { useUsageLimitPaywall } from '@/contexts/UsageLimitPaywallContext';
import { TemplateBrowserModal } from '@/features/templates/components/TemplateBrowserModal';
import { EmptyStateModal } from '@/features/templates/components/EmptyStateModal';
import {
  generateTemplateName,
  canSaveAsTemplate,
} from '@/features/templates/utils/templateUtils';
import { useCourseSelector } from '@/shared/hooks/task-forms';
import { useTaskTemplate } from '@/shared/hooks/task-forms';
import { CourseModal } from '@/shared/components/task-forms';
import {
  QuickAddModalHeader,
  QuickAddTaskTypeSelector,
  QuickAddFormFields,
  QuickAddInfoBox,
} from './QuickAddModal/components';

type TaskType = 'assignment' | 'lecture' | 'study_session';

interface QuickAddModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isVisible,
  onClose,
}) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user, session } = useAuth();
  const { isOnline } = useNetwork();
  const queryClient = useQueryClient();
  const { isFirstTask, isLoading: isTotalTaskCountLoading } =
    useTotalTaskCount();
  const { checkActivityLimit } = useLimitCheck();
  const { showUsageLimitPaywall } = useUsageLimitPaywall();

  // Course selector
  const { courses, isLoading: isLoadingCourses } = useCourseSelector();

  // Form state
  const [taskType, setTaskType] = useState<TaskType>('assignment');
  const [title, setTitle] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [dateTime, setDateTime] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [showEmptyStateModal, setShowEmptyStateModal] = useState(false);

  // Template hook
  const {
    isTemplateBrowserOpen,
    selectedTemplate,
    openTemplateBrowser,
    closeTemplateBrowser,
    handleTemplateSelect: baseHandleTemplateSelect,
    handleSaveAsTemplate,
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

  const isGuest = !session;

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

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const newDateTime = new Date(selectedDate);
      newDateTime.setHours(dateTime.getHours());
      newDateTime.setMinutes(dateTime.getMinutes());
      setDateTime(newDateTime);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newDateTime = new Date(dateTime);
      newDateTime.setHours(selectedTime.getHours());
      newDateTime.setMinutes(selectedTime.getMinutes());
      setDateTime(newDateTime);
    }
  };

  const handleTemplateSelect = (template: any) => {
    baseHandleTemplateSelect(template);
    closeTemplateBrowser();
  };

  const handleMyTemplatesPress = () => {
    if (!hasTemplates) {
      setShowEmptyStateModal(true);
    } else {
      openTemplateBrowser();
    }
  };

  const isFormValid = title.trim().length > 0 && selectedCourse;

  const handleQuickSave = async () => {
    if (!isFormValid) return;

    // Handle guest users
    if (isGuest) {
      const base = { course: selectedCourse, title: title.trim() };
      try {
        if (taskType === 'assignment') {
          await savePendingTask(
            { ...base, description: '', dueDate: dateTime, reminders: [120] },
            'assignment',
          );
        } else if (taskType === 'lecture') {
          const endTime = new Date(dateTime);
          endTime.setHours(endTime.getHours() + 1);
          await savePendingTask(
            {
              ...base,
              startTime: dateTime,
              endTime,
              recurrence: 'none',
              reminders: [30],
            },
            'lecture',
          );
        } else {
          await savePendingTask(
            {
              ...base,
              topic: title.trim(),
              description: '',
              sessionDate: dateTime,
              hasSpacedRepetition: false,
              reminders: [15],
            },
            'study_session',
          );
        }
        Alert.alert(
          'Task Saved!',
          'Your task is almost saved! Sign up to complete it.',
        );
        navigation.navigate('Auth', { mode: 'signup' });
      } catch (error) {
        console.error('Error saving pending task:', error);
        Alert.alert('Error', 'Failed to save your progress. Please try again.');
      }
      return;
    }

    // Check activity limit
    const limitCheck = await checkActivityLimit();
    if (!limitCheck.allowed && limitCheck.limitType) {
      showUsageLimitPaywall(
        limitCheck.limitType,
        limitCheck.currentUsage!,
        limitCheck.maxLimit!,
        limitCheck.actionLabel!,
        null,
      );
      return;
    }

    setIsSaving(true);

    try {
      type TaskData =
        | {
            course_id: string;
            title: string;
            description: string;
            due_date: string;
            reminders: number[];
          }
        | {
            course_id: string;
            lecture_name: string;
            description: string;
            start_time: string;
            end_time: string;
            is_recurring: boolean;
            recurring_pattern: string;
            reminders: number[];
          }
        | {
            course_id: string;
            topic: string;
            notes: string;
            session_date: string;
            has_spaced_repetition: boolean;
            reminders: number[];
          };

      let taskData: TaskData;

      switch (taskType) {
        case 'assignment':
          taskData = {
            course_id: selectedCourse!.id,
            title: title.trim(),
            description: '',
            due_date: dateTime.toISOString(),
            reminders: [120],
          };
          await api.mutations.assignments.create(taskData, isOnline, user!.id);
          break;

        case 'lecture':
          const endTime = new Date(dateTime);
          endTime.setHours(endTime.getHours() + 1);
          taskData = {
            course_id: selectedCourse!.id,
            lecture_name: title.trim(),
            description: '',
            start_time: dateTime.toISOString(),
            end_time: endTime.toISOString(),
            is_recurring: false,
            recurring_pattern: 'none',
            reminders: [30],
          };
          await api.mutations.lectures.create(taskData, isOnline, user!.id);
          break;

        case 'study_session':
          taskData = {
            course_id: selectedCourse!.id,
            topic: title.trim(),
            notes: '',
            session_date: dateTime.toISOString(),
            has_spaced_repetition: false,
            reminders: [15],
          };
          await api.mutations.studySessions.create(
            taskData,
            isOnline,
            user!.id,
          );
          break;
      }

      // Save as template if enabled
      if (saveAsTemplate && canSaveAsTemplate(taskData, taskType)) {
        try {
          await handleSaveAsTemplate(
            taskData,
            generateTemplateName(title.trim()),
          );
        } catch (templateError) {
          console.error('Error saving template:', templateError);
        }
      }

      // Check if first task for push notification registration
      if (!isTotalTaskCountLoading && isFirstTask && session?.user) {
        await notificationService.registerForPushNotifications(session.user.id);
      }

      // Invalidate queries
      const { invalidateTaskQueries } = await import(
        '@/utils/queryInvalidation'
      );
      await invalidateTaskQueries(queryClient);

      onClose();
      Alert.alert('Success', 'Task created successfully!');
    } catch (error) {
      console.error('Error creating quick task:', error);
      Alert.alert('Error', 'Failed to create task. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMoreDetails = () => {
    if (isGuest) {
      navigation.navigate('Auth', { mode: 'signup' });
      return;
    }

    if (!isFormValid) {
      Alert.alert(
        'Missing Information',
        'Please fill in task type, title, course, and date/time.',
      );
      return;
    }

    const initialData = {
      course: selectedCourse,
      title,
      dateTime,
    };

    onClose();

    switch (taskType) {
      case 'assignment':
        navigation.navigate('AddAssignmentFlow', { initialData });
        break;
      case 'lecture':
        navigation.navigate('AddLectureFlow', { initialData });
        break;
      case 'study_session':
        navigation.navigate('AddStudySessionFlow', { initialData });
        break;
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <QuickAddModalHeader onClose={onClose} />

          {/* My Templates Button */}
          <TouchableOpacity
            style={styles.myTemplatesButton}
            onPress={handleMyTemplatesPress}>
            <Text style={styles.myTemplatesButtonText}>My Templates</Text>
          </TouchableOpacity>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}>
            <Text style={styles.label}>Task Type *</Text>
            <QuickAddTaskTypeSelector
              taskType={taskType}
              onTaskTypeChange={setTaskType}
            />

            <QuickAddFormFields
              taskType={taskType}
              title={title}
              onTitleChange={setTitle}
              selectedCourse={selectedCourse}
              onOpenCourseModal={() => setShowCourseModal(true)}
              isLoadingCourses={isLoadingCourses}
              dateTime={dateTime}
              onOpenDatePicker={() => setShowDatePicker(true)}
              onOpenTimePicker={() => setShowTimePicker(true)}
            />

            {showDatePicker && (
              <DateTimePicker
                value={dateTime}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={dateTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
              />
            )}

            <QuickAddInfoBox />

            {/* Save as Template Toggle */}
            {!selectedTemplate && (
              <View style={styles.saveTemplateContainer}>
                <Switch
                  value={saveAsTemplate}
                  onValueChange={setSaveAsTemplate}
                  trackColor={{ false: '#E5E5E7', true: '#007AFF' }}
                  thumbColor="#FFFFFF"
                />
                <Text style={styles.saveTemplateText}>
                  Save as template for future use
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <Button
              title="Add More Details"
              onPress={handleAddMoreDetails}
              variant="outline"
              disabled={!isFormValid}
              style={{ flex: 1 }}
            />
            <Button
              title="Save"
              onPress={handleQuickSave}
              disabled={!isFormValid || isSaving}
              loading={isSaving}
              style={{ flex: 1 }}
            />
          </View>
        </View>

        {/* Modals */}
        <CourseModal
          visible={showCourseModal}
          courses={courses}
          selectedCourse={selectedCourse}
          onSelect={setSelectedCourse}
          onClose={() => setShowCourseModal(false)}
        />

        <TemplateBrowserModal
          visible={isTemplateBrowserOpen}
          onClose={closeTemplateBrowser}
          onSelectTemplate={handleTemplateSelect}
          currentTaskType={taskType}
        />

        <EmptyStateModal
          visible={showEmptyStateModal}
          onClose={() => setShowEmptyStateModal(false)}
          message="You don't have any templates. You can add a template using the toggle at the latter part of the task addition."
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  scrollView: {
    maxHeight: 400,
  },
  content: {
    padding: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  myTemplatesButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  myTemplatesButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  saveTemplateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  saveTemplateText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    flex: 1,
  },
});
