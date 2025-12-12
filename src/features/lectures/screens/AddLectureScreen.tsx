import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { RootStackParamList, Course } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import {
  Button,
  TemplateCard,
  CardBasedDateTimePicker,
  ReminderChip,
  Input,
} from '@/shared/components';
import { api } from '@/services/api';
import { supabase } from '@/services/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/services/notifications';
import { useMonthlyTaskCount, useTotalTaskCount } from '@/hooks';
import {
  savePendingTask,
  clearPendingTask,
  getPendingTask,
} from '@/utils/taskPersistence';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { saveDraft, getDraft, clearDraft } from '@/utils/draftStorage';
import { debounce } from '@/utils/debounce';
import { TemplateBrowserModal } from '@/shared/components/TemplateBrowserModal';
import { EmptyStateModal } from '@/shared/components/EmptyStateModal';
import { useTemplateManagement } from '@/shared/hooks/useTemplateManagement';
import { useTemplateSelection } from '@/shared/hooks/useTemplateSelection';
import {
  generateTemplateName,
  clearDateFields,
  canSaveAsTemplate,
} from '@/shared/utils/templateUtils';
import { formatReminderLabel, REMINDER_OPTIONS } from '@/utils/reminderUtils';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLimitCheck } from '@/hooks/useLimitCheck';
import { useUsageLimitPaywall } from '@/contexts/UsageLimitPaywallContext';

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
  const { limitReached, monthlyTaskCount, monthlyLimit } =
    useMonthlyTaskCount();
  const { isFirstTask, isLoading: isTotalTaskCountLoading } =
    useTotalTaskCount();
  const { checkActivityLimit } = useLimitCheck();
  const { showUsageLimitPaywall } = useUsageLimitPaywall();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const isGuest = !session;

  // Template management
  const { createTemplate, hasTemplates } = useTemplateManagement();
  const {
    isTemplateBrowserOpen,
    isUsingTemplate,
    selectedTemplate,
    openTemplateBrowser,
    closeTemplateBrowser,
    selectTemplate,
    resetTemplateSelection,
  } = useTemplateSelection();

  // Get initial data from Quick Add if available
  const initialData = route.params?.initialData;
  const taskToEdit = initialData?.taskToEdit || null;

  // Required fields
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(
    initialData?.course || null,
  );
  const [lectureName, setLectureName] = useState(initialData?.title || '');
  const [startTime, setStartTime] = useState<Date>(() => {
    if (initialData?.dateTime) {
      const date =
        initialData.dateTime instanceof Date
          ? initialData.dateTime
          : new Date(initialData.dateTime);
      return date;
    }
    return new Date();
  });
  const [endTime, setEndTime] = useState<Date>(() => {
    const start = (() => {
      if (initialData?.dateTime) {
        return initialData.dateTime instanceof Date
          ? initialData.dateTime
          : new Date(initialData.dateTime);
      }
      return new Date();
    })();
    const end = new Date(start);
    end.setHours(end.getHours() + 1); // Default 1 hour duration
    return end;
  });

  // Optional fields
  const [venue, setVenue] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [reminders, setReminders] = useState<number[]>([30]); // Default 30-min reminder

  // UI state
  const [showOptionalFields, setShowOptionalFields] = useState(true);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [showEmptyStateModal, setShowEmptyStateModal] = useState(false);

  // Populate form from taskToEdit if present (for editing)
  useEffect(() => {
    if (taskToEdit && taskToEdit.type === 'lecture') {
      // Find the course by courseName
      const course = courses.find(
        c => c.courseName === taskToEdit.courses?.courseName,
      );
      if (course) {
        setSelectedCourse(course);
      }

      // Set lecture name from task (use name, title, or lecture_name if available)
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
      }
      if (taskToEdit.endTime) {
        setEndTime(new Date(taskToEdit.endTime));
      } else if (taskToEdit.date) {
        // If no endTime, set default 1 hour after start
        const end = new Date(taskToEdit.date);
        end.setHours(end.getHours() + 1);
        setEndTime(end);
      }
      // Note: recurrence would need to come from lecture data which isn't in Task type
    }
  }, [taskToEdit, courses]);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      // Skip if we have initial data from Quick Add or taskToEdit
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
        }
        setRecurrence(draft.recurrence || 'none');
        setReminders(draft.reminders || [30]);
      }
    };

    loadDraft();
  }, [initialData, taskToEdit]);

  // Auto-save draft when form data changes (debounced)
  useEffect(() => {
    // Don't auto-save if form is empty
    if (!selectedCourse) return;

    const debouncedSave = debounce(() => {
      saveDraft('lecture', {
        title: lectureName,
        course: selectedCourse,
        dateTime: startTime,
        endTime,
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
    // Ensure end time is after start time
    if (endTime <= time) {
      const newEndTime = new Date(time);
      newEndTime.setHours(newEndTime.getHours() + 1);
      setEndTime(newEndTime);
    }
  };

  const handleEndTimeChange = (time: Date) => {
    setEndTime(time);
  };

  const handleDateChange = (date: Date) => {
    const newStartTime = new Date(date);
    newStartTime.setHours(startTime.getHours());
    newStartTime.setMinutes(startTime.getMinutes());
    setStartTime(newStartTime);

    const newEndTime = new Date(date);
    newEndTime.setHours(endTime.getHours());
    newEndTime.setMinutes(endTime.getMinutes());
    setEndTime(newEndTime);
  };

  const handleRemoveReminder = (minutes: number) => {
    setReminders(reminders.filter(r => r !== minutes));
  };

  const handleAddReminder = () => {
    if (reminders.length >= 2) {
      Alert.alert('Limit Reached', 'You can only add up to 2 reminders.');
      return;
    }
    setShowReminderModal(true);
  };

  const handleSelectReminder = (minutes: number) => {
    if (reminders.includes(minutes)) {
      handleRemoveReminder(minutes);
    } else {
      if (reminders.length < 2) {
        setReminders([...reminders, minutes].sort((a, b) => a - b));
      }
    }
    setShowReminderModal(false);
  };

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      if (isGuest) return;

      setIsLoadingCourses(true);
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('id, course_name, course_code, about_course');

        if (error) throw error;

        const formattedCourses = (data || []).map(course => ({
          id: course.id,
          courseName: course.course_name,
          courseCode: course.course_code,
          aboutCourse: course.about_course,
          userId: user?.id || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })) as Course[];

        setCourses(formattedCourses);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setIsLoadingCourses(false);
      }
    };

    fetchCourses();
  }, [isGuest, user?.id]);

  // Check if form is valid
  const isFormValid =
    selectedCourse &&
    lectureName.trim().length > 0 &&
    startTime &&
    endTime &&
    startTime < endTime;

  // Handle template selection
  const handleTemplateSelect = (template: any) => {
    selectTemplate(template);

    // Pre-fill form with template data
    if (template.template_data) {
      const templateData = clearDateFields(template.template_data);

      // Set lecture name if available
      if (templateData.lecture_name) {
        setLectureName(templateData.lecture_name);
      }

      // Set course if available
      if (templateData.course_id) {
        const course = courses.find(c => c.id === templateData.course_id);
        if (course) {
          setSelectedCourse(course);
        }
      }

      // Set recurrence
      if (templateData.recurrence) {
        setRecurrence(templateData.recurrence);
      }

      // Set reminders
      if (templateData.reminders) {
        setReminders(templateData.reminders);
      }
    }
  };

  // Handle My Templates button press
  const handleMyTemplatesPress = () => {
    if (!hasTemplates()) {
      setShowEmptyStateModal(true);
    } else {
      openTemplateBrowser();
    }
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const newStartTime = new Date(selectedDate);
      newStartTime.setHours(startTime.getHours());
      newStartTime.setMinutes(startTime.getMinutes());
      setStartTime(newStartTime);
    }
  };

  const handleStartTimeChange = (event: any, selectedTime?: Date) => {
    setShowStartTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newStartTime = new Date(startTime);
      newStartTime.setHours(selectedTime.getHours());
      newStartTime.setMinutes(selectedTime.getMinutes());
      setStartTime(newStartTime);

      // Auto-adjust end time to maintain duration
      const duration = endTime.getTime() - startTime.getTime();
      const newEndTime = new Date(newStartTime.getTime() + duration);
      setEndTime(newEndTime);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const newEndTime = new Date(selectedDate);
      newEndTime.setHours(endTime.getHours());
      newEndTime.setMinutes(endTime.getMinutes());
      setEndTime(newEndTime);
    }
  };

  const handleEndTimeChange = (event: any, selectedTime?: Date) => {
    setShowEndTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newEndTime = new Date(endTime);
      newEndTime.setHours(selectedTime.getHours());
      newEndTime.setMinutes(selectedTime.getMinutes());
      setEndTime(newEndTime);
    }
  };

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
          course: selectedCourse,
          title: lectureName,
          startTime,
          endTime,
          recurrence,
          reminders,
        },
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

    // Check activity limit before saving
    const limitCheck = await checkActivityLimit();
    if (!limitCheck.allowed && limitCheck.limitType) {
      showUsageLimitPaywall(
        limitCheck.limitType,
        limitCheck.currentUsage!,
        limitCheck.maxLimit!,
        limitCheck.actionLabel!,
        null, // No pending action - user can retry after upgrade
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
        // Check if task has temp ID and resolve it
        const { isTempId, resolveTaskId } = await import('@/utils/taskCache');

        if (isTempId(taskToEdit.id)) {
          const realId = await resolveTaskId(taskToEdit.id, 'lecture');

          if (realId === taskToEdit.id) {
            // Still a temp ID - task hasn't synced yet
            Alert.alert(
              'Please Wait',
              'This task is still syncing. Please wait a moment before editing, or go online to sync first.',
            );
            setIsSaving(false);
            return;
          }

          // Update taskToEdit with real ID
          taskToEdit.id = realId;
        }

        // Update existing lecture
        // Cancel old notifications before updating
        if (taskToEdit.id) {
          try {
            await notificationService.cancelItemReminders(
              taskToEdit.id,
              'lecture',
            );
          } catch (notifError) {
            console.warn('Failed to cancel old notifications:', notifError);
            // Continue with update even if notification cancellation fails
          }
        }

        await api.mutations.lectures.update(
          taskToEdit.id!,
          taskData,
          isOnline,
          user?.id || '',
        );
      } else {
        // Create new lecture
        await api.mutations.lectures.create(taskData, isOnline, user?.id || '');

        // Save as template if enabled (only for new tasks)
        if (saveAsTemplate && canSaveAsTemplate(taskData, 'lecture')) {
          try {
            await createTemplate.mutateAsync({
              template_name: generateTemplateName(lectureName.trim()),
              task_type: 'lecture',
              template_data: taskData,
            });
          } catch (templateError) {
            console.error('Error saving template:', templateError);
            // Don't show error for template creation failure
          }
        }

        // Check if this is the user's first task
        if (!isTotalTaskCountLoading && isFirstTask && session?.user) {
          await notificationService.registerForPushNotifications(
            session.user.id,
          );
        }
      }

      // Invalidate queries (including calendar queries so task appears immediately)
      const { invalidateTaskQueries } = await import(
        '@/utils/queryInvalidation'
      );
      await invalidateTaskQueries(queryClient, 'lecture');

      // Clear draft on successful save
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

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.isDark ? '#101922' : '#F6F7F8',
          paddingTop: insets.top,
        },
      ]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.isDark ? '#101922' : '#F6F7F8',
            borderBottomColor: theme.isDark ? '#374151' : '#E5E7EB',
          },
        ]}>
        <TouchableOpacity
          onPress={() => {
            clearDraft('lecture');
            navigation.goBack();
          }}
          style={styles.headerButton}>
          <Ionicons
            name="close"
            size={24}
            color={theme.isDark ? '#FFFFFF' : '#111418'}
          />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            { color: theme.isDark ? '#FFFFFF' : '#111418' },
          ]}>
          New Lecture
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}>
        {/* Required Fields Section */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.isDark ? '#FFFFFF' : '#111418' },
            ]}>
            Required Information
          </Text>

          {/* Course Selector */}
          <View style={styles.field}>
            <Text
              style={[
                styles.label,
                { color: theme.isDark ? '#FFFFFF' : '#374151' },
              ]}>
              Course
            </Text>
            <TouchableOpacity
              style={[
                styles.selectButton,
                {
                  backgroundColor: theme.isDark ? '#1C252E' : '#FFFFFF',
                  borderColor: theme.isDark ? '#3B4754' : 'transparent',
                },
              ]}
              onPress={() => setShowCourseModal(true)}
              disabled={isLoadingCourses}>
              <Text
                style={[
                  styles.selectButtonText,
                  {
                    color: !selectedCourse
                      ? theme.isDark
                        ? '#9CA3AF'
                        : '#9CA3AF'
                      : theme.isDark
                        ? '#FFFFFF'
                        : '#111418',
                  },
                ]}>
                {isLoadingCourses
                  ? 'Loading courses...'
                  : selectedCourse?.courseName || 'Select Course'}
              </Text>
              <Ionicons
                name="expand-more"
                size={24}
                color={theme.isDark ? '#FFFFFF' : '#111418'}
              />
            </TouchableOpacity>
          </View>

          {/* Lecture Name Input */}
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text
                style={[
                  styles.label,
                  { color: theme.isDark ? '#FFFFFF' : '#374151' },
                ]}>
                Lecture Name
              </Text>
              <Text
                style={[
                  styles.characterCount,
                  { color: theme.isDark ? '#9CA3AF' : '#6B7280' },
                ]}>
                {lectureName.length}/35
              </Text>
            </View>
            <Input
              value={lectureName}
              onChangeText={setLectureName}
              placeholder="e.g., Introduction to Psychology"
              maxLength={35}
            />
          </View>

          {/* Date & Time */}
          <View style={styles.field}>
            <CardBasedDateTimePicker
              date={startTime}
              startTime={startTime}
              endTime={endTime}
              onDateChange={handleDateChange}
              onStartTimeChange={handleStartTimeChange}
              onEndTimeChange={handleEndTimeChange}
              label="Date & Time"
              mode="range"
              showDuration={true}
            />
          </View>
        </View>

        {/* Divider */}
        <View
          style={[
            styles.divider,
            { backgroundColor: theme.isDark ? '#374151' : '#E5E7EB' },
          ]}
        />

        {/* Optional Fields Section */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.isDark ? '#FFFFFF' : '#111418' },
            ]}>
            Optional Details
          </Text>

          {/* Venue */}
          <View style={styles.field}>
            <Text
              style={[
                styles.label,
                { color: theme.isDark ? '#FFFFFF' : '#374151' },
              ]}>
              Venue
            </Text>
            <View style={styles.venueInputContainer}>
              <Ionicons
                name="location-outline"
                size={20}
                color={theme.isDark ? '#9CA3AF' : '#6B7280'}
                style={styles.venueIcon}
              />
              <TextInput
                style={[
                  styles.venueInput,
                  {
                    backgroundColor: theme.isDark ? '#1C252E' : '#FFFFFF',
                    borderColor: theme.isDark ? '#3B4754' : 'transparent',
                    color: theme.isDark ? '#FFFFFF' : '#111418',
                  },
                ]}
                value={venue}
                onChangeText={setVenue}
                placeholder="e.g., Room 404, Main Building"
                placeholderTextColor={theme.isDark ? '#6B7280' : '#9CA3AF'}
                maxLength={200}
              />
            </View>
          </View>

          {/* Recurrence Pattern */}
          <View style={styles.field}>
            <Text
              style={[
                styles.label,
                { color: theme.isDark ? '#FFFFFF' : '#374151' },
              ]}>
              Recurrence
            </Text>
            <View style={styles.recurrenceGrid}>
              <TouchableOpacity
                style={[
                  styles.recurrenceOption,
                  recurrence === 'none' && styles.recurrenceOptionSelected,
                  {
                    backgroundColor:
                      recurrence === 'none'
                        ? COLORS.primary + '1A'
                        : theme.isDark
                          ? '#1C252E'
                          : '#FFFFFF',
                    borderColor:
                      recurrence === 'none'
                        ? COLORS.primary + '33'
                        : theme.isDark
                          ? '#3B4754'
                          : '#E5E7EB',
                  },
                ]}
                onPress={() => setRecurrence('none')}>
                <Text
                  style={[
                    styles.recurrenceOptionText,
                    {
                      color:
                        recurrence === 'none'
                          ? COLORS.primary
                          : theme.isDark
                            ? '#FFFFFF'
                            : '#111418',
                      fontWeight: recurrence === 'none' ? '600' : '500',
                    },
                  ]}>
                  None
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.recurrenceOption,
                  recurrence === 'weekly' && styles.recurrenceOptionSelected,
                  {
                    backgroundColor:
                      recurrence === 'weekly'
                        ? COLORS.primary + '1A'
                        : theme.isDark
                          ? '#1C252E'
                          : '#FFFFFF',
                    borderColor:
                      recurrence === 'weekly'
                        ? COLORS.primary + '33'
                        : theme.isDark
                          ? '#3B4754'
                          : '#E5E7EB',
                  },
                ]}
                onPress={() => setRecurrence('weekly')}>
                <Text
                  style={[
                    styles.recurrenceOptionText,
                    {
                      color:
                        recurrence === 'weekly'
                          ? COLORS.primary
                          : theme.isDark
                            ? '#FFFFFF'
                            : '#111418',
                      fontWeight: recurrence === 'weekly' ? '600' : '500',
                    },
                  ]}>
                  Weekly
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.recurrenceOption,
                  recurrence === 'bi-weekly' && styles.recurrenceOptionSelected,
                  {
                    backgroundColor:
                      recurrence === 'bi-weekly'
                        ? COLORS.primary + '1A'
                        : theme.isDark
                          ? '#1C252E'
                          : '#FFFFFF',
                    borderColor:
                      recurrence === 'bi-weekly'
                        ? COLORS.primary + '33'
                        : theme.isDark
                          ? '#3B4754'
                          : '#E5E7EB',
                  },
                ]}
                onPress={() => setRecurrence('bi-weekly')}>
                <Text
                  style={[
                    styles.recurrenceOptionText,
                    {
                      color:
                        recurrence === 'bi-weekly'
                          ? COLORS.primary
                          : theme.isDark
                            ? '#FFFFFF'
                            : '#111418',
                      fontWeight: recurrence === 'bi-weekly' ? '600' : '500',
                    },
                  ]}>
                  Bi-weekly
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Reminders */}
          <View style={styles.field}>
            <View style={styles.reminderHeader}>
              <Text
                style={[
                  styles.label,
                  { color: theme.isDark ? '#FFFFFF' : '#374151' },
                ]}>
                Reminders
              </Text>
              <Text
                style={[
                  styles.maxReminders,
                  { color: theme.isDark ? '#9CA3AF' : '#6B7280' },
                ]}>
                Max 2
              </Text>
            </View>
            {reminders.length > 0 && (
              <View style={styles.remindersList}>
                {reminders.map(minutes => (
                  <ReminderChip
                    key={minutes}
                    label={formatReminderLabel(minutes)}
                    onRemove={() => handleRemoveReminder(minutes)}
                  />
                ))}
              </View>
            )}
            <TouchableOpacity
              style={[
                styles.addReminderButton,
                {
                  borderColor: theme.isDark ? '#3B4754' : '#D1D5DB',
                  backgroundColor: theme.isDark ? '#1C252E' : '#FFFFFF',
                },
              ]}
              onPress={handleAddReminder}
              disabled={reminders.length >= 2}>
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={
                  reminders.length >= 2
                    ? theme.isDark
                      ? '#6B7280'
                      : '#9CA3AF'
                    : COLORS.primary
                }
              />
              <Text
                style={[
                  styles.addReminderText,
                  {
                    color:
                      reminders.length >= 2
                        ? theme.isDark
                          ? '#6B7280'
                          : '#9CA3AF'
                        : COLORS.primary,
                  },
                ]}>
                Add Reminder
              </Text>
            </TouchableOpacity>
          </View>

          {/* Template Card */}
          {!isUsingTemplate && (
            <View style={styles.field}>
              <TemplateCard
                title="Save as template"
                description="Reuse these settings later"
                value={saveAsTemplate}
                onValueChange={setSaveAsTemplate}
                icon="bookmark-outline"
                iconColor={COLORS.primary}
                iconBgColor="#E5E7EB"
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.isDark ? '#101922' + 'E6' : '#F6F7F8' + 'E6',
            borderTopColor: theme.isDark ? '#374151' : '#E5E7EB',
            paddingBottom: insets.bottom + 16,
          },
        ]}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!isFormValid || isSaving) && styles.saveButtonDisabled,
            {
              backgroundColor:
                !isFormValid || isSaving
                  ? theme.isDark
                    ? '#1C252E'
                    : '#D1D5DB'
                  : COLORS.primary,
            },
          ]}
          onPress={handleSave}
          disabled={!isFormValid || isSaving}
          activeOpacity={0.8}>
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.saveButtonContent}>
              <Text style={styles.saveButtonText}>Save Lecture</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Reminder Selection Modal */}
      <Modal
        visible={showReminderModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReminderModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReminderModal(false)}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.isDark ? '#1C252E' : '#FFFFFF',
              },
            ]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Select Reminder
            </Text>
            <Text
              style={[
                styles.modalSubtitle,
                { color: theme.isDark ? '#9CA3AF' : '#6B7280' },
              ]}>
              Choose up to 2 reminders
            </Text>
            <ScrollView style={styles.reminderOptionsList}>
              {REMINDER_OPTIONS.map(option => {
                const isSelected = reminders.includes(option.value);
                const isDisabled = !isSelected && reminders.length >= 2;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.reminderOption,
                      isSelected && styles.reminderOptionSelected,
                      {
                        backgroundColor: isSelected
                          ? COLORS.primary + '1A'
                          : 'transparent',
                        borderColor: isSelected
                          ? COLORS.primary + '33'
                          : theme.isDark
                            ? '#374151'
                            : '#E5E7EB',
                      },
                    ]}
                    onPress={() => handleSelectReminder(option.value)}
                    disabled={isDisabled}>
                    <Text
                      style={[
                        styles.reminderOptionText,
                        {
                          color: isSelected
                            ? COLORS.primary
                            : theme.isDark
                              ? '#FFFFFF'
                              : '#111418',
                        },
                        isDisabled && { opacity: 0.5 },
                      ]}>
                      {option.label}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={COLORS.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Course Selection Modal */}
      <Modal
        visible={showCourseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCourseModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCourseModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Course</Text>
            <ScrollView style={styles.coursesList}>
              {courses.length === 0 ? (
                <View style={styles.noCourses}>
                  <Text style={styles.noCoursesText}>No courses yet</Text>
                  <Button
                    title="Add a Course"
                    onPress={() => {
                      setShowCourseModal(false);
                      navigation.navigate('AddCourseFlow');
                    }}
                  />
                </View>
              ) : (
                courses.map(course => (
                  <TouchableOpacity
                    key={course.id}
                    style={[
                      styles.courseOption,
                      selectedCourse?.id === course.id &&
                        styles.courseOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedCourse(course);
                      setShowCourseModal(false);
                    }}>
                    <Text style={styles.courseOptionName}>
                      {course.courseName}
                    </Text>
                    {course.courseCode && (
                      <Text style={styles.courseOptionCode}>
                        {course.courseCode}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Template Browser Modal */}
      <TemplateBrowserModal
        visible={isTemplateBrowserOpen}
        onClose={closeTemplateBrowser}
        onSelectTemplate={handleTemplateSelect}
        currentTaskType="lecture"
      />

      {/* Empty State Modal */}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
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
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.md,
    paddingLeft: SPACING.xs,
  },
  field: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: SPACING.sm,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.normal,
    flex: 1,
  },
  characterCount: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  divider: {
    height: 1,
    marginVertical: SPACING.md,
    marginHorizontal: SPACING.md,
  },
  venueInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  venueIcon: {
    position: 'absolute',
    left: SPACING.md,
    zIndex: 1,
  },
  venueInput: {
    flex: 1,
    height: 48,
    paddingLeft: 44,
    paddingRight: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: FONT_SIZES.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recurrenceGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  recurrenceOption: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recurrenceOptionSelected: {
    borderWidth: 1,
  },
  recurrenceOptionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  maxReminders: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  remindersList: {
    marginBottom: SPACING.sm,
  },
  addReminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addReminderText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  reminderOptionsList: {
    maxHeight: 300,
  },
  reminderOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: SPACING.xs,
  },
  reminderOptionSelected: {
    borderWidth: 1,
  },
  reminderOptionText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    borderTopWidth: 1,
  },
  saveButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: SPACING.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.md,
  },
  dateTimeRow: {
    flexDirection: 'row',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  dateTimeButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  durationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: '#F0F5FF',
    borderRadius: 8,
    gap: SPACING.xs,
  },
  durationText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  optionalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: '#F0F5FF',
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  optionalToggleText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.primary,
  },
  recurrenceOptions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  recurrenceOption: {
    flex: 1,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    alignItems: 'center',
  },
  recurrenceOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F5FF',
  },
  recurrenceOptionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  recurrenceOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    margin: SPACING.xl,
    maxHeight: '70%',
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  coursesList: {
    maxHeight: 400,
  },
  courseOption: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  courseOptionSelected: {
    backgroundColor: '#F0F5FF',
  },
  courseOptionName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.text,
  },
  courseOptionCode: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    marginTop: SPACING.xs,
  },
  noCourses: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  noCoursesText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray,
    marginBottom: SPACING.md,
    textAlign: 'center',
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

export default AddLectureScreen;
