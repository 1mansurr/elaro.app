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
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { Button, ReminderSelector, GuestAuthModal } from '@/shared/components';
import { api } from '@/services/api';
import { supabase } from '@/services/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/services/notifications';
import { useMonthlyTaskCount, useTotalTaskCount } from '@/hooks';
import { savePendingTask, clearPendingTask, getPendingTask } from '@/utils/taskPersistence';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { saveDraft, getDraft, clearDraft } from '@/utils/draftStorage';
import { debounce } from '@/utils/debounce';
import { TemplateBrowserModal } from '@/features/templates/components/TemplateBrowserModal';
import { EmptyStateModal } from '@/features/templates/components/EmptyStateModal';
import { useTemplateManagement } from '@/features/templates/hooks/useTemplateManagement';
import { useTemplateSelection } from '@/features/templates/hooks/useTemplateSelection';
import { generateTemplateName, clearDateFields, canSaveAsTemplate } from '@/features/templates/utils/templateUtils';

type RecurrenceType = 'none' | 'weekly' | 'bi-weekly';
type AddLectureScreenNavigationProp = StackNavigationProp<RootStackParamList>;
type AddLectureScreenRouteProp = RouteProp<RootStackParamList, 'AddLectureFlow'>;

const AddLectureScreen = () => {
  const navigation = useNavigation<AddLectureScreenNavigationProp>();
  const route = useRoute<AddLectureScreenRouteProp>();
  const { session, user } = useAuth();
  const { isOnline } = useNetwork();
  const queryClient = useQueryClient();
  const { limitReached, monthlyTaskCount, monthlyLimit } = useMonthlyTaskCount();
  const { isFirstTask, isLoading: isTotalTaskCountLoading } = useTotalTaskCount();

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
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(initialData?.course || null);
  const [startTime, setStartTime] = useState<Date>(() => {
    if (initialData?.dateTime) {
      const date = initialData.dateTime instanceof Date 
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
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [reminders, setReminders] = useState<number[]>([30]); // Default 30-min reminder
  
  // UI state
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showGuestAuthModal, setShowGuestAuthModal] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [showEmptyStateModal, setShowEmptyStateModal] = useState(false);

  // Populate form from taskToEdit if present (for editing)
  useEffect(() => {
    if (taskToEdit && taskToEdit.type === 'lecture') {
      // Find the course by courseName
      const course = courses.find(c => c.courseName === taskToEdit.courses?.courseName);
      if (course) {
        setSelectedCourse(course);
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
        title: '', // Lectures auto-generate title
        course: selectedCourse,
        dateTime: startTime,
        endTime,
        recurrence,
        reminders,
      });
    }, 1000);

    debouncedSave.debounced();

    return () => {
      debouncedSave.cancel();
    };
  }, [selectedCourse, startTime, endTime, recurrence, reminders]);

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
  const isFormValid = selectedCourse && startTime && endTime && startTime < endTime;

  // Handle template selection
  const handleTemplateSelect = (template: any) => {
    selectTemplate(template);
    
    // Pre-fill form with template data
    if (template.template_data) {
      const templateData = clearDateFields(template.template_data);
      
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
      Alert.alert('Missing Information', 'Please fill in all required fields and ensure start time is before end time.');
      return;
    }

    if (isGuest) {
      await savePendingTask(
        {
          course: selectedCourse,
          startTime,
          endTime,
          recurrence,
          reminders,
        },
        'lecture'
      );
      setShowGuestAuthModal(true);
      return;
    }

    setIsSaving(true);

    try {
      const taskData = {
        course_id: selectedCourse!.id,
        lecture_name: `${selectedCourse!.courseName} Lecture`,
        description: `A lecture for the course: ${selectedCourse!.courseName}.`,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        is_recurring: recurrence !== 'none',
        recurring_pattern: recurrence,
        reminders,
      };

      await api.mutations.lectures.create(
        taskData,
        isOnline,
        user?.id || ''
      );

      // Save as template if enabled
      if (saveAsTemplate && canSaveAsTemplate(taskData, 'lecture')) {
        try {
          await createTemplate.mutateAsync({
            template_name: generateTemplateName(`${selectedCourse!.courseName} Lecture`),
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
        await notificationService.registerForPushNotifications(session.user.id);
      }

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['lectures'] });
      await queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });

      // Clear draft on successful save
      await clearDraft('lecture');

      Alert.alert('Success', 'Lecture created successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Failed to create lecture:', error);
      const errorTitle = getErrorTitle(error);
      const errorMessage = mapErrorCodeToMessage(error);
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGuestAuth = async (mode: 'signup' | 'signin') => {
    setShowGuestAuthModal(false);
    navigation.navigate('Auth', {
      mode,
      onAuthSuccess: async () => {
        const pendingTask = await getPendingTask();
        if (pendingTask && pendingTask.taskType === 'lecture') {
          navigation.goBack();
        }
      },
    } as any);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            clearDraft('lecture');
            navigation.goBack();
          }} 
          style={styles.headerButton}
        >
          <Ionicons name="close" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Lecture</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!isFormValid || isSaving}
          style={[styles.headerButton, (!isFormValid || isSaving) && styles.headerButtonDisabled]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={[styles.saveButtonText, !isFormValid && styles.saveButtonTextDisabled]}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* My Templates Button */}
      <TouchableOpacity style={styles.myTemplatesButton} onPress={handleMyTemplatesPress}>
        <Text style={styles.myTemplatesButtonText}>My Templates</Text>
      </TouchableOpacity>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Required Fields Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Information</Text>

          {/* Course Selector */}
          <View style={styles.field}>
            <Text style={styles.label}>Course *</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowCourseModal(true)}
              disabled={isLoadingCourses}
            >
              <Text
                style={[
                  styles.selectButtonText,
                  !selectedCourse && styles.selectButtonPlaceholder,
                ]}
              >
                {isLoadingCourses
                  ? 'Loading courses...'
                  : selectedCourse?.courseName || 'Select a course'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          {/* Start Date & Time */}
          <View style={styles.field}>
            <Text style={styles.label}>Start Date & Time *</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={[styles.dateTimeButton, { flex: 1, marginRight: 8 }]}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                <Text style={styles.dateTimeButtonText}>
                  {format(startTime, 'MMM dd, yyyy')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateTimeButton, { flex: 1 }]}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                <Text style={styles.dateTimeButtonText}>{format(startTime, 'h:mm a')}</Text>
              </TouchableOpacity>
            </View>

            {showStartDatePicker && (
              <DateTimePicker
                value={startTime}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleStartDateChange}
                minimumDate={new Date()}
              />
            )}

            {showStartTimePicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleStartTimeChange}
              />
            )}
          </View>

          {/* End Date & Time */}
          <View style={styles.field}>
            <Text style={styles.label}>End Date & Time *</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={[styles.dateTimeButton, { flex: 1, marginRight: 8 }]}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                <Text style={styles.dateTimeButtonText}>
                  {format(endTime, 'MMM dd, yyyy')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateTimeButton, { flex: 1 }]}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                <Text style={styles.dateTimeButtonText}>{format(endTime, 'h:mm a')}</Text>
              </TouchableOpacity>
            </View>

            {showEndDatePicker && (
              <DateTimePicker
                value={endTime}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleEndDateChange}
                minimumDate={startTime}
              />
            )}

            {showEndTimePicker && (
              <DateTimePicker
                value={endTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleEndTimeChange}
              />
            )}
          </View>

          {/* Duration Display */}
          {isFormValid && (
            <View style={styles.durationDisplay}>
              <Ionicons name="time" size={16} color={COLORS.gray} />
              <Text style={styles.durationText}>
                Duration: {Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))} minutes
              </Text>
            </View>
          )}
        </View>

        {/* Optional Fields Section */}
        <TouchableOpacity
          style={styles.optionalToggle}
          onPress={() => setShowOptionalFields(!showOptionalFields)}
        >
          <Text style={styles.optionalToggleText}>Optional Details</Text>
          <Ionicons
            name={showOptionalFields ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={COLORS.primary}
          />
        </TouchableOpacity>

        {showOptionalFields && (
          <View style={styles.section}>
            {/* Recurrence Pattern */}
            <View style={styles.field}>
              <Text style={styles.label}>Recurrence (Optional)</Text>
              <View style={styles.recurrenceOptions}>
                <TouchableOpacity
                  style={[
                    styles.recurrenceOption,
                    recurrence === 'none' && styles.recurrenceOptionSelected,
                  ]}
                  onPress={() => setRecurrence('none')}
                >
                  <Text
                    style={[
                      styles.recurrenceOptionText,
                      recurrence === 'none' && styles.recurrenceOptionTextSelected,
                    ]}
                  >
                    One-time
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.recurrenceOption,
                    recurrence === 'weekly' && styles.recurrenceOptionSelected,
                  ]}
                  onPress={() => setRecurrence('weekly')}
                >
                  <Text
                    style={[
                      styles.recurrenceOptionText,
                      recurrence === 'weekly' && styles.recurrenceOptionTextSelected,
                    ]}
                  >
                    Weekly
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.recurrenceOption,
                    recurrence === 'bi-weekly' && styles.recurrenceOptionSelected,
                  ]}
                  onPress={() => setRecurrence('bi-weekly')}
                >
                  <Text
                    style={[
                      styles.recurrenceOptionText,
                      recurrence === 'bi-weekly' && styles.recurrenceOptionTextSelected,
                    ]}
                  >
                    Bi-weekly
                  </Text>
                </TouchableOpacity>
              </View>
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
                <Text style={styles.saveTemplateText}>Save as template for future use</Text>
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
        onRequestClose={() => setShowCourseModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCourseModal(false)}
        >
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
                      selectedCourse?.id === course.id && styles.courseOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedCourse(course);
                      setShowCourseModal(false);
                    }}
                  >
                    <Text style={styles.courseOptionName}>{course.courseName}</Text>
                    {course.courseCode && (
                      <Text style={styles.courseOptionCode}>{course.courseCode}</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Guest Auth Modal */}
      <GuestAuthModal
        isVisible={showGuestAuthModal}
        onClose={() => setShowGuestAuthModal(false)}
        onSignUp={() => handleGuestAuth('signup')}
        onSignIn={() => handleGuestAuth('signin')}
        actionType="Lecture"
      />

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

