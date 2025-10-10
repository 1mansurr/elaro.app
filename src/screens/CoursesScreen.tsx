// FILE: src/screens/CoursesScreen.tsx
import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCourses } from '../hooks/useDataQueries';
import { RootStackParamList, Course } from '../types';

// Define the navigation prop type for this screen
type CoursesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CoursesScreen = () => {
  const navigation = useNavigation<CoursesScreenNavigationProp>();
  const { data: courses, isLoading, isError, error } = useCourses();

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

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          Error fetching courses: {error instanceof Error ? error.message : 'Unknown error'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!courses || courses.length === 0 ? (
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