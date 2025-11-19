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
import { Button, Input, ReminderSelector } from '@/shared/components';
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
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            clearDraft('assignment');
            navigation.goBack();
          }}
          style={styles.headerButton}>
          <Ionicons name="close" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Assignment</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleSaveAsTemplate}
            style={styles.templateButton}>
            <Ionicons name="library-outline" size={20} color={COLORS.gray} />
            <Text style={styles.templateButtonText}>Save as Template</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            disabled={!isFormValid || isSaving}
            style={[
              styles.headerButton,
              (!isFormValid || isSaving) && styles.headerButtonDisabled,
            ]}>
            {isSaving ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text
                style={[
                  styles.saveButtonText,
                  !isFormValid && styles.saveButtonTextDisabled,
                ]}>
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* My Templates Button */}
      <TouchableOpacity
        style={styles.myTemplatesButton}
        onPress={handleMyTemplatesPress}>
        <Text style={styles.myTemplatesButtonText}>My Templates</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        {/* Required Fields Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Information</Text>

          {/* Course Selector */}
          <View style={styles.field}>
            <Text style={styles.label}>Course *</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowCourseModal(true)}
              disabled={isLoadingCourses}>
              <Text
                style={[
                  styles.selectButtonText,
                  !selectedCourse && styles.selectButtonPlaceholder,
                ]}>
                {isLoadingCourses
                  ? 'Loading courses...'
                  : selectedCourse?.courseName || 'Select a course'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          {/* Title Input */}
          <View style={styles.field}>
            <Text style={styles.label}>Assignment Title *</Text>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Essay on Climate Change"
              maxLength={35}
            />
            <Text style={styles.characterCount}>{title.length}/35</Text>
          </View>

          {/* Due Date & Time */}
          <View style={styles.field}>
            <Text style={styles.label}>Due Date & Time *</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={[styles.dateTimeButton, { flex: 1, marginRight: 8 }]}
                onPress={() => setShowDatePicker(true)}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={COLORS.primary}
                />
                <Text style={styles.dateTimeButtonText}>
                  {format(dueDate, 'MMM dd, yyyy')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateTimeButton, { flex: 1 }]}
                onPress={() => setShowTimePicker(true)}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={COLORS.primary}
                />
                <Text style={styles.dateTimeButtonText}>
                  {format(dueDate, 'h:mm a')}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={dueDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={dueDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
              />
            )}
          </View>
        </View>

        {/* Optional Fields Section */}
        <TouchableOpacity
          style={styles.optionalToggle}
          onPress={() => setShowOptionalFields(!showOptionalFields)}>
          <Text style={styles.optionalToggleText}>Optional Details</Text>
          <Ionicons
            name={showOptionalFields ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={COLORS.primary}
          />
        </TouchableOpacity>

        {showOptionalFields && (
          <View style={styles.section}>
            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={styles.textArea}
                value={description}
                onChangeText={setDescription}
                placeholder="Add any notes or details about this assignment..."
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={styles.characterCount}>
                {description.length}/500
              </Text>
            </View>

            {/* Submission Method */}
            <View style={styles.field}>
              <Text style={styles.label}>Submission Method (Optional)</Text>
              <View style={styles.submissionOptions}>
                <TouchableOpacity
                  style={[
                    styles.submissionOption,
                    submissionMethod === 'Online' &&
                      styles.submissionOptionSelected,
                  ]}
                  onPress={() => setSubmissionMethod('Online')}>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={24}
                    color={
                      submissionMethod === 'Online'
                        ? COLORS.primary
                        : COLORS.gray
                    }
                  />
                  <Text
                    style={[
                      styles.submissionOptionText,
                      submissionMethod === 'Online' &&
                        styles.submissionOptionTextSelected,
                    ]}>
                    Online
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submissionOption,
                    submissionMethod === 'In-person' &&
                      styles.submissionOptionSelected,
                  ]}
                  onPress={() => setSubmissionMethod('In-person')}>
                  <Ionicons
                    name="document-text-outline"
                    size={24}
                    color={
                      submissionMethod === 'In-person'
                        ? COLORS.primary
                        : COLORS.gray
                    }
                  />
                  <Text
                    style={[
                      styles.submissionOptionText,
                      submissionMethod === 'In-person' &&
                        styles.submissionOptionTextSelected,
                    ]}>
                    In-person
                  </Text>
                </TouchableOpacity>

                {submissionMethod && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                      setSubmissionMethod(null);
                      setSubmissionLink('');
                    }}>
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={COLORS.gray}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {submissionMethod === 'Online' && (
                <View style={styles.submissionLinkContainer}>
                  <Input
                    value={submissionLink}
                    onChangeText={setSubmissionLink}
                    placeholder="https://canvas.university.edu/..."
                    keyboardType="url"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}
            </View>

            {/* Reminders */}
            <View style={styles.field}>
              <Text style={styles.label}>Reminders (Optional)</Text>
              <ReminderSelector
                selectedReminders={reminders}
                onSelectionChange={setReminders}
                maxReminders={2}
              />
            </View>

            {/* Save as Template Toggle - Only show when not using a template */}
            {!isUsingTemplate && (
              <View style={styles.saveTemplateContainer}>
                <Switch
                  value={saveAsTemplate}
                  onValueChange={setSaveAsTemplate}
                  trackColor={{ false: '#E5E5E7', true: '#007AFF' }}
                  thumbColor={saveAsTemplate ? '#FFFFFF' : '#FFFFFF'}
                />
                <Text style={styles.saveTemplateText}>
                  Save as template for future use
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

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
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl * 2,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    padding: SPACING.xs,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
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
    padding: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  field: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  selectButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  selectButtonPlaceholder: {
    color: COLORS.gray,
  },
  characterCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    textAlign: 'right',
    marginTop: SPACING.xs,
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
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    textAlignVertical: 'top',
    minHeight: 100,
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
  saveButton: {
    backgroundColor: COLORS.primary,
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
