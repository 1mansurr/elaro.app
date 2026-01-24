import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Course, Lecture } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/services/notifications';
import { useMonthlyTaskCount, useTotalTaskCount } from '@/hooks';
import {
  savePendingTask,
  clearPendingTask,
  getPendingTask,
} from '@/utils/taskPersistence';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import { SPACING } from '@/constants/theme';
import { saveDraft, getDraft, clearDraft } from '@/utils/draftStorage';
import { debounce } from '@/utils/debounce';
import { TemplateBrowserModal } from '@/shared/components/TemplateBrowserModal';
import { EmptyStateModal } from '@/shared/components/EmptyStateModal';
import {
  generateTemplateName,
  clearDateFields,
  canSaveAsTemplate,
} from '@/shared/utils/templateUtils';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLimitCheck } from '@/hooks/useLimitCheck';
import { useUsageLimitPaywall } from '@/contexts/UsageLimitPaywallContext';
import { api } from '@/services/api';
import {
  CourseModal,
  TaskTemplateSection,
  TaskFormFooter,
} from '@/shared/components/task-forms';
import { useCourseSelector } from '@/shared/hooks/task-forms';
import { useReminders } from '@/shared/hooks/task-forms';
import { useTaskTemplate } from '@/shared/hooks/task-forms';
import {
  LectureFormHeader,
  LectureRequiredFields,
  LectureOptionalFields,
  ReminderModal,
} from './components';

type RecurrenceType = 'none' | 'weekly' | 'bi-weekly';
type AddLectureScreenNavigationProp = StackNavigationProp<RootStackParamList>;
type AddLectureScreenRouteProp = RouteProp<
  RootStackParamList,
  'AddLectureFlow'
>;

