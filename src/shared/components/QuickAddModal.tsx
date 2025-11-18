import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { Course, RootStackParamList } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { Button } from './Button';
import { supabase } from '@/services/supabase';
import { api } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/services/notifications';
import { useTotalTaskCount } from '@/hooks';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { savePendingTask } from '@/utils/taskPersistence';
import { TemplateBrowserModal } from '@/features/templates/components/TemplateBrowserModal';
import { EmptyStateModal } from '@/features/templates/components/EmptyStateModal';
import { useTemplateManagement } from '@/features/templates/hooks/useTemplateManagement';
import { useTemplateSelection } from '@/features/templates/hooks/useTemplateSelection';
import {
  generateTemplateName,
  clearDateFields,
  canSaveAsTemplate,
} from '@/features/templates/utils/templateUtils';

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

  const [taskType, setTaskType] = useState<TaskType>('assignment');
  const [title, setTitle] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [dateTime, setDateTime] = useState<Date>(new Date());
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [showEmptyStateModal, setShowEmptyStateModal] = useState(false);

  const isGuest = !session;

  // Block Quick Add for unauthenticated users - redirect to Auth
  useEffect(() => {
    if (isVisible && isGuest) {
      onClose(); // Close Quick Add modal
      navigation.navigate('Auth', { mode: 'signup' } as any);
    }
  }, [isVisible, isGuest, onClose, navigation]);

  // Fetch courses when modal opens
  useEffect(() => {
    if (isVisible && user) {
      fetchCourses();
    }
  }, [isVisible, user]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isVisible) {
      setTitle('');
      setSelectedCourse(null);
      setDateTime(new Date());
      setTaskType('assignment');
      setSaveAsTemplate(false);
      resetTemplateSelection();
    }
  }, [isVisible, resetTemplateSelection]);

  const fetchCourses = async () => {
    setIsLoadingCourses(true);
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, course_name, course_code, about_course')
        .order('course_name');

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

  const isFormValid = title.trim().length > 0 && selectedCourse;

  // Handle template selection
  const handleTemplateSelect = (template: any) => {
    selectTemplate(template);

    // Pre-fill form with template data
    if (template.template_data) {
      const templateData = clearDateFields(template.template_data);

      // Set task type
      setTaskType(template.task_type);

      // Set title
      if (templateData.title) {
        setTitle(templateData.title);
      } else if (templateData.lecture_name) {
        setTitle(templateData.lecture_name);
      } else if (templateData.topic) {
        setTitle(templateData.topic);
      }

      // Set course if available
      if (templateData.course_id) {
        const course = courses.find(c => c.id === templateData.course_id);
        if (course) {
          setSelectedCourse(course);
        }
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

  const handleQuickSave = async () => {
    if (!isFormValid) return;

    // Handle guest users: save pending task and prompt auth
    if (isGuest) {
      const base = { course: selectedCourse, title: title.trim() };

      try {
        if (taskType === 'assignment') {
          await savePendingTask(
            {
              ...base,
              description: '',
              dueDate: dateTime,
              reminders: [120],
            },
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
        navigation.navigate('Auth', { mode: 'signup' } as any);
      } catch (error) {
        console.error('Error saving pending task:', error);
        Alert.alert('Error', 'Failed to save your progress. Please try again.');
      }
      return;
    }

    // Handle authenticated users: create task immediately
    setIsSaving(true);

    try {
      let taskData: any = {};

      // Create task based on type
      switch (taskType) {
        case 'assignment':
          taskData = {
            course_id: selectedCourse!.id,
            title: title.trim(),
            description: '',
            due_date: dateTime.toISOString(),
            reminders: [120], // Default 2-hour reminder
          };
          await api.mutations.assignments.create(taskData, isOnline, user!.id);
          break;

        case 'lecture':
          const endTime = new Date(dateTime);
          endTime.setHours(endTime.getHours() + 1); // Default 1-hour duration

          taskData = {
            course_id: selectedCourse!.id,
            lecture_name: title.trim(),
            description: '',
            start_time: dateTime.toISOString(),
            end_time: endTime.toISOString(),
            is_recurring: false,
            recurring_pattern: 'none',
            reminders: [30], // Default 30-min reminder
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
            reminders: [15], // Default 15-min reminder
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
          await createTemplate.mutateAsync({
            template_name: generateTemplateName(title.trim()),
            task_type: taskType,
            template_data: taskData,
          });
        } catch (templateError) {
          console.error('Error saving template:', templateError);
          // Don't show error for template creation failure
        }
      }

      // Check if first task for push notification registration
      if (!isTotalTaskCountLoading && isFirstTask && session?.user) {
        await notificationService.registerForPushNotifications(session.user.id);
      }

      // Invalidate queries (including calendar queries so task appears immediately)
      const { invalidateTaskQueries } = await import('@/utils/queryInvalidation');
      await invalidateTaskQueries(queryClient); // No specific type - invalidates all

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
    // Block unauthenticated users from accessing full add flows
    if (isGuest) {
      navigation.navigate('Auth', { mode: 'signup' } as any);
      return;
    }

    if (!isFormValid) {
      Alert.alert(
        'Missing Information',
        'Please fill in task type, title, course, and date/time.',
      );
      return;
    }

    // Prepare data to pass to full modal
    const initialData = {
      course: selectedCourse,
      title,
      dateTime,
    };

    onClose();

    // Navigate to appropriate full modal with pre-filled data
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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Quick Add</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* My Templates Button */}
          <TouchableOpacity
            style={styles.myTemplatesButton}
            onPress={handleMyTemplatesPress}>
            <Text style={styles.myTemplatesButtonText}>My Templates</Text>
          </TouchableOpacity>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}>
            {/* Task Type Selector */}
            <Text style={styles.label}>Task Type *</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  taskType === 'assignment' && styles.typeButtonActive,
                ]}
                onPress={() => setTaskType('assignment')}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={
                    taskType === 'assignment' ? COLORS.primary : COLORS.gray
                  }
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    taskType === 'assignment' && styles.typeButtonTextActive,
                  ]}>
                  Assignment
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  taskType === 'lecture' && styles.typeButtonActive,
                ]}
                onPress={() => setTaskType('lecture')}>
                <Ionicons
                  name="school-outline"
                  size={20}
                  color={taskType === 'lecture' ? COLORS.primary : COLORS.gray}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    taskType === 'lecture' && styles.typeButtonTextActive,
                  ]}>
                  Lecture
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  taskType === 'study_session' && styles.typeButtonActive,
                ]}
                onPress={() => setTaskType('study_session')}>
                <Ionicons
                  name="book-outline"
                  size={20}
                  color={
                    taskType === 'study_session' ? COLORS.primary : COLORS.gray
                  }
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    taskType === 'study_session' && styles.typeButtonTextActive,
                  ]}>
                  Study
                </Text>
              </TouchableOpacity>
            </View>

            {/* Title Input */}
            <Text style={styles.label}>
              {taskType === 'study_session' ? 'Topic *' : 'Title *'}
            </Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={
                taskType === 'assignment'
                  ? 'e.g., Math Homework'
                  : taskType === 'lecture'
                    ? 'e.g., Weekly Lecture'
                    : 'e.g., Review Chapter 5'
              }
              autoFocus
              maxLength={35}
            />
            <Text style={styles.characterCount}>{title.length}/35</Text>

            {/* Course Selector */}
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
                  ? 'Loading...'
                  : selectedCourse?.courseName || 'Select a course'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
            </TouchableOpacity>

            {/* Date & Time */}
            <Text style={styles.label}>
              {taskType === 'assignment'
                ? 'Due Date & Time *'
                : 'Date & Time *'}
            </Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={[styles.dateTimeButton, { flex: 1, marginRight: 8 }]}
                onPress={() => setShowDatePicker(true)}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={COLORS.primary}
                />
                <Text style={styles.dateTimeButtonText}>
                  {format(dateTime, 'MMM dd')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateTimeButton, { flex: 1 }]}
                onPress={() => setShowTimePicker(true)}>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={COLORS.primary}
                />
                <Text style={styles.dateTimeButtonText}>
                  {format(dateTime, 'h:mm a')}
                </Text>
              </TouchableOpacity>
            </View>

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

            {/* Info Text */}
            <View style={styles.infoBox}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.infoText}>
                Quick add creates a task with default settings. Tap "Add More
                Details" to customize reminders, descriptions, and more.
              </Text>
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

        {/* Course Selection Modal */}
        <Modal
          visible={showCourseModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCourseModal(false)}>
          <TouchableOpacity
            style={styles.courseModalOverlay}
            activeOpacity={1}
            onPress={() => setShowCourseModal(false)}>
            <View style={styles.courseModalContent}>
              <Text style={styles.courseModalTitle}>Select Course</Text>
              <ScrollView style={styles.coursesList}>
                {courses.length === 0 ? (
                  <View style={styles.noCourses}>
                    <Text style={styles.noCoursesText}>No courses yet</Text>
                    <Text style={styles.noCoursesSubtext}>
                      Close this and add a course first
                    </Text>
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
          currentTaskType={taskType}
        />

        {/* Empty State Modal */}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
  },
  closeButton: {
    padding: SPACING.xs,
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
  typeSelector: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    gap: 4,
  },
  typeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F5FF',
  },
  typeButtonText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  typeButtonTextActive: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: SPACING.xs,
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
    marginBottom: SPACING.xs,
  },
  selectButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  selectButtonPlaceholder: {
    color: COLORS.gray,
  },
  dateTimeRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    gap: SPACING.xs,
  },
  dateTimeButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F5FF',
    padding: SPACING.sm,
    borderRadius: 8,
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  courseModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseModalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    margin: SPACING.xl,
    maxHeight: '60%',
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  courseModalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  coursesList: {
    maxHeight: 300,
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
    marginTop: 2,
  },
  noCourses: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  noCoursesText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  noCoursesSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
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
  characterCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    textAlign: 'right',
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
});
