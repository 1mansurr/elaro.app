import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Button, QueryStateWrapper } from '@/shared/components';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CommonActions } from '@react-navigation/native';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useCourses } from '@/hooks/useDataQueries';
import { supabase } from '@/services/supabase';
import { Alert } from 'react-native';
import { RootStackParamList } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { getPendingTask, clearPendingTask } from '@/utils/taskPersistence';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import { useAuth } from '@/contexts/AuthContext';

type OnboardingCoursesScreenNavigationProp =
  StackNavigationProp<RootStackParamList>;

// Memoized course item component
interface CourseItemData {
  course_name: string;
  course_code?: string;
}
const CourseItem = memo<{ item: CourseItemData }>(({ item }) => (
  <View style={styles.courseItem}>
    <Text style={styles.courseName}>{item.course_name}</Text>
    {item.course_code && (
      <Text style={styles.courseCode}>{item.course_code}</Text>
    )}
  </View>
));

const COURSE_ITEM_HEIGHT = 72;

const OnboardingCoursesScreen = () => {
  const navigation = useNavigation<OnboardingCoursesScreenNavigationProp>();
  const { onboardingData } = useOnboarding();
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  // Get courses directly from React Query with full result object
  const {
    data,
    isLoading: coursesLoading,
    isError,
    error,
    refetch,
  } = useCourses();
  const [isLoading, setIsLoading] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  // Flatten all pages into a single array for onboarding (should only be a few courses)
  const courses = data?.pages.flatMap(page => page.courses) ?? [];

  // Check for pending course on component mount
  useEffect(() => {
    const checkPendingCourse = async () => {
      const pendingTask = await getPendingTask();
      if (pendingTask && pendingTask.taskType === 'course') {
        // Auto-create the course
        try {
          const { error } = await supabase.functions.invoke(
            'create-course-and-lecture',
            {
              body: pendingTask.taskData,
            },
          );

          if (error) throw new Error(error.message);

          // Clear pending data
          await clearPendingTask();

          // Invalidate queries to refresh the courses list
          await queryClient.invalidateQueries({ queryKey: ['courses'] });
          await queryClient.invalidateQueries({ queryKey: ['lectures'] });

          Alert.alert(
            'Welcome!',
            `Your course "${pendingTask.taskData.courseName}" has been automatically created!`,
          );
        } catch (error) {
          console.error('Failed to auto-create course:', error);
          const errorTitle = getErrorTitle(error);
          const errorMessage = mapErrorCodeToMessage(error);
          Alert.alert(
            errorTitle,
            `${errorMessage} You can add the course manually.`,
          );
        }
      }
    };

    checkPendingCourse();
  }, []);

  const handleFinish = async (skipCourses = false) => {
    setIsLoading(true);
    try {
      // The username, university, and program come from the onboarding context
      const {
        username,
        country,
        university,
        program,
        dateOfBirth,
        hasParentalConsent,
      } = onboardingData;
      // The courses now come from our React Query hook, or empty array if skipping
      const finalCourses = skipCourses ? [] : courses || [];

      const { error } = await supabase.functions.invoke('complete-onboarding', {
        body: {
          username,
          country,
          university,
          program,
          courses: finalCourses,
          dateOfBirth,
          hasParentalConsent,
          marketingOptIn,
        },
      });

      if (error) {
        throw error;
      }

      // Refresh user profile to get updated onboarding_completed status
      // Wait a moment for backend to process the update
      await new Promise(resolve => setTimeout(resolve, 500));
      await refreshUser();

      const message = skipCourses
        ? 'Your profile has been saved! You can add courses anytime from the home screen.'
        : 'Your profile has been saved successfully.';
      Alert.alert('Setup Complete!', message);

      // Navigate to main app after successful onboarding completion
      // Use CommonActions.reset() to properly reset navigation stack from nested navigator
      // The AuthenticatedNavigator will automatically show Main when onboarding_completed is true
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        }),
      );
    } catch (error: unknown) {
      console.error('Onboarding completion error:', error);
      const errorTitle = getErrorTitle(error);
      const errorMessage = mapErrorCodeToMessage(error);
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    handleFinish(true);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const listRef = useRef<FlatList<CourseItemData>>(null);

  const renderCourseItem = useCallback(
    ({ item }: { item: any }) => <CourseItem item={item} />,
    [],
  );

  const handleScrollToIndexFailed = useCallback(info => {
    const wait = new Promise(resolve => setTimeout(resolve, 100));
    wait.then(() => {
      if (listRef.current) {
        const targetIndex = Math.min(
          info.highestMeasuredFrameIndex + 1,
          info.index,
        );
        listRef.current.scrollToIndex({
          index: targetIndex,
          animated: true,
        });
      }
    });
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Add Your First Courses</Text>
      <Text style={styles.subtitle}>
        Get a head start by adding up to 3 courses now, or skip this step and
        add them later from the home screen.
      </Text>

      <QueryStateWrapper
        isLoading={coursesLoading}
        isError={isError}
        error={error}
        data={courses}
        refetch={refetch}
        emptyTitle="No courses yet"
        emptyMessage="Start by adding your first course using the button below."
        emptyIcon="school-outline">
        <FlatList
          ref={listRef}
          style={styles.list}
          data={courses || []}
          renderItem={renderCourseItem}
          keyExtractor={(item, index) => index.toString()}
          scrollEnabled={false}
          // Performance optimizations
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          getItemLayout={(_, index) => ({
            length: COURSE_ITEM_HEIGHT,
            offset: COURSE_ITEM_HEIGHT * index,
            index,
          })}
          onScrollToIndexFailed={handleScrollToIndexFailed}
        />
      </QueryStateWrapper>

      {/* Marketing Opt-In Section */}
      <View style={styles.marketingSection}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setMarketingOptIn(!marketingOptIn)}
          activeOpacity={0.7}>
          <View
            style={[styles.checkbox, marketingOptIn && styles.checkboxChecked]}>
            {marketingOptIn && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.checkboxTextContainer}>
            <Text style={styles.checkboxLabel}>
              Yes, send me helpful tips, new feature announcements, and special
              offers from ELARO.
            </Text>
            <Text style={styles.checkboxSubtext}>
              You can change this anytime in your Settings.
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.actionButtonsContainer}>
        <Button
          title="Add a Course"
          onPress={() => navigation.getParent()?.navigate('AddCourseFlow')}
          disabled={(courses?.length || 0) >= 3 || coursesLoading}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Back" onPress={handleBack} variant="outline" />
        <Button
          title={(courses?.length || 0) > 0 ? 'Finish Setup' : 'Skip for Now'}
          onPress={() =>
            (courses?.length || 0) > 0 ? handleFinish(false) : handleSkip()
          }
          loading={isLoading}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#fff' },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: 'gray',
    marginBottom: 30,
  },
  list: { marginBottom: 20 },
  courseItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  courseCode: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  marketingSection: {
    marginTop: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#1a1a1a',
    lineHeight: 22,
  },
  checkboxSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    lineHeight: 18,
  },
  actionButtonsContainer: {
    marginTop: 20,
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10,
  },
});

export default OnboardingCoursesScreen;
