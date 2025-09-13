// FILE: src/screens/modals/AddAssignmentModal.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { Course } from '../../types';
import { Input, Button } from '../../components';
import DateTimePicker from '@react-native-community/datetimepicker';

const AddAssignmentModal = () => {
  const navigation = useNavigation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [submissionMethod, setSubmissionMethod] = useState<'Online' | 'In-person' | null>(null);
  const [submissionLink, setSubmissionLink] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await supabase.from('courses').select('id, course_name');
      if (error) Alert.alert('Error', 'Could not fetch your courses.');
      else setCourses(data || []);
    };
    fetchCourses();
  }, []);

  const handleSave = async () => {
    if (!selectedCourse || !title.trim() || !submissionMethod) {
      Alert.alert('Error', 'Please select a course, enter a title, and choose a submission method.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('create-assignment', {
        body: {
          course_id: selectedCourse,
          title: title.trim(),
          submission_method: submissionMethod,
          submission_link: submissionMethod === 'Online' ? submissionLink.trim() : null,
          due_date: dueDate.toISOString(),
        },
      });

      if (error) throw error;
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save assignment.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Assignment</Text>

      <Text style={styles.label}>Course</Text>
      <View style={styles.pickerContainer}>
        {courses.map(course => (
          <TouchableOpacity
            key={course.id}
            style={[
              styles.courseOption,
              selectedCourse === course.id && styles.selectedCourse
            ]}
            onPress={() => setSelectedCourse(course.id)}
          >
            <Text>{course.course_name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Assignment Title</Text>
      <Input
        value={title}
        onChangeText={setTitle}
        placeholder="Enter assignment title"
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
        title={isLoading ? <ActivityIndicator color="white" /> : "Save Assignment"}
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
  pickerContainer: {
    marginBottom: 10,
  },
  courseOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedCourse: {
    borderColor: '#007AFF',
    backgroundColor: '#E6F2FF',
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
