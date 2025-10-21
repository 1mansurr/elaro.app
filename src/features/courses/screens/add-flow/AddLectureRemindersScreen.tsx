import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useAddCourse } from '@/features/courses/contexts/AddCourseContext';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { GuestAuthModal } from '@/shared/components';
import { savePendingTask, getPendingTask, clearPendingTask } from '@/utils/taskPersistence';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';

const ReminderOptions = [
  { label: '10 mins before', value: 10 },
  { label: '30 mins before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '1 day before', value: 1440 },
];

const AddLectureRemindersScreen = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { courseData, updateCourseData, resetCourseData } = useAddCourse();
  const { user, isGuest } = useAuth();

  const [selectedReminders, setSelectedReminders] = useState<number[]>(courseData.reminders);
  const [isLoading, setIsLoading] = useState(false);
  const [showGuestAuthModal, setShowGuestAuthModal] = useState(false);

  const toggleReminder = (value: number) => {
    setSelectedReminders(prev => 
      prev.includes(value) ? prev.filter(r => r !== value) : [...prev, value]
    );
  };

  // Add auto-save function
  const autoCreateTask = async () => {
    try {
      const pendingTask = await getPendingTask();
      if (!pendingTask || pendingTask.taskType !== 'course') return;

      const { taskData } = pendingTask;
      
      if (!taskData.courseName?.trim()) {
        Alert.alert('Error', 'Missing required information for the saved course.');
        return;
      }

      setIsLoading(true);

      // Create the course using the existing API
      const { error } = await supabase.functions.invoke('create-course-and-lecture', {
        body: taskData,
      });

      if (error) throw new Error(error.message);

      // Clear pending data
      await clearPendingTask();

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['courses'] });
      await queryClient.invalidateQueries({ queryKey: ['lectures'] });
      await queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });
      await queryClient.invalidateQueries({ queryKey: ['calendarData'] });

      Alert.alert('Success!', `${taskData.courseName} has been saved successfully!`, [
        {
          text: 'OK',
          onPress: () => {
            resetCourseData();
            navigation.getParent()?.goBack();
          }
        }
      ]);

    } catch (error) {
      console.error('Failed to auto-create course:', error);
      const errorTitle = getErrorTitle(error);
      const errorMessage = mapErrorCodeToMessage(error);
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Add modal handlers
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

  const handleFinish = async () => {
    setIsLoading(true);
    // First, update the context with the final reminder selection
    updateCourseData({ reminders: selectedReminders });

    // We need to use a function form of update to get the most recent state
    // before calling the backend, as the state update above is async.
    const finalPayload = {
      courseName: courseData.courseName,
      courseCode: courseData.courseCode,
      courseDescription: courseData.courseDescription,
      startTime: courseData.startTime?.toISOString(),
      endTime: courseData.endTime?.toISOString(),
      recurrence: courseData.recurrence,
      reminders: selectedReminders,
    };

    // Check if guest user
    if (isGuest) {
      // Save current task data before showing modal
      await savePendingTask(finalPayload, 'course');
      setShowGuestAuthModal(true);
      setIsLoading(false);
      return;
    }

    try {
      // We will create this new, combined Edge Function in the next step.
      const { error } = await supabase.functions.invoke('create-course-and-lecture', {
        body: finalPayload,
      });

      if (error) throw new Error(error.message);

      Alert.alert('Success!', `${finalPayload.courseName} has been added to your schedule.`);
      
      // Invalidate all relevant queries to refresh the app state
      await queryClient.invalidateQueries({ queryKey: ['courses'] });
      await queryClient.invalidateQueries({ queryKey: ['lectures'] });
      await queryClient.invalidateQueries({ queryKey: ['homeScreenData'] });
      await queryClient.invalidateQueries({ queryKey: ['calendarData'] });

      resetCourseData(); // Clear the context for the next time
      navigation.getParent()?.goBack(); // Close the entire modal flow

    } catch (err) {
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
    <View style={styles.container}>
      <Text style={styles.title}>Set lecture reminders (Optional)</Text>
      
      <View style={styles.optionsContainer}>
        {ReminderOptions.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              selectedReminders.includes(option.value) && styles.optionButtonActive
            ]}
            onPress={() => toggleReminder(option.value)}
          >
            <Text style={[
              styles.optionText,
              selectedReminders.includes(option.value) && styles.optionTextActive
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Back" onPress={handleBack} color="#888" disabled={isLoading} />
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <Button title="Finish Setup" onPress={handleFinish} />
        )}
      </View>

      <GuestAuthModal
        isVisible={showGuestAuthModal}
        onClose={() => setShowGuestAuthModal(false)}
        onSignUp={handleGuestSignUp}
        onSignIn={handleGuestSignIn}
        actionType="Course"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 40 },
  optionsContainer: { marginBottom: 40 },
  optionButton: { borderWidth: 1, borderColor: '#007AFF', padding: 15, borderRadius: 8, marginBottom: 10 },
  optionButtonActive: { backgroundColor: '#007AFF' },
  optionText: { fontSize: 16, textAlign: 'center', color: '#007AFF' },
  optionTextActive: { color: '#fff' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 },
});

export default AddLectureRemindersScreen;
