// FILE: src/features/courses/screens/CourseDetailScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCourseDetail } from '@/hooks/useCourseDetail';
import { QueryStateWrapper } from '@/shared/components';
import { supabase } from '@/services/supabase';
import { RootStackParamList } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { coursesApiMutations } from '@/features/courses/services/mutations';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDate } from '@/i18n';
import { DeleteCourseModal } from '@/shared/components';

// Define the route prop type for this screen
type CourseDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  'CourseDetail'
>;
type CourseDetailScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

const CourseDetailScreen = () => {
  const route = useRoute<CourseDetailScreenRouteProp>();
  const navigation = useNavigation<CourseDetailScreenNavigationProp>();
  const { courseId } = route.params;
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const {
    data: course,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useCourseDetail(courseId);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Fetch lectures for this course
  const { data: lectures } = useQuery({
    queryKey: ['courseLectures', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .eq('course_id', courseId)
        .is('deleted_at', null)
        .order('start_time', { ascending: true })
        .limit(1); // Get first lecture for schedule info

      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!courseId,
  });

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    setIsDeleting(true);
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
      console.error(
        'Delete Error:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return formatDate(date, { timeStyle: 'short' });
  };

  const formatRecurrence = (pattern?: string) => {
    if (!pattern || pattern === 'none') return 'Does not repeat';
    if (pattern === 'weekly') return 'Weekly';
    if (pattern === 'bi-weekly') return 'Every 2 Weeks';
    return pattern;
  };

  const getDayOfWeek = (dateString: string) => {
    const date = new Date(dateString);
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return days[date.getDay()];
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            backgroundColor: theme.background,
          },
        ]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Course Details
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('EditCourseModal', { courseId })}
          style={styles.editButton}
          activeOpacity={0.7}
          accessibilityLabel="Edit course"
          accessibilityRole="button">
          <Ionicons name="create-outline" size={24} color="#135bec" />
        </TouchableOpacity>
      </View>

      <QueryStateWrapper
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={course}
        refetch={refetch}
        isRefetching={isRefetching}
        onRefresh={refetch}
        emptyTitle="Course not found"
        emptyMessage="This course may have been deleted or doesn't exist."
        emptyIcon="book-outline">
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={[styles.courseTitle, { color: theme.text }]}>
              {course?.courseName}
            </Text>
            {course?.courseCode && (
              <View style={styles.courseCodeBadge}>
                <Text style={styles.courseCodeText}>{course.courseCode}</Text>
              </View>
            )}
          </View>

          {/* About Section */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.surface || '#FFFFFF' },
            ]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={24} color="#135bec" />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                About this course
              </Text>
            </View>
            <Text
              style={[styles.sectionContent, { color: theme.textSecondary }]}>
              {course?.aboutCourse || 'No description provided.'}
            </Text>
          </View>

          {/* Schedule Section */}
          {lectures && (
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: theme.surface || '#FFFFFF' },
              ]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar" size={24} color="#135bec" />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Schedule
                </Text>
              </View>

              <View style={styles.scheduleItems}>
                {/* Lecture Time */}
                {lectures.start_time && lectures.end_time && (
                  <View style={styles.scheduleItem}>
                    <View
                      style={[
                        styles.scheduleIconContainer,
                        { backgroundColor: theme.background },
                      ]}>
                      <Ionicons
                        name="time-outline"
                        size={20}
                        color={theme.textSecondary || '#64748b'}
                      />
                    </View>
                    <View style={styles.scheduleItemContent}>
                      <Text
                        style={[
                          styles.scheduleItemTitle,
                          { color: theme.text },
                        ]}>
                        {formatTime(lectures.start_time)} -{' '}
                        {formatTime(lectures.end_time)}
                      </Text>
                      <Text
                        style={[
                          styles.scheduleItemLabel,
                          { color: theme.textSecondary },
                        ]}>
                        Lecture Time
                      </Text>
                    </View>
                  </View>
                )}

                {/* Recurrence */}
                {lectures.recurring_pattern &&
                  lectures.recurring_pattern !== 'none' && (
                    <View style={styles.scheduleItem}>
                      <View
                        style={[
                          styles.scheduleIconContainer,
                          { backgroundColor: theme.background },
                        ]}>
                        <Ionicons
                          name="repeat-outline"
                          size={20}
                          color={theme.textSecondary || '#64748b'}
                        />
                      </View>
                      <View style={styles.scheduleItemContent}>
                        <Text
                          style={[
                            styles.scheduleItemTitle,
                            { color: theme.text },
                          ]}>
                          {formatRecurrence(lectures.recurring_pattern)} on{' '}
                          {lectures.start_time
                            ? getDayOfWeek(lectures.start_time) + 's'
                            : ''}
                        </Text>
                        <Text
                          style={[
                            styles.scheduleItemLabel,
                            { color: theme.textSecondary },
                          ]}>
                          Recurrence
                        </Text>
                      </View>
                    </View>
                  )}

                {/* Location */}
                {lectures.venue && (
                  <View style={styles.scheduleItem}>
                    <View
                      style={[
                        styles.scheduleIconContainer,
                        { backgroundColor: theme.background },
                      ]}>
                      <Ionicons
                        name="location-outline"
                        size={20}
                        color={theme.textSecondary || '#64748b'}
                      />
                    </View>
                    <View style={styles.scheduleItemContent}>
                      <Text
                        style={[
                          styles.scheduleItemTitle,
                          { color: theme.text },
                        ]}>
                        {lectures.venue}
                      </Text>
                      <Text
                        style={[
                          styles.scheduleItemLabel,
                          { color: theme.textSecondary },
                        ]}>
                        Location
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Reminders Section - Placeholder for now */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.surface || '#FFFFFF' },
            ]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="notifications" size={24} color="#135bec" />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Revision Reminders
              </Text>
            </View>
            <View style={styles.reminderItems}>
              <View
                style={[
                  styles.reminderItem,
                  { backgroundColor: theme.background },
                ]}>
                <View style={styles.reminderItemLeft}>
                  <Ionicons name="time-outline" size={20} color="#135bec" />
                  <Text
                    style={[styles.reminderItemText, { color: theme.text }]}>
                    1 day before
                  </Text>
                </View>
                <View style={styles.reminderIndicator} />
              </View>
              <View
                style={[
                  styles.reminderItem,
                  { backgroundColor: theme.background },
                ]}>
                <View style={styles.reminderItemLeft}>
                  <Ionicons name="time-outline" size={20} color="#135bec" />
                  <Text
                    style={[styles.reminderItemText, { color: theme.text }]}>
                    1 hour before
                  </Text>
                </View>
                <View style={styles.reminderIndicator} />
              </View>
            </View>
          </View>

          {/* Delete Button */}
          <View style={styles.deleteButtonContainer}>
            <TouchableOpacity
              style={[
                styles.deleteButton,
                {
                  backgroundColor:
                    theme.mode === 'dark' ? '#991b1b20' : '#fee2e2',
                },
              ]}
              onPress={handleDelete}
              disabled={isDeleting}
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
                {isDeleting ? 'Deleting...' : 'Delete Course'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </QueryStateWrapper>

      {/* Delete Course Modal */}
      <DeleteCourseModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        courseName={course?.courseName}
        isLoading={isDeleting}
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
    borderBottomColor: 'transparent',
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.015,
  },
  editButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  headerSection: {
    marginBottom: 24,
  },
  courseTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 38,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  courseCodeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#135bec10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  courseCodeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#135bec',
  },
  sectionCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: -0.015,
  },
  sectionContent: {
    fontSize: 16,
    lineHeight: 24,
  },
  scheduleItems: {
    gap: 16,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  scheduleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleItemContent: {
    flex: 1,
    paddingTop: 4,
  },
  scheduleItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  scheduleItemLabel: {
    fontSize: 14,
  },
  reminderItems: {
    gap: 12,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reminderItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reminderItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  reminderIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  deleteButtonContainer: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  deleteButton: {
    width: '100%',
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CourseDetailScreen;
