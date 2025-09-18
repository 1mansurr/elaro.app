import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, Switch, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Input, Button } from '../../components';
import DateTimePicker from '@react-native-community/datetimepicker';

const AddStudySessionModal = () => {
  const navigation = useNavigation();
  const { session } = useAuth();
  const isGuest = !session;
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedCourseName, setSelectedCourseName] = useState('');
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [enableSpacedRepetition, setEnableSpacedRepetition] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('create-study-session', {
        body: {
          course_id: selectedCourse,
          topic: topic.trim(),
          notes: notes.trim(),
          session_date: date.toISOString(),
          has_spaced_repetition: enableSpacedRepetition,
        },
      });

      if (error) throw error;
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save study session.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Study Session</Text>

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

      <Text style={styles.label}>Notes (Optional)</Text>
      <Input
        value={notes}
        onChangeText={setNotes}
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
        title={isLoading ? <ActivityIndicator color="white" /> : "Save Study Session"}
        onPress={handleSave}
        disabled={isLoading}
      />
    </View>
  );
};

// Add extensive styling
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
