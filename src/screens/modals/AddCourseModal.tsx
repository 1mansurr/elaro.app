import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase'; // Assuming supabase client is exported here
import { Input, Button } from '../../components';
import { useAuth } from '../../contexts/AuthContext';

const AddCourseModal = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [aboutCourse, setAboutCourse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveCourse = async () => {
    if (!courseName.trim()) {
      Alert.alert('Error', 'Course name is required.');
      return;
    }

    // Check if user is authenticated
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to create courses. This feature requires authentication.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-course', {
        body: {
          course_name: courseName.trim(),
          course_code: courseCode.trim(),
          about_course: aboutCourse.trim(),
        },
      });

      if (error) {
        console.error('Supabase function error:', error);
        // Handle specific limit error
        if (error.message && error.message.includes('Course limit')) {
          Alert.alert('Limit Reached', 'You have reached your 3-course limit for the free plan.');
        } else {
          Alert.alert('Error', `Failed to create course: ${error.message || 'Unknown error'}`);
        }
      } else {
        console.log('Course created successfully:', data);
        Alert.alert('Success', 'Course created successfully!');
        // TODO: Add logic to refresh the course list on the previous screen
        navigation.goBack();
      }
    } catch (error) {
      console.error('Failed to create course:', error);
      Alert.alert('Error', `Failed to save course: ${error.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add New Course</Text>

      <Input
        placeholder="Course Name *"
        value={courseName}
        onChangeText={setCourseName}
        style={styles.input}
      />

      <Input
        placeholder="Course Code (optional)"
        value={courseCode}
        onChangeText={setCourseCode}
        style={styles.input}
      />

      <Input
        placeholder="About this course (optional)"
        value={aboutCourse}
        onChangeText={setAboutCourse}
        style={[styles.input, styles.textArea]}
        multiline
        numberOfLines={4}
      />

      <View style={styles.buttonContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <>
            <Button
              title="Save Course"
              onPress={handleSaveCourse}
              style={styles.buttonContainer}
            />
            <Button
              title="Cancel"
              onPress={() => navigation.goBack()}
              variant="secondary"
            />
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    marginBottom: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginTop: 20,
  },
});

export default AddCourseModal;