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
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { Button, Input, ReminderSelector, GuestAuthModal } from '@/shared/components';
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

type AddStudySessionScreenNavigationProp = StackNavigationProp<RootStackParamList>;
type AddStudySessionScreenRouteProp = RouteProp<RootStackParamList, 'AddStudySessionFlow'>;

const AddStudySessionScreen = () => {
  const navigation = useNavigation<AddStudySessionScreenNavigationProp>();
  const route = useRoute<AddStudySessionScreenRouteProp>();
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
  const [topic, setTopic] = useState(initialData?.title || '');
  const [sessionDate, setSessionDate] = useState<Date>(() => {
    if (initialData?.dateTime) {
      return initialData.dateTime instanceof Date 
        ? initialData.dateTime 
        : new Date(initialData.dateTime);
    }
    return new Date();
  });
  
  // Optional fields
  const [description, setDescription] = useState('');
  const [hasSpacedRepetition, setHasSpacedRepetition] = useState(false);
  const [reminders, setReminders] = useState<number[]>([15]); // Default 15-min reminder
  
  // UI state
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showGuestAuthModal, setShowGuestAuthModal] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [showEmptyStateModal, setShowEmptyStateModal] = useState(false);

  // Populate form from taskToEdit if present (for editing)
  useEffect(() => {
    if (taskToEdit && taskToEdit.type === 'study_session') {
      // Find the course by courseName
      const course = courses.find(c => c.courseName === taskToEdit.courses?.courseName);
      if (course) {
        setSelectedCourse(course);
      }
      
      setTopic(taskToEdit.title || taskToEdit.name || '');
      if (taskToEdit.date) {
        setSessionDate(new Date(taskToEdit.date));
      }
      if (taskToEdit.description) {
        setDescription(taskToEdit.description);
      }
      // Note: hasSpacedRepetition would need to come from study session data
      // which isn't fully available in Task type - this is a limitation
    }
  }, [taskToEdit, courses]);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      // Skip if we have initial data from Quick Add or taskToEdit
      if (initialData || taskToEdit) return;
      
      const draft = await getDraft('study_session');
      if (draft) {
        setSelectedCourse(draft.course);
        setTopic(draft.title);
        if (draft.dateTime) {
          setSessionDate(new Date(draft.dateTime));
        }
        setDescription(draft.description || '');
        setHasSpacedRepetition(draft.hasSpacedRepetition || false);
        setReminders(draft.reminders || [15]);
      }
    };
    
    loadDraft();
  }, [initialData, taskToEdit]);

  // Auto-save draft when form data changes (debounced)
  useEffect(() => {
    // Don't auto-save if form is empty
    if (!topic && !selectedCourse) return;
    
    const debouncedSave = debounce(() => {
      saveDraft('study_session', {
        title: topic,
        course: selectedCourse,
        dateTime: sessionDate,
        description,
        hasSpacedRepetition,
        reminders,
      });
    }, 1000);

    debouncedSave.debounced();

    return () => {
      debouncedSave.cancel();
    };
  }, [topic, selectedCourse, sessionDate, description, hasSpacedRepetition, reminders]);

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
  const isFormValid = selectedCourse && topic.trim().length > 0 && sessionDate;

  // Handle template selection
  const handleTemplateSelect = (template: any) => {
    selectTemplate(template);
    
    // Pre-fill form with template data
    if (template.template_data) {
      const templateData = clearDateFields(template.template_data);
      
      // Set topic
      if (templateData.topic) {
        setTopic(templateData.topic);
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
      
      // Set spaced repetition
      if (templateData.has_spaced_repetition !== undefined) {
        setHasSpacedRepetition(templateData.has_spaced_repetition);
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
      const newSessionDate = new Date(selectedDate);
      newSessionDate.setHours(sessionDate.getHours());
      newSessionDate.setMinutes(sessionDate.getMinutes());
      setSessionDate(newSessionDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newSessionDate = new Date(sessionDate);
      newSessionDate.setHours(selectedTime.getHours());
      newSessionDate.setMinutes(selectedTime.getMinutes());
      setSessionDate(newSessionDate);
    }
  };

  const handleSave = async () => {
    if (!isFormValid) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    if (isGuest) {
      await savePendingTask(
        {
          course: selectedCourse,
          topic,
          description,
          sessionDate,
          hasSpacedRepetition,
          reminders,
        },
        'study_session'
      );
      setShowGuestAuthModal(true);
      return;
    }

    setIsSaving(true);

    try {
      const taskData = {
        course_id: selectedCourse!.id,
        topic: topic.trim(),
        notes: description.trim(),
        session_date: sessionDate.toISOString(),
        has_spaced_repetition: hasSpacedRepetition,
        reminders,
      };

      await api.mutations.studySessions.create(
        taskData,
        isOnline,
        user?.id || ''
      );

      // Save as template if enabled
      if (saveAsTemplate && canSaveAsTemplate(taskData, 'study_session')) {
        try {
          await createTemplate.mutateAsync({
            template_name: generateTemplateName(topic.trim()),
            task_type: 'study_session',
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
      await queryClient.invalidateQueries({ queryKey: ['studySessions'] });
      await queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });

      // Clear draft on successful save
      await clearDraft('study_session');

      Alert.alert('Success', 'Study session created successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Failed to create study session:', error);
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
        if (pendingTask && pendingTask.taskType === 'study_session') {
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
            clearDraft('study_session');
            navigation.goBack();
          }} 
          style={styles.headerButton}
        >
          <Ionicons name="close" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Study Session</Text>
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

          {/* Topic Input */}
          <View style={styles.field}>
            <Text style={styles.label}>Topic *</Text>
            <Input
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g., Chapter 5 Review"
              maxLength={35}
            />
            <Text style={styles.characterCount}>{topic.length}/35</Text>
          </View>

          {/* Session Date & Time */}
          <View style={styles.field}>
            <Text style={styles.label}>Session Date & Time *</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={[styles.dateTimeButton, { flex: 1, marginRight: 8 }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                <Text style={styles.dateTimeButtonText}>
                  {format(sessionDate, 'MMM dd, yyyy')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateTimeButton, { flex: 1 }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                <Text style={styles.dateTimeButtonText}>{format(sessionDate, 'h:mm a')}</Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={sessionDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={sessionDate}
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
            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={styles.textArea}
                value={description}
                onChangeText={setDescription}
                placeholder="Add any notes about this study session..."
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={styles.characterCount}>{description.length}/500</Text>
            </View>

            {/* Spaced Repetition */}
            <View style={styles.field}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabelContainer}>
                  <Text style={styles.label}>Enable Spaced Repetition</Text>
                  <Text style={styles.switchDescription}>
                    Get reminders to review this topic at optimal intervals
                  </Text>
                </View>
                <Switch
                  value={hasSpacedRepetition}
                  onValueChange={setHasSpacedRepetition}
                  trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
                  thumbColor={hasSpacedRepetition ? COLORS.background : '#f4f3f4'}
                />
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
        actionType="Study Session"
      />

      {/* Template Browser Modal */}
      <TemplateBrowserModal
        visible={isTemplateBrowserOpen}
        onClose={closeTemplateBrowser}
        onSelectTemplate={handleTemplateSelect}
        currentTaskType="study_session"
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: SPACING.md,
  },
  switchDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    marginTop: 4,
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

export default AddStudySessionScreen;

