import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AddAssignmentStackParamList } from '../../navigation/AddAssignmentNavigator';
import { useAddAssignment } from '../../contexts/AddAssignmentContext';
import { Button, ReminderSelector } from '../../components';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLectures, useAssignments, useStudySessions } from '../../hooks/useDataQueries';
import { useQueryClient } from '@tanstack/react-query';
import { subMinutes } from 'date-fns';
import { countTasksInCurrentWeek } from '../../utils/taskUtils';
import { notificationService } from '../../services/notifications';

type RemindersScreenNavigationProp = StackNavigationProp<AddAssignmentStackParamList, 'Reminders'>;

const RemindersScreen = () => {
  const navigation = useNavigation<RemindersScreenNavigationProp>();
  const { assignmentData, resetAssignmentData } = useAddAssignment();
  const { session, user } = useAuth();
  const queryClient = useQueryClient();
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch all task types for the weekly limit check
  const { data: lectures } = useLectures();
  const { data: assignments } = useAssignments();
  const { data: studySessions } = useStudySessions();

  const isGuest = !session;
  const maxReminders = 2; // This should come from a user context later

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSkip = async () => {
    await createAssignment([]); // Create assignment with no reminders
  };

  const createAssignment = async (reminders: number[]) => {
    if (isGuest) {
      Alert.alert(
        'Create an Account to Save',
        'Sign up for free to save your activities and get reminders.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Up', onPress: () => {
            Alert.alert('Sign Up', 'Please use the main menu to create an account.');
          }}
        ]
      );
      return;
    }

    if (!assignmentData.course || !assignmentData.title.trim() || !assignmentData.dueDate) {
      Alert.alert('Error', 'Missing required information. Please go back and complete all steps.');
      return;
    }

    // --- SUBSCRIPTION CHECK LOGIC ---
    const isOddity = user?.subscription_tier === 'oddity';
    const tasksThisWeek = countTasksInCurrentWeek({
      lectures: lectures || [],
      assignments: assignments || [],
      studySessions: studySessions || [],
    });

    const WEEKLY_TASK_LIMIT = 5;
    if (!isOddity && tasksThisWeek >= WEEKLY_TASK_LIMIT) {
      Alert.alert(
        'Weekly Limit Reached',
        `You've reached the ${WEEKLY_TASK_LIMIT}-task limit for this week on the free plan. Become an Oddity for unlimited tasks.`,
        [
          { text: 'Cancel' },
          { text: 'Become an Oddity', onPress: () => {
            Alert.alert('Become an Oddity', 'Please use the main menu to upgrade your subscription.');
          }}
        ]
      );
      return;
    }

    setIsLoading(true);

    try {
      // Create the assignment
      const { data, error } = await supabase.functions.invoke('create-assignment', {
        body: {
          course_id: assignmentData.course.id,
          title: assignmentData.title.trim(),
          description: assignmentData.description.trim(),
          submission_method: assignmentData.submissionMethod,
          submission_link: assignmentData.submissionMethod === 'Online' ? assignmentData.submissionLink.trim() : null,
          due_date: assignmentData.dueDate.toISOString(),
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // Schedule reminders if any
      if (reminders.length > 0 && session?.user) {
        // Create reminders with the correct, current database schema.
        const remindersToInsert = reminders.map(reminderMinutes => {
          const reminderTime = subMinutes(assignmentData.dueDate!, reminderMinutes);
          return {
            user_id: session.user.id,
            assignment_id: data.id, // FIX: Use the ID of the assignment we just created.
            reminder_time: reminderTime.toISOString(), // FIX: Use the correct 'reminder_time' column.
            reminder_type: 'assignment', // FIX: Set the correct type for this reminder.
            // The following fields are for compatibility or can be derived.
            reminder_date: reminderTime.toISOString(), // For compatibility with older logic if any.
            day_number: Math.ceil(reminderMinutes / (24 * 60)), // Approximate day number.
            completed: false,
          };
        });

        const { error: reminderError } = await supabase
          .from('reminders')
          .insert(remindersToInsert);

        if (reminderError) {
          console.error('Error saving reminders:', reminderError);
        }
      }

      // Check if this is the user's first task ever created
      const isFirstTask = true; // Placeholder for: totalTaskCount === 0
      if (isFirstTask && session?.user) {
        await notificationService.registerForPushNotifications(session.user.id);
      }

      // Invalidate all relevant queries
      await queryClient.invalidateQueries({ queryKey: ['lectures'] });
      await queryClient.invalidateQueries({ queryKey: ['assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['studySessions'] });

      Alert.alert('Success', 'Assignment created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            resetAssignmentData();
            navigation.getParent()?.goBack(); // Go back to the main screen
          }
        }
      ]);
    } catch (error) {
      console.error('Failed to create assignment:', error);
      Alert.alert('Error', 'Failed to save assignment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReminderChange = (reminders: number[]) => {
    // Update the context with new reminders
    // We'll handle this in the create function
  };

  const handleCreateAssignment = async () => {
    await createAssignment(assignmentData.reminders);
  };

  if (isGuest) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Reminders</Text>
          <Text style={styles.subtitle}>Step 6 of 6</Text>
        </View>
        
        <View style={styles.guestContainer}>
          <Text style={styles.guestText}>
            Create an account to save your assignments and get reminders.
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
        <Text style={styles.subtitle}>Step 6 of 6</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>When would you like to be reminded?</Text>
        <Text style={styles.sectionDescription}>
          Choose up to {maxReminders} reminder{maxReminders > 1 ? 's' : ''} to help you stay on track with your assignment.
        </Text>

        <ReminderSelector
          selectedReminders={assignmentData.reminders}
          onSelectionChange={handleReminderChange}
          maxReminders={maxReminders}
          label="Set Reminders"
          helperText="You can always change these later"
        />

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Assignment Summary:</Text>
          <Text style={styles.summaryText}>
            <Text style={styles.bold}>Title:</Text> {assignmentData.title || 'Untitled Assignment'}
          </Text>
          <Text style={styles.summaryText}>
            <Text style={styles.bold}>Course:</Text> {assignmentData.course?.course_name}
          </Text>
          <Text style={styles.summaryText}>
            <Text style={styles.bold}>Due:</Text> {assignmentData.dueDate?.toLocaleDateString()} at {assignmentData.dueDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {assignmentData.submissionMethod && (
            <Text style={styles.summaryText}>
              <Text style={styles.bold}>Submission:</Text> {assignmentData.submissionMethod}
            </Text>
          )}
          <Text style={styles.summaryText}>
            <Text style={styles.bold}>Reminders:</Text> {assignmentData.reminders.length > 0 ? `${assignmentData.reminders.length} set` : 'None'}
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
            {isLoading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : (
              <Button 
                title="Create Assignment" 
                onPress={handleCreateAssignment}
              />
            )}
          </View>
        </View>
      </View>
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
});

export default RemindersScreen;
