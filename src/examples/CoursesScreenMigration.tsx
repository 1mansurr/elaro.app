/**
 * Example: Courses Screen Migration
 *
 * This example shows how to migrate from the legacy API to the versioned API system.
 * Compare the "Before" and "After" implementations to understand the migration process.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ============================================================================
// BEFORE: Legacy Implementation (Current)
// ============================================================================

/*
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Course } from '@/types';

function CoursesScreenLegacy() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);

  // Legacy API calls (DEPRECATED - shows old pattern)
  // Note: api.courses.getAll() now returns CoursesPage with pagination
  // For new code, use useCourses() hook instead (see After section)
  const { data: coursesData, isLoading, error } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.courses.getAll({ pageParam: 0, pageSize: 50 }),
  });
  // Extract courses from paginated response
  const courses = coursesData?.courses || [];

  const createCourseMutation = useMutation({
    mutationFn: (courseData: Omit<Course, 'id' | 'created_at' | 'updated_at'>) =>
      api.courses.create(courseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setShowAddModal(false);
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to create course');
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Course> }) =>
      api.courses.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to update course');
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (id: string) => api.courses.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to delete course');
    },
  });

  if (isLoading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error.message}</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Courses</Text>
      
      {courses?.map((course) => (
        <View key={course.id} style={styles.courseItem}>
          <Text style={styles.courseName}>{course.course_name}</Text>
          <Text style={styles.courseCode}>{course.course_code}</Text>
          
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => updateCourseMutation.mutate({ 
                id: course.id, 
                data: { course_name: 'Updated Name' } 
              })}
            >
              <Ionicons name="pencil" size={20} color="#007AFF" />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => deleteCourseMutation.mutate(course.id)}
            >
              <Ionicons name="trash" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
      
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={24} color="white" />
        <Text style={styles.addButtonText}>Add Course</Text>
      </TouchableOpacity>
    </View>
  );
}
*/

// ============================================================================
// AFTER: Versioned Implementation (New)
// ============================================================================

import { useCourses } from '@/hooks/useVersionedApi';
import { useBatchOperations } from '@/hooks/useVersionedApi';
import { VersionInfo } from '@/components/VersionInfo';
import { versionedApiClient } from '@/services/VersionedApiClient';
import { formatDate } from '@/i18n';

interface Course {
  id: string;
  course_name: string;
  course_code?: string;
  about_course?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

function CoursesScreenVersioned() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  // Versioned API with automatic state management
  const {
    data: courses,
    loading,
    error,
    deprecationWarning,
    sunsetDate,
    migrationGuide,
    refetch,
  } = useCourses();

  // Batch operations for multiple actions
  const { executeBatch, loading: batchLoading } = useBatchOperations();

  const handleCreateCourse = async (
    courseData: Omit<Course, 'id' | 'created_at' | 'updated_at'>,
  ) => {
    try {
      const response = await versionedApiClient.createCourse(courseData);

      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      if (response.deprecationWarning) {
        console.warn('API version is deprecated:', {
          sunsetDate: response.sunsetDate,
          migrationGuide: response.migrationGuide,
        });
      }

      setShowAddModal(false);
      await refetch();
    } catch (err) {
      Alert.alert('Error', 'Failed to create course');
    }
  };

  const handleUpdateCourse = async (
    courseId: string,
    updates: Partial<Course>,
  ) => {
    try {
      const response = await versionedApiClient.updateCourse(courseId, updates);

      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      await refetch();
    } catch (err) {
      Alert.alert('Error', 'Failed to update course');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      const response = await versionedApiClient.deleteCourse(courseId);

      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      await refetch();
    } catch (err) {
      Alert.alert('Error', 'Failed to delete course');
    }
  };

