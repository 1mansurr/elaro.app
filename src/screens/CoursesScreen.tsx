// FILE: src/screens/CoursesScreen.tsx
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../services/supabase';
import { RootStackParamList, Course } from '../types';

// Define the navigation prop type for this screen
type CoursesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CoursesScreen = () => {
  const navigation = useNavigation<CoursesScreenNavigationProp>();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set up the header buttons
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'My Courses',
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('AddCourseModal')}
          style={{ marginRight: 16 }}
        >
          <Text style={styles.headerButton}>Add</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Fetch courses and listen for real-time changes
  useEffect(() => {
    const fetchAndSubscribeToCourses = async () => {
      setIsLoading(true);
      setError(null);

      // Initial fetch
      const { data, error: fetchError } = await supabase
        .from('courses')
        .select('*')
        .is('deleted_at', null) // Only fetch active courses
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError('Failed to fetch courses. Please try again.');
        Alert.alert('Error', 'Could not load your courses.');
        console.error('Fetch Error:', fetchError.message);
        setIsLoading(false);
        return;
      }

      setCourses(data || []);
      setIsLoading(false);

      // Set up real-time subscription
      const channel = supabase
        .channel('public:courses')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'courses'
          },
          (payload) => {
            // Re-fetch data to ensure consistency
            fetchAndSubscribeToCourses();
          }
        )
        .subscribe();

      // Cleanup subscription on component unmount
      return () => {
        supabase.removeChannel(channel);
      };
    };

    fetchAndSubscribeToCourses();
  }, []);

  // Render item for the FlatList
  const renderCourse = ({ item }: { item: Course }) => (
    <TouchableOpacity
      style={styles.courseItem}
      onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
    >
      <Text style={styles.courseName}>{item.course_name}</Text>
      {item.course_code && (
        <Text style={styles.courseCode}>{item.course_code}</Text>
      )}
    </TouchableOpacity>
  );

  // Conditional rendering based on state
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Loading courses...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {courses.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>You haven't added any courses yet.</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddCourseModal')}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>Add Your First Course</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={courses}
          renderItem={renderCourse}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContainer: {
    padding: 16,
  },
  headerButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  courseItem: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  courseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  courseCode: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  addButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
});

export default CoursesScreen;