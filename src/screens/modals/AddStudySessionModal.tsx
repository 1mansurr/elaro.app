import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, Switch, Modal, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { subMinutes, startOfWeek, isAfter } from 'date-fns';
import { useData } from '../../contexts/DataContext';
import { countTasksInCurrentWeek } from '../../utils/taskUtils';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Input, Button, ReminderSelector } from '../../components';
import { notificationService } from '../../services/notifications';
import DateTimePicker from '@react-native-community/datetimepicker';

const AddStudySessionModal = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { session, user } = useAuth();
  const dataContext = useData();
  const isGuest = !session;
  
  const taskToEdit = route.params?.taskToEdit;
  const isEditMode = !!taskToEdit;
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(taskToEdit?.course_id || null);
  const [selectedCourseName, setSelectedCourseName] = useState(taskToEdit?.courses?.course_name || '');
  const [topic, setTopic] = useState(taskToEdit?.name || '');
  const [description, setDescription] = useState(taskToEdit?.description || '');
  const [date, setDate] = useState(taskToEdit ? new Date(taskToEdit.session_date || taskToEdit.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [enableSpacedRepetition, setEnableSpacedRepetition] = useState(taskToEdit?.has_spaced_repetition || false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReminders, setSelectedReminders] = useState<number[]>([15]); // Default to 15 minutes
  const maxReminders = 2; // Assume free user

  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await supabase.from('courses').select('id, course_name');
      if (error) Alert.alert('Error', 'Could not fetch your courses.');
      else setCourses(data);
    };
    fetchCourses();
  }, []);

  const handleCourseSelect = (course) => {
    setSelectedCourse(course.id);
    setSelectedCourseName(course.course_name);
    setShowCourseDropdown(false);
  };

  const WEEKLY_TASK_LIMIT = 5;

  const handleSave = async () => {
    if (isGuest) {
      Alert.alert(
        'Create an Account to Save',
        'Sign up for free to save your activities and get reminders.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Up', onPress: () => navigation.navigate('AuthChooser') }
        ]
      );
      return;
    }

    if (!selectedCourse || !topic.trim()) {
      Alert.alert('Error', 'Please select a course and enter a topic.');
      return;
    }

    // --- NEW SUBSCRIPTION CHECK LOGIC ---
    const isOddity = user?.subscription_tier === 'oddity';
    const tasksThisWeek = countTasksInCurrentWeek({
      lectures: (dataContext as any).lectures,
      assignments: (dataContext as any).assignments,
      studySessions: (dataContext as any).studySessions,
    });

    if (!isOddity && tasksThisWeek >= WEEKLY_TASK_LIMIT) {
      Alert.alert(
        'Weekly Limit Reached',
        `You've reached the ${WEEKLY_TASK_LIMIT}-task limit for this week on the free plan. Become an Oddity for unlimited tasks.`,
        [
          { text: 'Cancel' },
          { text: 'Become an Oddity', onPress: () => navigation.navigate('AddOddityModal' as never) }
        ]
      );
      return; // Stop the function here
    }
    // --- END OF NEW LOGIC ---

    setIsLoading(true);
    try {
      if (isEditMode) {
        // --- NEW SUBSCRIPTION CHECK LOGIC FOR EDITING ---
        const isOddity = user?.subscription_tier === 'oddity';
        // We only count tasks if the task being edited was NOT created this week.
        // This prevents a user from being locked out of editing a task they just created.
        const taskBeingEdited = route.params?.taskToEdit;
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const isEditingTodaysTask = taskBeingEdited && isAfter(new Date(taskBeingEdited.created_at), weekStart);

        if (!isEditingTodaysTask) { // Only check the limit if editing an older task
            const tasksThisWeek = countTasksInCurrentWeek({
              lectures: (dataContext as any).lectures,
              assignments: (dataContext as any).assignments,
              studySessions: (dataContext as any).studySessions,
            });
            if (!isOddity && tasksThisWeek >= WEEKLY_TASK_LIMIT) {
              Alert.alert(
                'Weekly Limit Reached',
                `You've reached the ${WEEKLY_TASK_LIMIT}-task limit for this week on the free plan. To edit older tasks, please upgrade.`,
                [
                  { text: 'Cancel' },
                  { text: 'Become an Oddity', onPress: () => navigation.navigate('AddOddityModal' as never) }
                ]
              );
              return; // Stop the function here
            }
        }
        // --- END OF NEW LOGIC ---

        // --- EDIT LOGIC ---
        const { error } = await supabase.functions.invoke('update-study-session', {
          body: {
            sessionId: taskToEdit.id,
            updates: {
              topic: topic.trim(),
              description: description.trim(),
              session_date: date.toISOString(),
              has_spaced_repetition: enableSpacedRepetition,
              // Note: We are not allowing course changes in this simplified version.
            },
          },
        });

        if (error) throw error;
        Alert.alert('Success', 'Study session updated successfully!');
      } else {
        // --- CREATE LOGIC ---
        const { data, error } = await supabase.functions.invoke('create-study-session', {
          body: {
            course_id: selectedCourse,
            topic: topic.trim(),
            description: description.trim(),
            session_date: date.toISOString(),
            has_spaced_repetition: enableSpacedRepetition,
          },
        });

        if (error) throw error;

        // Schedule reminders via backend system
        if (selectedReminders.length > 0) {
          const remindersToInsert = selectedReminders.map(reminderMinutes => {
            const reminderTime = subMinutes(new Date(data.session_date), reminderMinutes);
            return {
              user_id: session.user.id,
              push_token: 'placeholder',
              title: 'Study Session Starting Soon',
              body: `Your study session for "${data.topic}" is starting soon.`,
              send_at: reminderTime.toISOString(),
              data: {
                itemId: data.id,
                taskType: 'study_session'
              }
            };
          });

          const { error: reminderError } = await supabase
            .from('reminders')
            .insert(remindersToInsert);

          if (reminderError) {
            console.error('Error saving reminders:', reminderError);
          }
        }

        // Check if this is the user's first task ever created.
        // We'll simulate this check for now. A real implementation would get this count from a context.
        const isFirstTask = true; // Placeholder for: totalTaskCount === 0
        if (isFirstTask) {
          await notificationService.registerForPushNotifications(session.user.id);
        }

        Alert.alert('Success', 'Study session created successfully!');
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'save'} study session.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.wrapper}
    >
      <TouchableWithoutFeedback onPress={() => navigation.goBack()}>
        {/* Use BlurView for the backdrop */}
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>
      
      <View style={styles.sheet}>
        <Text style={styles.title}>{isEditMode ? "Edit Study Session" : "Add Study Session"}</Text>

        <Text style={styles.label}>Course</Text>
        <TouchableOpacity
          style={styles.courseInput}
          onPress={() => setShowCourseDropdown(true)}
        >
          <Text style={[
            styles.courseInputText,
            !selectedCourseName && styles.placeholderText
          ]}>
            {selectedCourseName || (courses.length === 0 ? 'You have not added course' : 'Select a course')}
          </Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>

        {/* Course Dropdown Modal */}
        <Modal
          visible={showCourseDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCourseDropdown(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowCourseDropdown(false)}
          >
            <View style={styles.dropdownContainer}>
              {courses.length === 0 ? (
                <View style={styles.noCoursesContainer}>
                  <Text style={styles.noCoursesText}>You have not added course</Text>
                  <TouchableOpacity
                    style={styles.addCourseButton}
                    onPress={() => {
                      setShowCourseDropdown(false);
                      navigation.navigate('AddCourseModal');
                    }}
                  >
                    <Text style={styles.addCourseButtonText}>Add Course</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                courses.map(course => (
                  <TouchableOpacity
                    key={course.id}
                    style={styles.dropdownOption}
                    onPress={() => handleCourseSelect(course)}
                  >
                    <Text style={styles.dropdownOptionText}>{course.course_name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        <Text style={styles.label}>Topic</Text>
        <Input
          value={topic}
          onChangeText={setTopic}
          placeholder="What will you study?"
        />

        <Text style={styles.label}>Description (Optional)</Text>
        <Input
          value={description}
          onChangeText={setDescription}
          placeholder="Additional notes..."
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Date & Time</Text>
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={styles.dateButton}
        >
          <Text>{date.toLocaleString()}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="datetime"
            display="default"
            onChange={(event, d) => {
              setShowDatePicker(false);
              if(d) setDate(d);
            }}
          />
        )}

        <ReminderSelector
          selectedReminders={selectedReminders}
          onSelectionChange={setSelectedReminders}
          maxReminders={maxReminders}
        />

        <View style={styles.switchContainer}>
          <Text style={styles.label}>Enable Spaced Repetition?</Text>
          <Switch
            value={enableSpacedRepetition}
            onValueChange={setEnableSpacedRepetition}
          />
        </View>

        {enableSpacedRepetition && (
          <View style={styles.notificationInfo}>
            <Text style={styles.notificationText}>
              📅 You will be notified on day 1, 3 and 7
            </Text>
          </View>
        )}

        <Button
          title={isLoading ? <ActivityIndicator color="white" /> : (isEditMode ? "Save Changes" : "Save Session")}
          onPress={handleSave}
          disabled={isLoading}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

// Add extensive styling
const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'white',
    height: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 30,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginVertical: 10,
    color: '#333',
  },
  courseInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#FFF',
  },
  courseInputText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    margin: 20,
    maxHeight: 300,
    minWidth: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
  },
  noCoursesContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noCoursesText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  addCourseButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addCourseButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  dateButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    marginBottom: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  notificationInfo: {
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  notificationText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
});

export default AddStudySessionModal;