  // Batch operations for multiple courses
  const handleBatchDelete = async () => {
    if (selectedCourses.length === 0) return;

    const operations = selectedCourses.map(courseId => ({
      type: 'course',
      table: 'courses',
      action: 'delete',
      filters: { id: courseId },
    }));

    const result = await executeBatch(operations);

    if (result.success) {
      setSelectedCourses([]);
      await refetch();
    } else {
      Alert.alert('Error', result.error || 'Failed to delete courses');
    }
  };

  const handleBatchUpdate = async (updates: Partial<Course>) => {
    if (selectedCourses.length === 0) return;

    const operations = selectedCourses.map(courseId => ({
      type: 'course',
      table: 'courses',
      action: 'update',
      data: updates,
      filters: { id: courseId },
    }));

    const result = await executeBatch(operations);

    if (result.success) {
      setSelectedCourses([]);
      await refetch();
    } else {
      Alert.alert('Error', result.error || 'Failed to update courses');
    }
  };

  if (loading) return <Text style={styles.loading}>Loading...</Text>;
  if (error) return <Text style={styles.error}>Error: {error}</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Courses</Text>

      {/* Version information and warnings */}
      {deprecationWarning && (
        <VersionInfo
          showDetails
          onUpgrade={() => {
            Alert.alert(
              'API Upgrade Available',
              'A newer API version is available. Would you like to upgrade?',
              [
                { text: 'Later', style: 'cancel' },
                {
                  text: 'Upgrade',
                  onPress: () => versionedApiClient.upgradeToLatest(),
                },
              ],
            );
          }}
        />
      )}

      {/* Batch selection controls */}
      {selectedCourses.length > 0 && (
        <View style={styles.batchControls}>
          <Text style={styles.batchText}>
            {selectedCourses.length} course
            {selectedCourses.length !== 1 ? 's' : ''} selected
          </Text>
          <View style={styles.batchActions}>
            <TouchableOpacity
              style={styles.batchButton}
              onPress={() =>
                handleBatchUpdate({ course_name: 'Updated in Batch' })
              }
              disabled={batchLoading}>
              <Ionicons name="pencil" size={16} color="white" />
              <Text style={styles.batchButtonText}>Update</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.batchButton, styles.deleteButton]}
              onPress={handleBatchDelete}
              disabled={batchLoading}>
              <Ionicons name="trash" size={16} color="white" />
              <Text style={styles.batchButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Courses list */}
      {courses?.map(course => (
        <View
          key={course.id}
          style={[
            styles.courseItem,
            selectedCourses.includes(course.id) && styles.selectedCourse,
          ]}>
          <TouchableOpacity
            style={styles.courseContent}
            onPress={() => {
              if (selectedCourses.includes(course.id)) {
                setSelectedCourses(prev => prev.filter(id => id !== course.id));
              } else {
                setSelectedCourses(prev => [...prev, course.id]);
              }
            }}>
            <Text style={styles.courseName}>{course.course_name}</Text>
            <Text style={styles.courseCode}>{course.course_code}</Text>
            <Text style={styles.courseDate}>
              Created: {formatDate(new Date(course.created_at))}
            </Text>
          </TouchableOpacity>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() =>
                handleUpdateCourse(course.id, {
                  course_name: 'Updated Name',
                })
              }>
              <Ionicons name="pencil" size={20} color="#007AFF" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleDeleteCourse(course.id)}>
              <Ionicons name="trash" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}>
        <Ionicons name="add" size={24} color="white" />
        <Text style={styles.addButtonText}>Add Course</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  loading: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 50,
  },
  error: {
    textAlign: 'center',
    fontSize: 16,
    color: '#FF3B30',
    marginTop: 50,
  },
  courseItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedCourse: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
    borderWidth: 1,
  },
  courseContent: {
    flex: 1,
  },
  courseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  courseCode: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  courseDate: {
    fontSize: 12,
    color: '#999',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  batchControls: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batchText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '500',
  },
  batchActions: {
    flexDirection: 'row',
    gap: 8,
  },
  batchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  batchButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default CoursesScreenVersioned;
