import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { Input, Button } from '../../components';
import DateTimePicker from '@react-native-community/datetimepicker'; // Assuming this is installed

const AddLectureModal = () => {
  const navigation = useNavigation();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch user's courses to populate the dropdown
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, course_name');

      if (error) {
        Alert.alert('Error', 'Could not fetch your courses.');
      } else {
        setCourses(data);
      }
    };

    fetchCourses();
  }, []);

  const handleSaveLecture = async () => {
    if (!selectedCourse) {
      Alert.alert('Error', 'Please select a course.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-lecture', {
        body: {
          course_id: selectedCourse,
          lecture_date: date.toISOString(),
          // is_recurring and recurring_pattern can be added here if needed
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log('Lecture created successfully:', data);
      // TODO: Refresh the calendar/home screen data
      navigation.goBack();
    } catch (error) {
      console.error('Failed to create lecture:', error);
      Alert.alert('Error', 'Failed to save lecture. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add New Lecture</Text>

      {/* A simple course picker placeholder */}
      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Course</Text>
        {courses.map(course => (
          <TouchableOpacity
            key={course.id}
            style={[
              styles.courseOption,
              selectedCourse === course.id && styles.selectedCourse
            ]}
            onPress={() => setSelectedCourse(course.id)}
          >
            <Text style={styles.courseText}>{course.course_name}</Text>
          </TouchableOpacity>
        ))}
      </View>

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
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setDate(selectedDate);
            }
          }}
        />
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <Button title="Save Lecture" onPress={handleSaveLecture} />
      )}
    </View>
  );
};

// Add extensive styling for a complete component
const styles = StyleSheet.create({
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
  pickerContainer: {
    marginBottom: 20
  },
  courseOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    marginBottom: 8
  },
  selectedCourse: {
    borderColor: '#007AFF',
    backgroundColor: '#E6F2FF'
  },
  courseText: {
    fontSize: 16
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