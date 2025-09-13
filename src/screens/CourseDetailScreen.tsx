// FILE: src/screens/CourseDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../services/supabase';
import { RootStackParamList, Course } from '../types';

// Define the route prop type for this screen
type CourseDetailScreenRouteProp = RouteProp<RootStackParamList, 'CourseDetail'>;
type CourseDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CourseDetailScreen = () => {
  const route = useRoute<CourseDetailScreenRouteProp>();
  const navigation = useNavigation<CourseDetailScreenNavigationProp>();
  const { courseId } = route.params;
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    Alert.alert(
      'Delete Course',
      'Are you sure you want to delete this course? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const { error: deleteError } = await supabase.functions.invoke('delete-course', {
                body: {
                  courseId,
                },
              });

              if (deleteError) throw deleteError;

              Alert.alert('Success', 'Course deleted successfully.');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete the course.');
              console.error('Delete Error:', error.message);
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    const fetchCourseDetails = async () => {
      if (!courseId) {
        setError('Course ID is missing.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const { data, error: fetchError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .is('deleted_at', null) // Only fetch active courses
        .single();

      if (fetchError) {
        setError('Failed to fetch course details.');
        Alert.alert('Error', 'Could not load the course details.');
        console.error('Fetch Detail Error:', fetchError.message);
      } else {
        setCourse(data);
      }

      setIsLoading(false);
    };

    fetchCourseDetails();
  }, [courseId]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Loading course details...</Text>
      </View>
    );
  }

  if (error || !course) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Course not found.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{course.course_name}</Text>
        {course.course_code && (
          <Text style={styles.subtitle}>{course.course_code}</Text>
        )}
        
        <View style={styles.divider} />
        
        <Text style={styles.label}>About this course:</Text>
        <Text style={styles.content}>
          {course.about_course || 'No description provided.'}
        </Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditCourseModal', { courseId })}
          disabled={isLoading}
        >
          <Text style={styles.editButtonText}>Edit Course</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={isLoading}
        >
          <Text style={styles.deleteButtonText}>Delete Course</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  content: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CourseDetailScreen;
