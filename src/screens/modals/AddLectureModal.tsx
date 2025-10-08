import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { BlurView } from 'expo-blur';
import { subMinutes } from 'date-fns';
import { countTasksInCurrentWeek } from '../../utils/taskUtils';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLectures, useAssignments, useStudySessions } from '../../hooks/useDataQueries'; // NEW
import { useQueryClient } from '@tanstack/react-query'; // NEW
import { Course } from '../../types';
import { Input, Button, ReminderSelector } from '../../components';
import { notificationService } from '../../services/notifications';
import DateTimePicker from '@react-native-community/datetimepicker'; // Assuming this is installed

type AddLectureModalRouteProp = RouteProp<RootStackParamList, 'AddLectureModal'>;
type AddLectureModalNavigationProp = StackNavigationProp<RootStackParamList>;

const AddLectureModal = () => {
  const navigation = useNavigation<AddLectureModalNavigationProp>();
  const route = useRoute<AddLectureModalRouteProp>();
  const { session, user } = useAuth();
  const queryClient = useQueryClient(); // NEW

  // NEW: Fetch all task types for the weekly limit check.
  const { data: lectures } = useLectures();
  const { data: assignments } = useAssignments();
  const { data: studySessions } = useStudySessions();

  const isGuest = !session;
  
  const taskToEdit = route.params?.taskToEdit;
  const isEditMode = !!taskToEdit;
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState((taskToEdit as any)?.course_id || null);
  const [selectedCourseName, setSelectedCourseName] = useState(taskToEdit?.courses?.course_name || '');
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [lectureName, setLectureName] = useState(taskToEdit?.name || '');
  const [description, setDescription] = useState(taskToEdit?.description || '');
  const [date, setDate] = useState(taskToEdit ? new Date(taskToEdit.start_time || '') : new Date());
  const [endTime, setEndTime] = useState(taskToEdit ? new Date(taskToEdit.end_time || '') : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReminders, setSelectedReminders] = useState<number[]>([30]); // Default to 30 minutes
  const maxReminders = 2; // This should come from a user context later

  useEffect(() => {
    const fetchCourses = async () => {
      if (isGuest) return; // Don't fetch for guests
      const { data, error } = await supabase.from('courses').select('id, course_name');
      if (error) Alert.alert('Error', 'Could not fetch your courses.');
      else setCourses((data || []).map(course => ({
        ...course,
        user_id: user?.id || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })) as Course[]);
    };
    fetchCourses();
  }, [isGuest]);

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course.id);
    setSelectedCourseName(course.course_name);
    setShowCourseDropdown(false);
  };

  const WEEKLY_TASK_LIMIT = 5;

  const handleSaveLecture = async () => {
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

    if (!lectureName.trim() || !selectedCourse) {
      Alert.alert('Error', 'Please select a course and enter a lecture name.');
      return;
    }

    // --- SUBSCRIPTION CHECK LOGIC (now uses data from React Query) ---
    const isOddity = user?.subscription_tier === 'oddity';
    // Pass the data from our hooks to the counter.
    const tasksThisWeek = countTasksInCurrentWeek({
      lectures: lectures || [],
      assignments: assignments || [],
      studySessions: studySessions || [],
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
        // --- EDIT LOGIC ---
        const { data, error } = await supabase.functions.invoke('update-lecture', {
          body: {
            lectureId: taskToEdit.id,
            updates: {
              lecture_name: lectureName.trim(),
              description: description.trim(),
              start_time: date.toISOString(),
              end_time: endTime.toISOString(),
              // Note: We are not allowing course changes in this simplified version.
            },
          },
        });

        if (error) {
          throw new Error(error.message);
        }

        Alert.alert('Success', 'Lecture updated successfully!');
      } else {
        // --- CREATE LOGIC ---
        const { data, error } = await supabase.functions.invoke('create-lecture', {
          body: {
            course_id: selectedCourse,
            lecture_name: lectureName.trim(),
            start_time: date.toISOString(),
            end_time: endTime.toISOString(),
            description: description.trim(),
            // is_recurring and recurring_pattern can be added here if needed
          },
        });

        if (error) {
          throw new Error(error.message);
        }

        // Schedule reminders via backend system
        if (selectedReminders.length > 0) {
          const remindersToInsert = selectedReminders.map(reminderMinutes => {
            const reminderTime = subMinutes(new Date(data.start_time), reminderMinutes);
            return {
              user_id: session.user.id,
              push_token: 'placeholder', // The backend function will get the real token
              title: 'Upcoming Lecture',
              body: `Your lecture "${data.lecture_name}" is starting soon.`,
              send_at: reminderTime.toISOString(),
              data: {
                itemId: data.id,
                taskType: 'lecture'
              }
            };
          });

          const { error: reminderError } = await supabase
            .from('reminders')
            .insert(remindersToInsert);

          if (reminderError) {
            console.error('Error saving reminders:', reminderError);
            // Optional: Show an alert to the user
          }
        }

        // Check if this is the user's first task ever created.
        // We'll simulate this check for now. A real implementation would get this count from a context.
        const isFirstTask = true; // Placeholder for: totalTaskCount === 0
        if (isFirstTask) {
          await notificationService.registerForPushNotifications(session.user.id);
        }

        Alert.alert('Success', 'Lecture created successfully!');
      }

      // NEW: Invalidate all relevant queries.
      await queryClient.invalidateQueries({ queryKey: ['lectures'] });
      await queryClient.invalidateQueries({ queryKey: ['assignments'] }); // Invalidate all to keep weekly count fresh
      await queryClient.invalidateQueries({ queryKey: ['studySessions'] });
      navigation.goBack();
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} lecture:`, error);
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'save'} lecture. Please try again.`);
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
        <Text style={styles.title}>{isEditMode ? 'Edit Lecture' : 'Add New Lecture'}</Text>

        <Text style={styles.label}>Course *</Text>
        <TouchableOpacity
          style={styles.courseInput}
          onPress={() => setShowCourseDropdown(true)}
        >
          <Text style={[styles.courseInputText, !selectedCourseName && styles.placeholderText]}>
            {selectedCourseName || (courses.length === 0 ? 'Please add a course first' : 'Select a course')}
          </Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>

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
                  <Text style={styles.noCoursesText}>You have no courses.</Text>
                  <TouchableOpacity
                    style={styles.addCourseButton}
                    onPress={() => {
                      setShowCourseDropdown(false);
                      navigation.navigate('AddCourseModal');
                    }}
                  >
                    <Text style={styles.addCourseButtonText}>Add a Course</Text>
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

        <Text style={styles.label}>Lecture Name *</Text>
        <Input
          value={lectureName}
          onChangeText={setLectureName}
          placeholder="Enter lecture name"
        />

        <Text style={styles.label}>Description</Text>
        <Input
          value={description}
          onChangeText={setDescription}
          placeholder="Enter lecture description (optional)"
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Start Time</Text>
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
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setDate(selectedDate);
              }
            }}
          />
        )}

        <Text style={styles.label}>End Time</Text>
        <TouchableOpacity
          onPress={() => setShowEndTimePicker(true)}
          style={styles.dateButton}
        >
          <Text>{endTime.toLocaleString()}</Text>
        </TouchableOpacity>

        {showEndTimePicker && (
          <DateTimePicker
            value={endTime}
            mode="datetime"
            display="default"
            onChange={(event, selectedDate) => {
              setShowEndTimePicker(false);
              if (selectedDate) {
                setEndTime(selectedDate);
              }
            }}
          />
        )}

        <ReminderSelector
          selectedReminders={selectedReminders}
          onSelectionChange={setSelectedReminders}
          maxReminders={maxReminders}
        />

        {isLoading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <Button 
            title={isEditMode ? "Save Changes" : "Save Lecture"} 
            onPress={handleSaveLecture} 
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

// Add extensive styling for a complete component
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
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333'
  },
  courseInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#FFF',
  },
  courseInputText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
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
    width: '80%',
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
    marginBottom: 20
  }
});

export default AddLectureModal;