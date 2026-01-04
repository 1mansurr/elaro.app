import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useAddCourse } from '@/features/courses/contexts/AddCourseContext';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  savePendingTask,
  getPendingTask,
  clearPendingTask,
} from '@/utils/taskPersistence';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import { ProgressIndicator } from '@/shared/components';
import { useTheme } from '@/hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { invokeEdgeFunctionWithAuth } from '@/utils/invokeEdgeFunction';

const ReminderOptions = [
  { label: '10 minutes before', value: 10 },
  { label: '30 minutes before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '1 day before', value: 1440 },
];

const AddLectureRemindersScreen = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { courseData, updateCourseData, resetCourseData } = useAddCourse();
  const { user, isGuest } = useAuth();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [selectedReminders, setSelectedReminders] = useState<number[]>(
    courseData.reminders || [30],
  );
  const [isLoading, setIsLoading] = useState(false);

  const toggleReminder = (value: number) => {
    setSelectedReminders(prev =>
      prev.includes(value) ? prev.filter(r => r !== value) : [...prev, value],
    );
  };

  const autoCreateTask = async () => {
    try {
      const pendingTask = await getPendingTask();
      if (!pendingTask || pendingTask.taskType !== 'course') return;

      const { taskData } = pendingTask;

      if (!taskData.courseName?.trim()) {
        Alert.alert(
          'Error',
          'Missing required information for the saved course.',
        );
        return;
      }

      setIsLoading(true);

      const { error } = await invokeEdgeFunctionWithAuth('create-course', {
        body: taskData,
      });

      if (error) throw new Error(error.message);

      await clearPendingTask();

      await queryClient.invalidateQueries({ queryKey: ['courses'] });
      await queryClient.invalidateQueries({ queryKey: ['lectures'] });
      await queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });
      await queryClient.invalidateQueries({ queryKey: ['calendarData'] });

      Alert.alert(
        'Success!',
        `${taskData.courseName} has been saved successfully!`,
        [
          {
            text: 'OK',
            onPress: () => {
              resetCourseData();
              navigation.getParent()?.goBack();
            },
          },
        ],
      );
    } catch (error) {
      console.error('Failed to auto-create course:', error);
      const errorTitle = getErrorTitle(error);
      const errorMessage = mapErrorCodeToMessage(error);
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = async () => {
    setIsLoading(true);
    updateCourseData({ reminders: selectedReminders });

    const finalPayload = {
      courseName: courseData.courseName,
      courseCode: courseData.courseCode,
      courseDescription: courseData.courseDescription,
      startTime: courseData.startTime?.toISOString(),
      endTime: courseData.endTime?.toISOString(),
      recurrence: courseData.recurrence,
      venue: courseData.venue,
      reminders: selectedReminders,
    };

    if (isGuest) {
      await savePendingTask(finalPayload, 'course');
      navigation.getParent()?.navigate('Auth', {
        mode: 'signup',
        onAuthSuccess: autoCreateTask,
      } as any);
      setIsLoading(false);
      return;
    }

    try {
      // Validate required fields before making the API call
      if (!finalPayload.courseName?.trim()) {
        Alert.alert('Error', 'Course name is required.');
        setIsLoading(false);
        return;
      }

      if (!finalPayload.startTime || !finalPayload.endTime) {
        Alert.alert('Error', 'Start time and end time are required.');
        setIsLoading(false);
        return;
      }

      const { error, data } = await invokeEdgeFunctionWithAuth(
        'create-course',
        {
          body: finalPayload,
        },
      );

      if (error) {
        console.error('Edge function error:', {
          error,
          message: error.message,
          context: error.context,
          payload: finalPayload,
        });
        throw error;
      }

      Alert.alert(
        'Success!',
        `${finalPayload.courseName} has been added to your schedule.`,
      );

      await queryClient.invalidateQueries({ queryKey: ['courses'] });
      await queryClient.invalidateQueries({ queryKey: ['lectures'] });
      await queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });
      await queryClient.invalidateQueries({ queryKey: ['calendarData'] });

      resetCourseData();

      // Check if user came from AddCourseFirstScreen (to know if we should navigate to PostOnboardingWelcome)
      // NOTE: We only check this to determine if we should REQUEST navigation.
      // PostOnboardingWelcomeScreen itself will decide if it should actually show.
      const hasSeenAddCourseFirst = await AsyncStorage.getItem(
        'hasSeenAddCourseFirstScreen',
      );

      // Get current navigation state to check if we're in a flow
      const parentNav = navigation.getParent();
      const currentRoute =
        parentNav?.getState()?.routes[parentNav?.getState()?.index || 0];

      // If user came from AddCourseFirst and we're still in AddCourseFlow,
      // request navigation to PostOnboardingWelcome.
      // The screen itself will check if it should show and redirect if already seen.
      if (
        hasSeenAddCourseFirst === 'true' &&
        currentRoute?.name === 'AddCourseFlow'
      ) {
        // Request navigation - PostOnboardingWelcomeScreen will enforce its own visibility rules
        if (__DEV__) {
          console.log(
            '✅ [AddLectureRemindersScreen] Requesting navigation to PostOnboardingWelcome after course creation',
          );
        }
        parentNav?.navigate('PostOnboardingWelcome' as any);
      } else {
        // Otherwise go back normally
        if (__DEV__) {
          console.log(
            '✅ [AddLectureRemindersScreen] Course created, going back',
            {
              hasSeenAddCourseFirst,
              currentRoute: currentRoute?.name,
            },
          );
        }
        parentNav?.goBack();
      }
    } catch (err) {
      console.error('Failed to create course and lecture:', err);
      const errorTitle = getErrorTitle(err);
      const errorMessage = mapErrorCodeToMessage(err);
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    updateCourseData({ reminders: selectedReminders });
    navigation.goBack();
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top },
      ]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <ProgressIndicator currentStep={4} totalSteps={4} />
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: theme.text }]}>
          Set Lecture Reminders
        </Text>
        <Text style={[styles.subtitle, { color: '#64748b' }]}>
          When would you like to be notified before each lecture starts?
        </Text>
        <Text style={[styles.subtitle, { color: '#64748b', marginTop: 4 }]}>
          You can select multiple options.
        </Text>

        <View
          style={[
            styles.optionsCard,
            {
              backgroundColor: theme.surface || '#FFFFFF',
              borderColor: theme.border,
            },
          ]}>
          {ReminderOptions.map((option, index) => {
            const isSelected = selectedReminders.includes(option.value);
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionRow,
                  index < ReminderOptions.length - 1 && styles.optionRowBorder,
                  {
                    borderBottomColor: theme.border,
                  },
                ]}
                onPress={() => toggleReminder(option.value)}
                activeOpacity={0.7}>
                <Text style={[styles.optionLabel, { color: theme.text }]}>
                  {option.label}
                </Text>
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: isSelected ? '#135bec' : theme.border,
                      backgroundColor: isSelected ? '#135bec' : 'transparent',
                    },
                  ]}>
                  {isSelected && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.background,
            paddingBottom: insets.bottom + 16,
          },
        ]}>
        <TouchableOpacity
          style={[
            styles.finishButton,
            isLoading && styles.finishButtonDisabled,
          ]}
          onPress={handleFinish}
          disabled={isLoading}
          activeOpacity={0.8}>
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.finishButtonText}>Finish</Text>
          )}
        </TouchableOpacity>
      </View>
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
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 38,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
  },
  optionsCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionRowBorder: {
    borderBottomWidth: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  finishButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#135bec',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishButtonDisabled: {
    opacity: 0.6,
  },
  finishButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

export default AddLectureRemindersScreen;
