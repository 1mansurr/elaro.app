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
import { savePendingTask, clearPendingTask } from '@/utils/taskPersistence';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

type SubmissionMethod = 'Online' | 'In-person' | null;

type AddAssignmentScreenNavigationProp = StackNavigationProp<RootStackParamList>;
type AddAssignmentScreenRouteProp = RouteProp<RootStackParamList, 'AddAssignmentFlow'>;

const AddAssignmentScreen = () => {
  const navigation = useNavigation<AddAssignmentScreenNavigationProp>();
  const route = useRoute<AddAssignmentScreenRouteProp>();
  const { session, user } = useAuth();
  const { isOnline } = useNetwork();
  const queryClient = useQueryClient();
  const { limitReached, monthlyTaskCount, monthlyLimit } = useMonthlyTaskCount();
  const { isFirstTask, isLoading: isTotalTaskCountLoading } = useTotalTaskCount();

  const isGuest = !session;

  // Required fields
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<Date>(new Date());
  
  // Optional fields
  const [description, setDescription] = useState('');
  const [submissionMethod, setSubmissionMethod] = useState<SubmissionMethod>(null);
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
  const [showGuestAuthModal, setShowGuestAuthModal] = useState(false);

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
  const isFormValid = selectedCourse && title.trim().length > 0 && dueDate > new Date();

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
        'assignment'
      );
      setShowGuestAuthModal(true);
      return;
    }

    setIsSaving(true);

    try {
      await api.mutations.assignments.create(
        {
          course_id: selectedCourse!.id,
          title: title.trim(),
          description: description.trim(),
          submission_method: submissionMethod || undefined,
          submission_link: submissionMethod === 'Online' ? submissionLink.trim() : undefined,
          due_date: dueDate.toISOString(),
          reminders,
        },
        isOnline,
        user?.id || ''
      );

      // Check if this is the user's first task
      if (!isTotalTaskCountLoading && isFirstTask && session?.user) {
        await notificationService.registerForPushNotifications(session.user.id);
      }

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });

      Alert.alert('Success', 'Assignment created successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Failed to create assignment:', error);
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
        // After auth, try to create the assignment from pending data
        const pendingTask = await getPendingTask();
        if (pendingTask && pendingTask.taskType === 'assignment') {
          // Re-trigger save
          navigation.goBack();
        }
      },
    } as any);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="close" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Assignment</Text>
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

          {/* Title Input */}
          <View style={styles.field}>
            <Text style={styles.label}>Assignment Title *</Text>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Essay on Climate Change"
              maxLength={100}
            />
            <Text style={styles.characterCount}>{title.length}/100</Text>
          </View>

          {/* Due Date & Time */}
          <View style={styles.field}>
            <Text style={styles.label}>Due Date & Time *</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={[styles.dateTimeButton, { flex: 1, marginRight: 8 }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                <Text style={styles.dateTimeButtonText}>
                  {format(dueDate, 'MMM dd, yyyy')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateTimeButton, { flex: 1 }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                <Text style={styles.dateTimeButtonText}>{format(dueDate, 'h:mm a')}</Text>
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
              <Text style={styles.characterCount}>{description.length}/500</Text>
            </View>

            {/* Submission Method */}
            <View style={styles.field}>
              <Text style={styles.label}>Submission Method (Optional)</Text>
              <View style={styles.submissionOptions}>
                <TouchableOpacity
                  style={[
                    styles.submissionOption,
                    submissionMethod === 'Online' && styles.submissionOptionSelected,
                  ]}
                  onPress={() => setSubmissionMethod('Online')}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={24}
                    color={submissionMethod === 'Online' ? COLORS.primary : COLORS.gray}
                  />
                  <Text
                    style={[
                      styles.submissionOptionText,
                      submissionMethod === 'Online' && styles.submissionOptionTextSelected,
                    ]}
                  >
                    Online
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submissionOption,
                    submissionMethod === 'In-person' && styles.submissionOptionSelected,
                  ]}
                  onPress={() => setSubmissionMethod('In-person')}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={24}
                    color={submissionMethod === 'In-person' ? COLORS.primary : COLORS.gray}
                  />
                  <Text
                    style={[
                      styles.submissionOptionText,
                      submissionMethod === 'In-person' && styles.submissionOptionTextSelected,
                    ]}
                  >
                    In-person
                  </Text>
                </TouchableOpacity>

                {submissionMethod && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                      setSubmissionMethod(null);
                      setSubmissionLink('');
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color={COLORS.gray} />
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
                onChange={setReminders}
                maxReminders={2}
              />
            </View>
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
        message="Create an account to save your assignment and get reminders!"
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
});

export default AddAssignmentScreen;

