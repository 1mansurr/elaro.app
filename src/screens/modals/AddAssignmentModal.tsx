// FILE: src/screens/modals/AddAssignmentModal.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Course } from '../../types';
import { Input, Button } from '../../components';
import DateTimePicker from '@react-native-community/datetimepicker';

const AddAssignmentModal = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { session } = useAuth();
  const isGuest = !session;
  
  const taskToEdit = route.params?.taskToEdit;
  const isEditMode = !!taskToEdit;
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(taskToEdit?.course_id || null);
  const [selectedCourseName, setSelectedCourseName] = useState(taskToEdit?.courses?.course_name || '');
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [title, setTitle] = useState(taskToEdit?.name || '');
  const [description, setDescription] = useState(taskToEdit?.description || '');
  const [submissionMethod, setSubmissionMethod] = useState<'Online' | 'In-person' | null>(taskToEdit?.submission_method || null);
  const [submissionLink, setSubmissionLink] = useState(taskToEdit?.submission_link || '');
  const [dueDate, setDueDate] = useState(taskToEdit ? new Date(taskToEdit.due_date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      if (isGuest) return; // Don't fetch for guests
      const { data, error } = await supabase.from('courses').select('id, course_name');
      if (error) Alert.alert('Error', 'Could not fetch your courses.');
      else setCourses(data || []);
    };
    fetchCourses();
  }, [isGuest]);

  const handleCourseSelect = (course) => {
    setSelectedCourse(course.id);
    setSelectedCourseName(course.course_name);
    setShowCourseDropdown(false);
  };

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

    if (!title.trim() || !selectedCourse) {
      Alert.alert('Error', 'Please select a course and enter a title.');
      return;
    }

    setIsLoading(true);
    try {
      if (isEditMode) {
        // --- EDIT LOGIC ---
        const { error } = await supabase.functions.invoke('update-assignment', {
          body: {
            assignmentId: taskToEdit.id,
            updates: {
              title: title.trim(),
              description: description.trim(),
              submission_method: submissionMethod,
              submission_link: submissionMethod === 'Online' ? submissionLink.trim() : null,
              due_date: dueDate.toISOString(),
              // Note: We are not allowing course changes in this simplified version.
            },
          },
        });

        if (error) throw error;
        Alert.alert('Success', 'Assignment updated successfully!');
      } else {
        // --- CREATE LOGIC ---
        const { error } = await supabase.functions.invoke('create-assignment', {
          body: {
            course_id: selectedCourse,
            title: title.trim(),
            description: description.trim(),
            submission_method: submissionMethod,
            submission_link: submissionMethod === 'Online' ? submissionLink.trim() : null,
            due_date: dueDate.toISOString(),
          },
        });

        if (error) throw error;
        Alert.alert('Success', 'Assignment created successfully!');
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'save'} assignment.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isEditMode ? "Edit Assignment" : "Add Assignment"}</Text>

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

      <Text style={styles.label}>Assignment Title</Text>
      <Input
        value={title}
        onChangeText={setTitle}
        placeholder="Enter assignment title"
      />

      <Text style={styles.label}>Description</Text>
      <Input
        value={description}
        onChangeText={setDescription}
        placeholder="Enter assignment description (optional)"
        multiline
        numberOfLines={3}
      />

      <Text style={styles.label}>Submission Method</Text>
      <View style={styles.methodContainer}>
        <TouchableOpacity
          style={[
            styles.methodOption,
            submissionMethod === 'Online' && styles.selectedMethod
          ]}
          onPress={() => setSubmissionMethod('Online')}
        >
          <Text>Online</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.methodOption,
            submissionMethod === 'In-person' && styles.selectedMethod
          ]}
          onPress={() => setSubmissionMethod('In-person')}
        >
          <Text>In-person</Text>
        </TouchableOpacity>
      </View>

      {submissionMethod === 'Online' && (
        <>
          <Text style={styles.label}>Submission Link</Text>
          <Input
            value={submissionLink}
            onChangeText={setSubmissionLink}
            placeholder="Enter submission URL"
          />
        </>
      )}

      <Text style={styles.label}>Due Date & Time</Text>
      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        style={styles.dateButton}
      >
        <Text>{dueDate.toLocaleString()}</Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={dueDate}
          mode="datetime"
          display="default"
          onChange={(event, d) => {
            setShowDatePicker(false);
            if(d) setDueDate(d);
          }}
        />
      )}

      <Button
        title={isLoading ? <ActivityIndicator color="white" /> : (isEditMode ? "Save Changes" : "Save Assignment")}
        onPress={handleSave}
        disabled={isLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
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
  methodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  methodOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  selectedMethod: {
    borderColor: '#007AFF',
    backgroundColor: '#E6F2FF',
  },
  dateButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    marginBottom: 20,
  },
});

export default AddAssignmentModal;
