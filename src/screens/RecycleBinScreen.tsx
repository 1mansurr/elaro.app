// FILE: src/screens/RecycleBinScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { Course } from '../types';

const RecycleBinScreen = () => {
  const [deletedCourses, setDeletedCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // To show loading on a specific item

  const fetchDeletedItems = useCallback(async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) console.error('Error fetching deleted courses:', error);
    else setDeletedCourses(data || []);
    
    setIsLoading(false);
  }, []);

  useFocusEffect(() => {
    fetchDeletedItems();
  });

  const handleRestore = async (courseId: string) => {
    setActionLoading(courseId);
    
    const { error } = await supabase.functions.invoke('restore-course', {
      body: { courseId },
    });

    if (error) {
      Alert.alert('Error', 'Failed to restore course.');
    } else {
      // Refresh the list after restoring
      fetchDeletedItems();
    }
    
    setActionLoading(null);
  };

  const handleDeletePermanently = async (courseId: string) => {
    Alert.alert(
      'Delete Permanently',
      'This action is irreversible. Are you sure you want to permanently delete this course?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(courseId);
            
            const { error } = await supabase.functions.invoke('delete-course-permanently', {
              body: { courseId },
            });

            if (error) {
              Alert.alert('Error', 'Failed to permanently delete course.');
            } else {
              // Refresh the list after deleting
              fetchDeletedItems();
            }
            
            setActionLoading(null);
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Course }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemName}>{item.course_name}</Text>
      <Text style={styles.itemDate}>
        Deleted on: {new Date(item.deleted_at!).toLocaleDateString()}
      </Text>
      
      <View style={styles.actionsContainer}>
        {actionLoading === item.id ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <>
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={() => handleRestore(item.id)}
            >
              <Text style={styles.buttonText}>Restore</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeletePermanently(item.id)}
            >
              <Text style={styles.buttonText}>Delete</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {deletedCourses.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Your recycle bin is empty.</Text>
        </View>
      ) : (
        <FlatList
          data={deletedCourses}
          renderItem={renderItem}
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
  },
  listContainer: {
    padding: 20,
  },
  itemContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#343a40',
  },
  itemDate: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  restoreButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default RecycleBinScreen;