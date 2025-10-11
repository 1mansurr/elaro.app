// FILE: src/features/courses/screens/EditCourseModal.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { supabase } from '@/services/supabase';
import { RootStackParamList } from '@/types';
import { Input, Button } from '@/shared/components';

type EditCourseModalRouteProp = RouteProp<RootStackParamList, 'EditCourseModal'>;

const EditCourseModal = () => {
  const navigation = useNavigation();
  const route = useRoute<EditCourseModalRouteProp>();
  const { courseId } = route.params;
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [aboutCourse, setAboutCourse] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (error) {
        Alert.alert('Error', 'Could not fetch course details.');
        navigation.goBack();
      } else {
        setCourseName(data.course_name);
        setCourseCode(data.course_code || '');
        setAboutCourse(data.about_course || '');
      }
      setIsLoading(false);
    };

    fetchCourse();
  }, [courseId, navigation]);

  const handleSave = async () => {
    if (!courseName.trim()) {
      Alert.alert('Error', 'Course name is required.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.functions.invoke('update-course', {
        body: {
          courseId,
          course_name: courseName.trim(),
          course_code: courseCode.trim(),
          about_course: aboutCourse.trim(),
        },
      });

      if (error) throw error;
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to update the course.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Loading course details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Course</Text>

      <Text style={styles.label}>Course Name</Text>
      <Input
        value={courseName}
        onChangeText={setCourseName}
        placeholder="Enter course name"
      />

      <Text style={styles.label}>Course Code (Optional)</Text>
      <Input
        value={courseCode}
        onChangeText={setCourseCode}
        placeholder="e.g., CS101, MATH201"
      />

      <Text style={styles.label}>About this course (Optional)</Text>
      <Input
        value={aboutCourse}
        onChangeText={setAboutCourse}
        placeholder="Describe what this course is about..."
        multiline
        numberOfLines={4}
      />

      {isSaving ? (
        <View style={styles.loadingButton}>
          <ActivityIndicator color="white" />
          <Text style={styles.loadingButtonText}>Saving...</Text>
        </View>
      ) : (
        <Button
          title="Save Changes"
          onPress={handleSave}
          disabled={isSaving}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingButtonText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
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
});

export default EditCourseModal;
