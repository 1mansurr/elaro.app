import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AddLectureStackParamList } from '@/navigation/AddLectureNavigator';
import { useAddLecture } from '@/features/lectures/contexts/AddLectureContext';
import { Button, ReminderSelector, GuestAuthModal } from '@/shared/components';
import { api } from '@/services/api';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { subMinutes } from 'date-fns';
import { notificationService } from '@/services/notifications';
import { useMonthlyTaskCount } from '@/hooks/useWeeklyTaskCount';
import { useTotalTaskCount } from '@/hooks';
import { savePendingTask, getPendingTask, clearPendingTask } from '@/utils/taskPersistence';

type RemindersScreenNavigationProp = StackNavigationProp<AddLectureStackParamList, 'Reminders'>;

const RemindersScreen = () => {
  const navigation = useNavigation<RemindersScreenNavigationProp>();
  const { lectureData, updateLectureData, resetLectureData } = useAddLecture();
  const { session, user } = useAuth();
  const queryClient = useQueryClient();
  const { limitReached, monthlyTaskCount, monthlyLimit, isLoading: isTaskLimitLoading } = useMonthlyTaskCount();
  const { isFirstTask, isLoading: isTotalTaskCountLoading } = useTotalTaskCount();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showGuestAuthModal, setShowGuestAuthModal] = useState(false);
  

  const isGuest = !session;
  const maxReminders = 2; // This should come from a user context later

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSkip = async () => {
    await createLecture([]); // Create lecture with no reminders
  };

  const handleCloseGuestAuthModal = () => {
    setShowGuestAuthModal(false);
  };

  // Add auto-save function
  const autoCreateTask = async () => {
    try {
      const pendingTask = await getPendingTask();
      if (!pendingTask || pendingTask.taskType !== 'lecture') return;

      const { taskData } = pendingTask;
      
      if (!taskData.course || !taskData.startTime || !taskData.endTime) {
        Alert.alert('Error', 'Missing required information for the saved task.');
        return;
      }

      setIsLoading(true);

      // Create the lecture using the new API layer
      const newLecture = await api.mutations.lectures.create({
        course_id: taskData.course.id,
        lecture_name: `${taskData.course.courseName} Lecture`,
        description: `A lecture for the course: ${taskData.course.courseName}.`,
        start_time: taskData.startTime.toISOString(),
        end_time: taskData.endTime.toISOString(),
        is_recurring: taskData.recurrence !== 'none',
        recurring_pattern: taskData.recurrence,
        reminders: taskData.reminders,
      });

      // Clear pending data
      await clearPendingTask();

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['lectures'] });
      await queryClient.invalidateQueries({ queryKey: ['assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['studySessions'] });

      Alert.alert('Success!', 'Your lecture has been saved successfully!', [
        {
          text: 'OK',
          onPress: () => {
            resetLectureData();
            navigation.getParent()?.goBack();
          }
        }
      ]);

    } catch (error) {
      console.error('Failed to auto-create lecture:', error);
      Alert.alert('Error', 'Failed to save your lecture. Please try creating it again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestSignUp = async () => {
    setShowGuestAuthModal(false);
    (navigation as any).navigate('Auth', { 
      mode: 'signup',
      onAuthSuccess: autoCreateTask
    });
  };

  const handleGuestSignIn = async () => {
    setShowGuestAuthModal(false);
    (navigation as any).navigate('Auth', { 
      mode: 'signin',
      onAuthSuccess: autoCreateTask
    });
  };

  const createLecture = async (reminders: number[]) => {
    if (isGuest) {
      // Save current task data before showing modal
      await savePendingTask(
        { 
          ...lectureData, 
          reminders 
        }, 
        'lecture'
      );
      setShowGuestAuthModal(true);
      return;
    }

    if (!lectureData.course || !lectureData.startTime || !lectureData.endTime) {
      Alert.alert('Error', 'Missing required information. Please go back and complete all steps.');
      return;
    }

    setIsLoading(true);

    try {
      // Create the lecture using the new API layer
      const newLecture = await api.mutations.lectures.create({
        course_id: lectureData.course.id,
        // Auto-generate the lecture name from the course name.
        lecture_name: `${lectureData.course.courseName} Lecture`,
        // Auto-generate a simple description.
        description: `A lecture for the course: ${lectureData.course.courseName}.`,
        start_time: lectureData.startTime.toISOString(),
        end_time: lectureData.endTime.toISOString(),
        is_recurring: lectureData.recurrence !== 'none',
        recurring_pattern: lectureData.recurrence,
        reminders: reminders, // Pass the array of reminder minutes
      });

      // Reminders are now handled by the backend create-lecture function

      // Check if this is the user's first task ever created
      if (!isTotalTaskCountLoading && isFirstTask && session?.user) {
        await notificationService.registerForPushNotifications(session.user.id);
      }

      // Invalidate all relevant queries
      await queryClient.invalidateQueries({ queryKey: ['lectures'] });
      await queryClient.invalidateQueries({ queryKey: ['assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['studySessions'] });

      Alert.alert('Success', 'Lecture created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            resetLectureData();
            navigation.getParent()?.goBack(); // Go back to the main screen
          }
        }
      ]);
    } catch (error) {
      console.error('Failed to create lecture:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save lecture. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReminderChange = (reminders: number[]) => {
    // Update the context with the new reminders array.
    updateLectureData({ reminders });
  };

  const handleCreateLecture = async () => {
    await createLecture(lectureData.reminders);
  };

  if (isGuest) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Reminders</Text>
          <Text style={styles.subtitle}>Step 4 of 4</Text>
        </View>
        
        <View style={styles.guestContainer}>
          <Text style={styles.guestText}>
            Create an account to save your lectures and get reminders.
          </Text>
          <Button 
            title="Sign Up" 
            onPress={() => {
              Alert.alert('Sign Up', 'Please use the main menu to create an account.');
            }} 
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Reminders</Text>
        <Text style={styles.subtitle}>Step 4 of 4</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>When would you like to be reminded?</Text>
        <Text style={styles.sectionDescription}>
          Choose up to {maxReminders} reminder{maxReminders > 1 ? 's' : ''} to help you stay on track.
        </Text>

        <ReminderSelector
          selectedReminders={lectureData.reminders}
          onSelectionChange={handleReminderChange}
          maxReminders={maxReminders}
          label="Set Reminders"
          helperText="You can always change these later"
        />

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Lecture Summary:</Text>
          <Text style={styles.summaryText}>
            <Text style={styles.bold}>Course:</Text> {lectureData.course?.courseName}
          </Text>
          <Text style={styles.summaryText}>
            <Text style={styles.bold}>Date:</Text> {lectureData.startTime?.toLocaleDateString()}
          </Text>
          <Text style={styles.summaryText}>
            <Text style={styles.bold}>Time:</Text> {lectureData.startTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {lectureData.endTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={styles.summaryText}>
            <Text style={styles.bold}>Recurrence:</Text> {lectureData.recurrence === 'none' ? 'One-time only' : lectureData.recurrence === 'weekly' ? 'Weekly' : 'Bi-weekly'}
          </Text>
          <Text style={styles.summaryText}>
            <Text style={styles.bold}>Reminders:</Text> {lectureData.reminders.length > 0 ? `${lectureData.reminders.length} set` : 'None'}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={isLoading}
          >
            <Text style={styles.skipButtonText}>Skip Reminders</Text>
          </TouchableOpacity>
          
          <View style={styles.createButtonContainer}>
            {limitReached ? (
              <View style={styles.limitReachedContainer}>
                <Text style={styles.limitReachedText}>
                  You have reached your monthly limit of {monthlyLimit} new tasks.
                </Text>
                <Text style={styles.upgradeText}>
                  Upgrade to a premium plan for unlimited tasks.
                </Text>
              </View>
            ) : (
              isLoading ? (
                <ActivityIndicator size="large" color="#007AFF" />
              ) : (
                <Button 
                  title={isTaskLimitLoading ? 'Loading...' : 'Create Lecture'} 
                  onPress={handleCreateLecture}
                  disabled={isTaskLimitLoading}
                />
              )
            )}
          </View>
        </View>
      </View>

      <GuestAuthModal
        isVisible={showGuestAuthModal}
        onClose={handleCloseGuestAuthModal}
        onSignUp={handleGuestSignUp}
        onSignIn={handleGuestSignIn}
        actionType="Lecture"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    lineHeight: 24,
  },
  summaryContainer: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginTop: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
    color: '#333',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  createButtonContainer: {
    flex: 1,
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  guestText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  limitReachedContainer: {
    alignItems: 'center',
    padding: 16,
  },
  limitReachedText: {
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  upgradeText: {
    color: '#8E8E93',
    textAlign: 'center',
    fontSize: 14,
  },
});

export default RemindersScreen;
