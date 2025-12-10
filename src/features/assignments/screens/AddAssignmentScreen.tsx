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
  TextInput,
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
  Input,
  TemplateCard,
  CardBasedDateTimePicker,
  ReminderChip,
  SegmentedControl,
} from '@/shared/components';
import { api } from '@/services/api';
import { supabase } from '@/services/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/services/notifications';
import { useMonthlyTaskCount, useTotalTaskCount } from '@/hooks';
import { savePendingTask, clearPendingTask } from '@/utils/taskPersistence';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { saveDraft, getDraft, clearDraft } from '@/utils/draftStorage';
import { debounce } from '@/utils/debounce';
import { useCreateTemplate } from '@/hooks/useTemplates';
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

type SubmissionMethod = 'Online' | 'In-person' | null;

type AddAssignmentScreenNavigationProp =
  StackNavigationProp<RootStackParamList>;
type AddAssignmentScreenRouteProp = RouteProp<
  RootStackParamList,
  'AddAssignmentFlow'
>;

const AddAssignmentScreen = () => {
  const navigation = useNavigation<AddAssignmentScreenNavigationProp>();
  const route = useRoute<AddAssignmentScreenRouteProp>();
  const { session, user } = useAuth();
  const { isOnline } = useNetwork();
  const queryClient = useQueryClient();
  const { limitReached, monthlyTaskCount, monthlyLimit } =
    useMonthlyTaskCount();
  const { isFirstTask, isLoading: isTotalTaskCountLoading } =
    useTotalTaskCount();

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
  const [title, setTitle] = useState(initialData?.title || '');
  const [dueDate, setDueDate] = useState<Date>(() => {
    if (initialData?.dateTime) {
      return initialData.dateTime instanceof Date
        ? initialData.dateTime
        : new Date(initialData.dateTime);
    }
    return new Date();
  });

  // Optional fields
  const [description, setDescription] = useState('');
  const [submissionMethod, setSubmissionMethod] =
    useState<SubmissionMethod>(null);
  const [submissionLink, setSubmissionLink] = useState('');
  const [reminders, setReminders] = useState<number[]>([120]); // Default 2-hour reminder

  // UI state
  const [showOptionalFields, setShowOptionalFields] = useState(true); // Default to showing optional fields
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [showEmptyStateModal, setShowEmptyStateModal] = useState(false);

  const createTemplateMutation = useCreateTemplate();

  // Populate form from taskToEdit if present (for editing)
  useEffect(() => {
    if (taskToEdit && taskToEdit.type === 'assignment') {
      // Find the course by courseName
      const course = courses.find(
        c => c.courseName === taskToEdit.courses?.courseName,
      );
      if (course) {
        setSelectedCourse(course);
      }

      setTitle(taskToEdit.title || taskToEdit.name || '');
      if (taskToEdit.date) {
        setDueDate(new Date(taskToEdit.date));
      }
      if (taskToEdit.description) {
        setDescription(taskToEdit.description);
      }
      // Note: submissionMethod and submissionLink would need to come from the assignment data
      // which isn't fully available in Task type - this is a limitation
    }
  }, [taskToEdit, courses]);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      // Skip if we have initial data from Quick Add or taskToEdit
      if (initialData || taskToEdit) return;

      const draft = await getDraft('assignment');
      if (draft) {
        setSelectedCourse(draft.course);
        setTitle(draft.title);
        if (draft.dateTime) {
          setDueDate(new Date(draft.dateTime));
        }
        setDescription(draft.description || '');
        setSubmissionMethod(draft.submissionMethod || null);
        setSubmissionLink(draft.submissionLink || '');
        setReminders(draft.reminders || [120]);
      }
    };

    loadDraft();
  }, [initialData, taskToEdit]);

  // Auto-save draft when form data changes (debounced)
  useEffect(() => {
    // Don't auto-save if form is empty
    if (!title && !selectedCourse) return;

    const debouncedSave = debounce(() => {
      saveDraft('assignment', {
        title,
        course: selectedCourse,
        dateTime: dueDate,
        description,
        submissionMethod,
        submissionLink,
        reminders,
      });
    }, 1000);

    debouncedSave.debounced();

    return () => {
      debouncedSave.cancel();
    };
  }, [
    title,
    selectedCourse,
    dueDate,
    description,
    submissionMethod,
    submissionLink,
    reminders,
  ]);

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
    selectedCourse && title.trim().length > 0 && dueDate > new Date();

  // Handle template selection
  const handleTemplateSelect = (template: any) => {
    selectTemplate(template);

    // Pre-fill form with template data
    if (template.template_data) {
      const templateData = clearDateFields(template.template_data);

      // Set title
      if (templateData.title) {
        setTitle(templateData.title);
      }

      // Set course if available
      if (templateData.course_id) {
        const course = courses.find(c => c.id === templateData.course_id);
        if (course) {
          setSelectedCourse(course);
        }
      }

      // Set description
      if (templateData.description) {
        setDescription(templateData.description);
      }

      // Set submission method and link
      if (templateData.submission_method) {
        setSubmissionMethod(templateData.submission_method);
      }
      if (templateData.submission_link) {
        setSubmissionLink(templateData.submission_link);
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

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const newDueDate = new Date(selectedDate);
      newDueDate.setHours(dueDate.getHours());
      newDueDate.setMinutes(dueDate.getMinutes());
      setDueDate(newDueDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newDueDate = new Date(dueDate);
      newDueDate.setHours(selectedTime.getHours());
      newDueDate.setMinutes(selectedTime.getMinutes());
      setDueDate(newDueDate);
    }
  };

  const handleSaveAsTemplate = () => {
    setShowTemplateModal(true);
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }

    try {
      await createTemplateMutation.mutateAsync({
        template_name: templateName.trim(),
        task_type: 'assignment',
        template_data: {
          title,
          course: selectedCourse,
          dateTime: dueDate,
          description,
          submissionMethod,
          submissionLink,
          reminders,
        },
      });

      Alert.alert('Success', 'Template saved successfully!');
      setShowTemplateModal(false);
      setTemplateName('');
    } catch (error) {
      console.error('Failed to create template:', error);
      Alert.alert('Error', 'Failed to save template. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!isFormValid) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    if (isGuest) {
      // Save task for later and prompt sign up
      await savePendingTask(
        {
          course: selectedCourse,
          title,
          description,
          dueDate,
          submissionMethod,
          submissionLink,
          reminders,
        },
        'assignment',
      );
      Alert.alert(
        'Task Saved!',
        'Your task is almost saved! Sign up to complete it.',
      );
      navigation.navigate('Auth', {
        mode: 'signup',
        onAuthSuccess: async () => {
          const pendingTask = await getPendingTask();
          if (pendingTask && pendingTask.taskType === 'assignment') {
            navigation.goBack();
          }
        },
      } as any);
      return;
    }

    setIsSaving(true);

    try {
      const taskData = {
        course_id: selectedCourse!.id,
        title: title.trim(),
        description: description.trim(),
        submission_method: submissionMethod || undefined,
        submission_link:
          submissionMethod === 'Online' ? submissionLink.trim() : undefined,
        due_date: dueDate.toISOString(),
        reminders,
      };

      const isEditing = taskToEdit && taskToEdit.id;

      if (isEditing) {
        // Check if task has temp ID and resolve it
        const { isTempId, resolveTaskId } = await import('@/utils/taskCache');

        if (isTempId(taskToEdit.id)) {
          const realId = await resolveTaskId(taskToEdit.id, 'assignment');

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

        // Update existing assignment
        // Cancel old notifications before updating
        if (taskToEdit.id) {
          try {
            await notificationService.cancelItemReminders(
              taskToEdit.id,
              'assignment',
            );
          } catch (notifError) {
            console.warn('Failed to cancel old notifications:', notifError);
            // Continue with update even if notification cancellation fails
          }
        }

        await api.mutations.assignments.update(
          taskToEdit.id!,
          taskData,
          isOnline,
          user?.id || '',
        );
      } else {
        // Create new assignment
        await api.mutations.assignments.create(
          taskData,
          isOnline,
          user?.id || '',
        );

        // Save as template if enabled (only for new tasks)
        if (saveAsTemplate && canSaveAsTemplate(taskData, 'assignment')) {
          try {
            await createTemplate.mutateAsync({
              template_name: generateTemplateName(title.trim()),
              task_type: 'assignment',
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
      await invalidateTaskQueries(queryClient, 'assignment');

      // Clear draft on successful save
      await clearDraft('assignment');

      Alert.alert(
        'Success',
        isEditing
          ? 'Assignment updated successfully!'
          : 'Assignment created successfully!',
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
        `Failed to ${isEditing ? 'update' : 'create'} assignment:`,
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
        { backgroundColor: theme.isDark ? '#101922' : '#F6F7F8' },
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
            clearDraft('assignment');
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
          New Assignment
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

          {/* Title Input */}
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text
                style={[
                  styles.label,
                  { color: theme.isDark ? '#FFFFFF' : '#374151' },
                ]}>
                Assignment Title
              </Text>
              <Text
                style={[
                  styles.characterCount,
                  { color: theme.isDark ? '#9CA3AF' : '#6B7280' },
                ]}>
                {title.length}/35
              </Text>
            </View>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., History Essay"
              maxLength={35}
            />
          </View>

          {/* Due Date & Time */}
          <View style={styles.field}>
            <CardBasedDateTimePicker
              date={dueDate}
              time={dueDate}
              onDateChange={handleDateChange}
              onTimeChange={handleTimeChange}
              label="Due Date & Time"
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

          {/* Description */}
          <View style={styles.field}>
            <Text
              style={[
                styles.label,
                { color: theme.isDark ? '#FFFFFF' : '#374151' },
              ]}>
              Description
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: theme.isDark ? '#1C252E' : '#FFFFFF',
                  borderColor: theme.isDark ? '#3B4754' : 'transparent',
                  color: theme.isDark ? '#FFFFFF' : '#111418',
                },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add notes, requirements, or details..."
              placeholderTextColor={theme.isDark ? '#6B7280' : '#9CA3AF'}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
            <View style={styles.characterCountContainer}>
              <Text
                style={[
                  styles.characterCount,
                  { color: theme.isDark ? '#9CA3AF' : '#6B7280' },
                ]}>
                {description.length}/500
              </Text>
            </View>
          </View>

          {/* Submission Method */}
          <View style={styles.field}>
            <Text
              style={[
                styles.label,
                { color: theme.isDark ? '#FFFFFF' : '#374151' },
              ]}>
              Submission Method
            </Text>
            <SegmentedControl
              options={[
                { label: 'Online', value: 'Online', icon: 'wifi-outline' },
                { label: 'In-Person', value: 'In-person', icon: 'school-outline' },
              ]}
              selectedValue={submissionMethod}
              onValueChange={value => setSubmissionMethod(value as SubmissionMethod)}
            />
          </View>

          {/* Submission Link - Only show when Online is selected */}
          {submissionMethod === 'Online' && (
            <View style={styles.field}>
              <Text
                style={[
                  styles.label,
                  { color: theme.isDark ? '#FFFFFF' : '#374151' },
                ]}>
                Submission Link
              </Text>
              <View style={styles.linkInputContainer}>
                <Ionicons
                  name="link-outline"
                  size={20}
                  color={theme.isDark ? '#9CA3AF' : '#6B7280'}
                  style={styles.linkIcon}
                />
                <TextInput
                  style={[
                    styles.linkInput,
                    {
                      backgroundColor: theme.isDark ? '#1C252E' : '#FFFFFF',
                      borderColor: theme.isDark ? '#3B4754' : 'transparent',
                      color: theme.isDark ? '#FFFFFF' : '#111418',
                    },
                  ]}
                  value={submissionLink}
                  onChangeText={setSubmissionLink}
                  placeholder="https://"
                  placeholderTextColor={theme.isDark ? '#6B7280' : '#9CA3AF'}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
          )}

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
            backgroundColor: theme.isDark
              ? '#101922' + 'E6'
              : '#F6F7F8' + 'E6',
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
            <Text style={styles.saveButtonText}>Save Assignment</Text>
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
            <Text
              style={[
                styles.modalTitle,
                { color: theme.text },
              ]}>
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
                const isDisabled =
                  !isSelected && reminders.length >= 2;
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

      {/* Save as Template Modal */}
      <Modal
        visible={showTemplateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTemplateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save as Template</Text>
            <Text style={styles.modalMessage}>
              Give this template a name so you can reuse it later.
            </Text>

            <TextInput
              style={styles.templateInput}
              placeholder="e.g., Weekly Math Homework"
              value={templateName}
              onChangeText={setTemplateName}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowTemplateModal(false);
                  setTemplateName('');
                }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleCreateTemplate}
                disabled={
                  !templateName.trim() || createTemplateMutation.isPending
                }>
                <Text style={styles.saveButtonText}>
                  {createTemplateMutation.isPending
                    ? 'Saving...'
                    : 'Save Template'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Template Browser Modal */}
      <TemplateBrowserModal
        visible={isTemplateBrowserOpen}
        onClose={closeTemplateBrowser}
        onSelectTemplate={handleTemplateSelect}
        currentTaskType="assignment"
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
  saveButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.primary,
  },
  saveButtonTextDisabled: {
    color: COLORS.gray,
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
  characterCountContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.xs,
  },
  divider: {
    height: 1,
    marginVertical: SPACING.md,
    marginHorizontal: SPACING.md,
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
  textArea: {
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    textAlignVertical: 'top',
    minHeight: 100,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  linkInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  linkIcon: {
    position: 'absolute',
    left: SPACING.md,
    zIndex: 1,
  },
  linkInput: {
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
  submissionOptions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  submissionOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    gap: SPACING.xs,
  },
  submissionOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F5FF',
  },
  submissionOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray,
  },
  submissionOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  clearButton: {
    padding: SPACING.xs,
  },
  submissionLinkContainer: {
    marginTop: SPACING.sm,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
    backgroundColor: COLORS.border,
    gap: 4,
  },
  templateButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
    marginBottom: SPACING.sm,
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
  saveButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#FFFFFF',
  },
  modalMessage: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  templateInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
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

export default AddAssignmentScreen;
