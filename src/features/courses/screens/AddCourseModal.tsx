import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '@/services/supabase';
import { Input, Button } from '@/shared/components';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useCourses } from '@/hooks/useDataQueries';
import { useQueryClient } from '@tanstack/react-query';

const FREE_COURSE_LIMIT = 2;

const AddCourseModal = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const queryClient = useQueryClient();
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

    // --- NEW SUBSCRIPTION CHECK LOGIC ---
    const isOddity = user.subscription_tier === 'oddity';
    const courseCount = courses?.length || 0;

    if (!isOddity && courseCount >= FREE_COURSE_LIMIT) {
      Alert.alert(
        'Free Limit Reached',
        `You've reached the ${FREE_COURSE_LIMIT}-course limit for the free plan. Become an Oddity to add unlimited courses.`,
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
      const { data, error } = await supabase.functions.invoke('create-course', {
        body: {
          course_name: courseName.trim(),
          course_code: courseCode.trim(),
          about_course: aboutCourse.trim(),
        },
      });

      if (error) {
        console.error('Supabase function error:', error);
        Alert.alert('Error', `Failed to create course: ${error.message || 'Unknown error'}`);
      } else {
        Alert.alert('Success', 'Course created successfully!');
        // Invalidate the 'courses' query to trigger a refetch
        await queryClient.invalidateQueries({ queryKey: ['courses'] });
        navigation.goBack();
      }
    } catch (error) {
      console.error('Failed to create course:', error);
      Alert.alert('Error', `Failed to save course: ${error instanceof Error ? error.message : 'Please try again.'}`);
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
              disabled={coursesLoading}
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