// FILE: src/features/courses/screens/EditCourseModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Platform,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { RootStackParamList } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { coursesApiMutations } from '@/features/courses/services/mutations';
import { useCourseDetail } from '@/hooks/useCourseDetail';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { formatDate } from '@/i18n';
import { DeleteCourseModal } from '@/shared/components';

type EditCourseModalRouteProp = RouteProp<
  RootStackParamList,
  'EditCourseModal'
>;

const EditCourseModal = () => {
  const navigation = useNavigation();
  const route = useRoute<EditCourseModalRouteProp>();
  const { courseId } = route.params;
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  // Fetch course details
  const {
    data: courseData,
    isLoading,
    isError,
    error,
    refetch,
  } = useCourseDetail(courseId);

  // Fetch first lecture for schedule info
  const { data: lecture } = useQuery({
    queryKey: ['courseLecture', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .eq('course_id', courseId)
        .is('deleted_at', null)
        .order('start_time', { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data || null;
    },
    enabled: !!courseId,
  });

  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [aboutCourse, setAboutCourse] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Schedule state
  const [lectureDate, setLectureDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<Date>(new Date());
  const [recurrence, setRecurrence] = useState<'none' | 'weekly' | 'bi-weekly'>(
    'none',
  );

  // Reminders state
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderTiming, setReminderTiming] = useState('1 day before');

  // Picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<'start' | 'end' | null>(
    null,
  );
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Update form fields when course data is loaded
  useEffect(() => {
    if (courseData) {
      setCourseName(courseData.courseName);
      setCourseCode(courseData.courseCode || '');
      setAboutCourse(courseData.aboutCourse || '');
    }
  }, [courseData]);

  // Update schedule when lecture is loaded
  useEffect(() => {
    if (lecture) {
      if (lecture.start_time) {
        const start = new Date(lecture.start_time);
        setLectureDate(start);
        setStartTime(start);
      }
      if (lecture.end_time) {
        setEndTime(new Date(lecture.end_time));
      }
      if (lecture.recurring_pattern) {
        setRecurrence(
          (lecture.recurring_pattern as 'none' | 'weekly' | 'bi-weekly') ||
            'none',
        );
      }
    }
  }, [lecture]);

  const handleSave = async () => {
    if (!courseName.trim()) {
      Alert.alert('Error', 'Course name is required.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    setIsSaving(true);
    try {
      await coursesApiMutations.update(
        courseId,
        {
          course_name: courseName.trim(),
          course_code: courseCode.trim(),
          about_course: aboutCourse.trim(),
        },
        isOnline,
        user.id,
      );

      // TODO: Update lecture schedule if changed
      // This would require a separate lecture update mutation

      navigation.goBack();
    } catch (error) {
      const errorTitle = getErrorTitle(error);
      const errorMessage = mapErrorCodeToMessage(error);
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      setLectureDate(selectedDate);
      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
    } else if (event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  const handleTimeChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
    type?: 'start' | 'end',
  ) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(null);
    }
    if (event.type === 'set' && selectedDate && type) {
      if (type === 'start') {
        setStartTime(selectedDate);
      } else {
        setEndTime(selectedDate);
      }
      if (Platform.OS === 'ios') {
        setShowTimePicker(null);
      }
    } else if (event.type === 'dismissed') {
      setShowTimePicker(null);
    }
  };

  const formatDisplayDate = (date: Date) => {
    return formatDate(date, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDisplayTime = (date: Date) => {
    return formatDate(date, { timeStyle: 'short' });
  };

  const recurrenceOptions: Array<'none' | 'weekly' | 'bi-weekly'> = [
    'weekly',
    'bi-weekly',
  ];

  const reminderOptions = [
    '10 minutes before',
    '30 minutes before',
    '1 hour before',
    '1 day before',
  ];

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    setIsSaving(true);
    try {
      await coursesApiMutations.delete(courseId, isOnline, user.id);

      // Invalidate React Query caches to update UI immediately
      await queryClient.invalidateQueries({ queryKey: ['courses'] });
      await queryClient.invalidateQueries({
        queryKey: ['courseDetail', courseId],
      });
      await queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });
      await queryClient.invalidateQueries({ queryKey: ['calendarData'] });
      await queryClient.invalidateQueries({ queryKey: ['lectures'] });

      setShowDeleteModal(false);
      Alert.alert('Success', 'Course deleted successfully.');
      navigation.goBack();
    } catch (error) {
      const errorTitle = getErrorTitle(error);
      const errorMessage = mapErrorCodeToMessage(error);
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
          },
        ]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
          activeOpacity={0.7}>
          <Text
            style={[
              styles.headerButtonText,
              { color: theme.textSecondary || '#64748b' },
            ]}>
            Cancel
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Edit Course
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.headerButton}
          disabled={isSaving}
          activeOpacity={0.7}>
          <Text
            style={[
              styles.headerButtonText,
              styles.headerButtonTextPrimary,
              { color: '#135bec' },
              isSaving && { opacity: 0.5 },
            ]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Core Info Section */}
        <View style={styles.section}>
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: theme.surface || '#FFFFFF',
                borderColor: theme.border,
              },
            ]}>
            <View style={styles.inputGroup}>
              <Text
                style={[styles.inputLabel, { color: theme.text || '#111827' }]}>
                Course Name
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surface || '#FFFFFF',
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={courseName}
                onChangeText={setCourseName}
                placeholder="e.g. Introduction to Psychology"
                placeholderTextColor={theme.textSecondary || '#9ca3af'}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text
                style={[styles.inputLabel, { color: theme.text || '#111827' }]}>
                Course Code
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surface || '#FFFFFF',
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={courseCode}
                onChangeText={setCourseCode}
                placeholder="e.g. PSY101"
                placeholderTextColor={theme.textSecondary || '#9ca3af'}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text
                style={[styles.inputLabel, { color: theme.text || '#111827' }]}>
                Description
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: theme.surface || '#FFFFFF',
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={aboutCourse}
                onChangeText={setAboutCourse}
                placeholder="Add optional notes..."
                placeholderTextColor={theme.textSecondary || '#9ca3af'}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Schedule Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            SCHEDULE
          </Text>
          <View
            style={[
              styles.scheduleCard,
              {
                backgroundColor: theme.surface || '#FFFFFF',
                borderColor: theme.border,
              },
            ]}>
            {/* Lecture Date */}
            <TouchableOpacity
              style={[
                styles.scheduleRow,
                {
                  borderBottomColor: theme.border,
                },
              ]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}>
              <View style={styles.scheduleRowLeft}>
                <View
                  style={[
                    styles.scheduleIcon,
                    { backgroundColor: '#135bec10' },
                  ]}>
                  <Ionicons name="calendar-outline" size={20} color="#135bec" />
                </View>
                <Text style={[styles.scheduleRowLabel, { color: theme.text }]}>
                  Lecture Date
                </Text>
              </View>
              <Text style={[styles.scheduleRowValue, { color: '#135bec' }]}>
                {formatDisplayDate(lectureDate)}
              </Text>
            </TouchableOpacity>

            {/* Time */}
            <TouchableOpacity
              style={[
                styles.scheduleRow,
                {
                  borderBottomColor: theme.border,
                },
              ]}
              onPress={() => setShowTimePicker('start')}
              activeOpacity={0.7}>
              <View style={styles.scheduleRowLeft}>
                <View
                  style={[
                    styles.scheduleIcon,
                    { backgroundColor: '#135bec10' },
                  ]}>
                  <Ionicons name="time-outline" size={20} color="#135bec" />
                </View>
                <Text style={[styles.scheduleRowLabel, { color: theme.text }]}>
                  Time
                </Text>
              </View>
              <View style={styles.timeDisplay}>
                <View
                  style={[
                    styles.timeBadge,
                    { backgroundColor: theme.background || '#f1f5f9' },
                  ]}>
                  <Text style={[styles.timeBadgeText, { color: theme.text }]}>
                    {formatDisplayTime(startTime)}
                  </Text>
                </View>
                <Text style={{ color: theme.textSecondary }}>-</Text>
                <View
                  style={[
                    styles.timeBadge,
                    { backgroundColor: theme.background || '#f1f5f9' },
                  ]}>
                  <Text style={[styles.timeBadgeText, { color: theme.text }]}>
                    {formatDisplayTime(endTime)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Recurrence */}
            <TouchableOpacity
              style={styles.scheduleRow}
              onPress={() => setShowRecurrenceModal(true)}
              activeOpacity={0.7}>
              <View style={styles.scheduleRowLeft}>
                <View
                  style={[
                    styles.scheduleIcon,
                    { backgroundColor: '#135bec10' },
                  ]}>
                  <Ionicons name="repeat-outline" size={20} color="#135bec" />
                </View>
                <Text style={[styles.scheduleRowLabel, { color: theme.text }]}>
                  Repeat
                </Text>
              </View>
              <View style={styles.scheduleRowRight}>
                <Text
                  style={[
                    styles.scheduleRowValue,
                    { color: theme.textSecondary },
                  ]}>
                  {recurrence === 'none'
                    ? 'Does not repeat'
                    : recurrence === 'weekly'
                      ? 'Weekly'
                      : 'Every 2 Weeks'}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.textSecondary}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reminders Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            REMINDERS
          </Text>
          <View
            style={[
              styles.remindersCard,
              {
                backgroundColor: theme.surface || '#FFFFFF',
                borderColor: theme.border,
              },
            ]}>
            {/* Toggle Switch Row */}
            <View style={styles.reminderToggleRow}>
              <View style={styles.reminderToggleLeft}>
                <View
                  style={[
                    styles.scheduleIcon,
                    { backgroundColor: '#135bec10' },
                  ]}>
                  <Ionicons
                    name="notifications-outline"
                    size={20}
                    color="#135bec"
                  />
                </View>
                <Text style={[styles.scheduleRowLabel, { color: theme.text }]}>
                  Revision Reminders
                </Text>
              </View>
              <Switch
                value={remindersEnabled}
                onValueChange={setRemindersEnabled}
                trackColor={{ false: theme.border, true: '#135bec' }}
                thumbColor="#ffffff"
              />
            </View>

            {/* Reminder Timing */}
            {remindersEnabled && (
              <TouchableOpacity
                style={[
                  styles.scheduleRow,
                  {
                    paddingLeft: 44,
                    borderTopColor: theme.border,
                    borderTopWidth: 1,
                  },
                ]}
                onPress={() => setShowReminderModal(true)}
                activeOpacity={0.7}>
                <Text style={[styles.scheduleRowLabel, { color: theme.text }]}>
                  Remind me
                </Text>
                <View style={styles.scheduleRowRight}>
                  <Text
                    style={[
                      styles.scheduleRowValue,
                      { color: theme.textSecondary },
                    ]}>
                    {reminderTiming}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.textSecondary}
                  />
                </View>
              </TouchableOpacity>
            )}
          </View>
          {remindersEnabled && (
            <Text
              style={[
                styles.reminderHelperText,
                { color: theme.textSecondary },
              ]}>
              You will receive a notification to revise the course material
              before the lecture starts.
            </Text>
          )}
        </View>

        {/* Delete Button */}
        <View style={styles.deleteSection}>
          <TouchableOpacity
            style={[
              styles.deleteButton,
              {
                backgroundColor:
                  theme.mode === 'dark' ? '#991b1b20' : '#fee2e2',
                borderColor:
                  theme.mode === 'dark' ? '#991b1b30' : 'transparent',
              },
            ]}
            onPress={handleDelete}
            activeOpacity={0.8}>
            <Ionicons
              name="trash-outline"
              size={20}
              color={theme.mode === 'dark' ? '#f87171' : '#dc2626'}
            />
            <Text
              style={[
                styles.deleteButtonText,
                {
                  color: theme.mode === 'dark' ? '#f87171' : '#dc2626',
                },
              ]}>
              Delete Course
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={lectureDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={showTimePicker === 'start' ? startTime : endTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(e, date) => handleTimeChange(e, date, showTimePicker)}
        />
      )}

      {/* Recurrence Modal */}
      <Modal
        visible={showRecurrenceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRecurrenceModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRecurrenceModal(false)}>
          <View
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
            onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Select Recurrence
              </Text>
              <TouchableOpacity
                onPress={() => setShowRecurrenceModal(false)}
                style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[
                styles.modalOption,
                recurrence === 'none' && styles.modalOptionSelected,
              ]}
              onPress={() => {
                setRecurrence('none');
                setShowRecurrenceModal(false);
              }}>
              <Text
                style={[
                  styles.modalOptionText,
                  { color: theme.text },
                  recurrence === 'none' && {
                    color: '#135bec',
                    fontWeight: '600',
                  },
                ]}>
                Does not repeat
              </Text>
              {recurrence === 'none' && (
                <Ionicons name="checkmark" size={24} color="#135bec" />
              )}
            </TouchableOpacity>
            {recurrenceOptions.map(option => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.modalOption,
                  recurrence === option && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setRecurrence(option);
                  setShowRecurrenceModal(false);
                }}>
                <Text
                  style={[
                    styles.modalOptionText,
                    { color: theme.text },
                    recurrence === option && {
                      color: '#135bec',
                      fontWeight: '600',
                    },
                  ]}>
                  {option === 'weekly' ? 'Weekly' : 'Every 2 Weeks'}
                </Text>
                {recurrence === option && (
                  <Ionicons name="checkmark" size={24} color="#135bec" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Reminder Timing Modal */}
      <Modal
        visible={showReminderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReminderModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReminderModal(false)}>
          <View
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
            onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Select Reminder Timing
              </Text>
              <TouchableOpacity
                onPress={() => setShowReminderModal(false)}
                style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            {reminderOptions.map(option => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.modalOption,
                  reminderTiming === option && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setReminderTiming(option);
                  setShowReminderModal(false);
                }}>
                <Text
                  style={[
                    styles.modalOptionText,
                    { color: theme.text },
                    reminderTiming === option && {
                      color: '#135bec',
                      fontWeight: '600',
                    },
                  ]}>
                  {option}
                </Text>
                {reminderTiming === option && (
                  <Ionicons name="checkmark" size={24} color="#135bec" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Course Modal */}
      <DeleteCourseModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        courseName={courseData?.courseName}
        isLoading={isSaving}
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
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  headerButton: {
    minWidth: 64,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: 'normal',
    letterSpacing: 0.015,
  },
  headerButtonTextPrimary: {
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.015,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  textArea: {
    width: '100%',
    minHeight: 96,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 15,
    fontSize: 16,
  },
  scheduleCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 56,
    borderBottomWidth: 1,
  },
  scheduleRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  scheduleIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleRowLabel: {
    fontSize: 16,
    fontWeight: 'normal',
  },
  scheduleRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleRowValue: {
    fontSize: 16,
    fontWeight: 'normal',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  timeBadgeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  remindersCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  reminderToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 56,
  },
  reminderToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  reminderHelperText: {
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  deleteSection: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  deleteButton: {
    width: '100%',
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalOptionSelected: {
    backgroundColor: '#135bec10',
  },
  modalOptionText: {
    fontSize: 16,
    flex: 1,
  },
});

export default EditCourseModal;