const AddLectureScreen = () => {
  const navigation = useNavigation<AddLectureScreenNavigationProp>();
  const route = useRoute<AddLectureScreenRouteProp>();
  const { session, user } = useAuth();
  const { isOnline } = useNetwork();
  const queryClient = useQueryClient();
  const { isFirstTask, isLoading: isTotalTaskCountLoading } =
    useTotalTaskCount();
  const { checkActivityLimit } = useLimitCheck();
  const { showUsageLimitPaywall } = useUsageLimitPaywall();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const isGuest = !session;

  // Get initial data from Quick Add if available
  const initialData = route.params?.initialData;
  const taskToEdit = initialData?.taskToEdit || null;

  // Course selector hook
  const { courses, isLoading: isLoadingCourses } = useCourseSelector();

  // Form state
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(
    initialData?.course || null,
  );
  const [lectureName, setLectureName] = useState(initialData?.title || '');
  // Initialize times as null - user must explicitly set them
  const [startTime, setStartTime] = useState<Date | null>(() => {
    if (initialData?.dateTime) {
      const date =
        initialData.dateTime instanceof Date
          ? initialData.dateTime
          : new Date(initialData.dateTime);
      return date;
    }
    return null;
  });
  const [endTime, setEndTime] = useState<Date | null>(() => {
    if (initialData?.dateTime) {
      const date =
        initialData.dateTime instanceof Date
          ? initialData.dateTime
          : new Date(initialData.dateTime);
      const end = new Date(date);
      end.setHours(end.getHours() + 1);
      return end;
    }
    return null;
  });
  const [hasPickedStartTime, setHasPickedStartTime] = useState(false);
  const [hasPickedEndTime, setHasPickedEndTime] = useState(false);
  const [venue, setVenue] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');

  // Reminders hook - no preselected reminders
  const { reminders, addReminder, removeReminder, setReminders } = useReminders(
    {
      maxReminders: 2,
      initialReminders: [],
    },
  );

  // Template hook
  const {
    isTemplateBrowserOpen,
    selectedTemplate,
    openTemplateBrowser,
    closeTemplateBrowser,
    handleTemplateSelect,
    handleSaveAsTemplate,
    hasTemplates,
    handleMyTemplatesPress,
  } = useTaskTemplate({
    taskType: 'lecture',
    courses,
    onTemplateDataLoad: templateData => {
      if (templateData.lecture_name) {
        setLectureName(templateData.lecture_name);
      }
      if (templateData.course_id) {
        const course = courses.find(c => c.id === templateData.course_id);
        if (course) {
          setSelectedCourse(course);
        }
      }
      if (templateData.recurrence) {
        setRecurrence(templateData.recurrence);
      }
      if (templateData.reminders) {
        setReminders(templateData.reminders);
      }
    },
  });

  // UI state
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [showEmptyStateModal, setShowEmptyStateModal] = useState(false);

  // Populate form from taskToEdit if present (for editing)
  useEffect(() => {
    if (taskToEdit && taskToEdit.type === 'lecture') {
      const course = courses.find(
        c => c.courseName === taskToEdit.courses?.courseName,
      );
      if (course) {
        setSelectedCourse(course);
      }

      if (taskToEdit.name) {
        setLectureName(taskToEdit.name);
      } else if (taskToEdit.title) {
        setLectureName(taskToEdit.title);
      } else if ((taskToEdit as any).lecture_name) {
        setLectureName((taskToEdit as any).lecture_name);
      }

      if (taskToEdit.date) {
        setStartTime(new Date(taskToEdit.date));
      }
      if (taskToEdit.startTime) {
        setStartTime(new Date(taskToEdit.startTime));
        setHasPickedStartTime(true);
      }
      if (taskToEdit.endTime) {
        setEndTime(new Date(taskToEdit.endTime));
        setHasPickedEndTime(true);
      } else if (taskToEdit.date) {
        const end = new Date(taskToEdit.date);
        end.setHours(end.getHours() + 1);
        setEndTime(end);
      }
    }
  }, [taskToEdit, courses]);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      if (initialData || taskToEdit) return;

      const draft = await getDraft('lecture');
      if (draft) {
        setSelectedCourse(draft.course);
        if (draft.title) {
          setLectureName(draft.title);
        }
        if (draft.dateTime) {
          setStartTime(new Date(draft.dateTime));
        }
        if (draft.endTime) {
          setEndTime(new Date(draft.endTime));
          setHasPickedEndTime(true);
        }
        if (draft.dateTime) {
          setHasPickedStartTime(true);
        }
        setRecurrence(draft.recurrence || 'none');
        if (draft.reminders) {
          setReminders(draft.reminders);
        }
      }
    };

    loadDraft();
  }, [initialData, taskToEdit, setReminders]);

  // Auto-save draft when form data changes (debounced)
  useEffect(() => {
    if (!selectedCourse) return;

    const debouncedSave = debounce(() => {
      saveDraft('lecture', {
        title: lectureName,
        course: selectedCourse,
        dateTime: startTime || undefined,
        endTime: endTime || undefined,
        venue,
        recurrence,
        reminders,
      });
    }, 1000);

    debouncedSave.debounced();

    return () => {
      debouncedSave.cancel();
    };
  }, [
    selectedCourse,
    lectureName,
    startTime,
    endTime,
    venue,
    recurrence,
    reminders,
  ]);

  const handleStartTimeChange = (time: Date) => {
    setStartTime(time);
    setHasPickedStartTime(true);
    if (endTime && endTime <= time) {
      const newEndTime = new Date(time);
      newEndTime.setHours(newEndTime.getHours() + 1);
      setEndTime(newEndTime);
    }
  };

  const handleEndTimeChange = (time: Date) => {
    setEndTime(time);
    setHasPickedEndTime(true);
  };

  const handleDateChange = (date: Date) => {
    const newStartTime = new Date(date);
    if (startTime) {
      newStartTime.setHours(startTime.getHours());
      newStartTime.setMinutes(startTime.getMinutes());
    }
    setStartTime(newStartTime);
    if (!hasPickedStartTime) {
      setHasPickedStartTime(true);
    }

    const newEndTime = new Date(date);
    if (endTime) {
      newEndTime.setHours(endTime.getHours());
      newEndTime.setMinutes(endTime.getMinutes());
    } else {
      // Default to 1 hour after start if end time not set
      newEndTime.setHours(newStartTime.getHours() + 1);
    }
    setEndTime(newEndTime);
    if (!hasPickedEndTime) {
      setHasPickedEndTime(true);
    }
  };

  const handleAddReminder = () => {
    setShowReminderModal(true);
  };

  const handleSelectReminder = (minutes: number) => {
    if (reminders.includes(minutes)) {
      removeReminder(minutes);
    } else {
      addReminder(minutes);
    }
    setShowReminderModal(false);
  };

  // Check if form is valid
  const isFormValid =
    selectedCourse &&
    lectureName.trim().length > 0 &&
    startTime &&
    endTime &&
    hasPickedStartTime &&
    hasPickedEndTime &&
    startTime < endTime;

  const handleSave = async () => {
    if (!isFormValid) {
      Alert.alert(
        'Missing Information',
        'Please fill in all required fields and ensure start time is before end time.',
      );
      return;
    }

    if (isGuest) {
      await savePendingTask(
        {
          courseId: selectedCourse.id,
          lectureName,
          lectureDate: startTime.toISOString(),
          description: '',
          venue,
          userId: '',
          createdAt: new Date().toISOString(),
        } as Lecture,
        'lecture',
      );
      Alert.alert(
        'Task Saved!',
        'Your task is almost saved! Sign up to complete it.',
      );
      navigation.navigate('Auth', {
        mode: 'signup',
        onAuthSuccess: async () => {
          const pendingTask = await getPendingTask();
          if (pendingTask && pendingTask.taskType === 'lecture') {
            navigation.goBack();
          }
        },
      } as any);
      return;
    }

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
      const taskData = {
        course_id: selectedCourse!.id,
        lecture_name: lectureName.trim(),
        description: `A lecture for the course: ${selectedCourse!.courseName}.`,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        venue: venue.trim() || undefined,
        is_recurring: recurrence !== 'none',
        recurring_pattern: recurrence,
        reminders,
      };

      const isEditing = taskToEdit && taskToEdit.id;

      if (isEditing) {
        const { isTempId, resolveTaskId } = await import('@/utils/taskCache');

        if (isTempId(taskToEdit.id)) {
          const realId = await resolveTaskId(taskToEdit.id, 'lecture');

          if (realId === taskToEdit.id) {
            Alert.alert(
              'Please Wait',
              'This task is still syncing. Please wait a moment before editing, or go online to sync first.',
            );
            setIsSaving(false);
            return;
          }

          taskToEdit.id = realId;
        }

        if (taskToEdit.id) {
          try {
            await notificationService.cancelItemReminders(taskToEdit.id);
          } catch (notifError) {
            console.warn('Failed to cancel old notifications:', notifError);
          }
        }

        await api.mutations.lectures.update(
          taskToEdit.id!,
          taskData,
          isOnline,
          user?.id || '',
        );
      } else {
        await api.mutations.lectures.create(taskData, isOnline, user?.id || '');

        if (saveAsTemplate && canSaveAsTemplate(taskData, 'lecture')) {
          try {
            await handleSaveAsTemplate(
              taskData,
              generateTemplateName(lectureName.trim()),
            );
          } catch (templateError) {
            console.error('Error saving template:', templateError);
          }
        }

        if (!isTotalTaskCountLoading && isFirstTask && session?.user) {
          await notificationService.registerForPushNotifications(
            session.user.id,
          );
        }
      }

      const { invalidateTaskQueries } =
        await import('@/utils/queryInvalidation');
      await invalidateTaskQueries(queryClient, 'lecture');

      await clearDraft('lecture');

      Alert.alert(
        'Success',
        isEditing
          ? 'Lecture updated successfully!'
          : 'Lecture created successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      const isEditing = taskToEdit && taskToEdit.id;
      console.error(
        `Failed to ${isEditing ? 'update' : 'create'} lecture:`,
        error,
      );
      const errorTitle = getErrorTitle(error);
      const errorMessage = mapErrorCodeToMessage(error);
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    clearDraft('lecture');
    navigation.goBack();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#101922' : '#F6F7F8',
          paddingTop: insets.top,
        },
      ]}>
      <LectureFormHeader
        onClose={handleClose}
        onTemplatePress={() =>
          handleMyTemplatesPress(() => setShowEmptyStateModal(true))
        }
        hasTemplates={hasTemplates}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}>
        <LectureRequiredFields
          selectedCourse={selectedCourse}
          onCourseSelect={setSelectedCourse}
          isLoadingCourses={isLoadingCourses}
          courses={courses}
          onOpenCourseModal={() => setShowCourseModal(true)}
          lectureName={lectureName}
          onLectureNameChange={setLectureName}
          startTime={startTime}
          endTime={endTime}
          onStartTimeChange={handleStartTimeChange}
          onEndTimeChange={handleEndTimeChange}
          onDateChange={handleDateChange}
          hasPickedStartTime={hasPickedStartTime}
          hasPickedEndTime={hasPickedEndTime}
        />

        <View
          style={[
            styles.divider,
            { backgroundColor: isDark ? '#374151' : '#E5E7EB' },
          ]}
        />

        <LectureOptionalFields
          venue={venue}
          onVenueChange={setVenue}
          recurrence={recurrence}
          onRecurrenceChange={setRecurrence}
          reminders={reminders}
          onRemindersChange={setReminders}
          onAddReminder={handleAddReminder}
        />

        <TaskTemplateSection
          taskType="lecture"
          onTemplateSelect={handleTemplateSelect}
          onSaveAsTemplate={() => setSaveAsTemplate(true)}
          canSaveAsTemplate={canSaveAsTemplate(
            {
              course_id: selectedCourse?.id,
              lecture_name: lectureName,
              start_time: startTime,
              end_time: endTime,
              venue,
              recurrence,
              reminders,
            },
            'lecture',
          )}
          hasTemplates={hasTemplates}
          onMyTemplatesPress={() =>
            handleMyTemplatesPress(() => setShowEmptyStateModal(true))
          }
          selectedTemplate={selectedTemplate}
        />
      </ScrollView>

      <TaskFormFooter
        isValid={Boolean(isFormValid)}
        onSave={handleSave}
        isSaving={isSaving}
        saveButtonText="Save Lecture"
      />

      {/* Modals */}
      <CourseModal
        visible={showCourseModal}
        courses={courses}
        selectedCourse={selectedCourse}
        onSelect={setSelectedCourse}
        onClose={() => setShowCourseModal(false)}
      />

      <ReminderModal
        visible={showReminderModal}
        selectedReminders={reminders}
        onSelect={handleSelectReminder}
        onClose={() => setShowReminderModal(false)}
        maxReminders={2}
      />

      <TemplateBrowserModal
        visible={isTemplateBrowserOpen}
        onClose={closeTemplateBrowser}
        onSelectTemplate={handleTemplateSelect}
        currentTaskType="lecture"
      />

      <EmptyStateModal
        visible={showEmptyStateModal}
        onClose={() => setShowEmptyStateModal(false)}
        message="You don't have any templates. You can add a template using the toggle at the latter part of the task addition."
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  divider: {
    height: 1,
    marginVertical: SPACING.md,
    marginHorizontal: SPACING.md,
  },
});

export default AddLectureScreen;
