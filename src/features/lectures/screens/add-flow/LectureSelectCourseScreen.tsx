import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AddLectureStackParamList } from '@/navigation/AddLectureNavigator';
import { useAddLecture } from '@/features/lectures/contexts/AddLectureContext';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { Course } from '@/types';
import { Button } from '@/shared/components';

type SelectCourseScreenNavigationProp = StackNavigationProp<AddLectureStackParamList, 'SelectCourse'>;

const SelectCourseScreen = () => {
  const navigation = useNavigation<SelectCourseScreenNavigationProp>();
  const { lectureData, updateLectureData } = useAddLecture();
  const { session, user } = useAuth();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isGuest = !session;

  useEffect(() => {
    const fetchCourses = async () => {
      if (isGuest) return; // Don't fetch for guests
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase.from('courses').select('id, course_name, course_code, about_course');
        
        if (error) {
          Alert.alert('Error', 'Could not fetch your courses.');
          return;
        }
        
        const formattedCourses = (data || []).map(course => ({
          id: course.id,
          courseName: course.course_name,
          courseCode: course.course_code,
          aboutCourse: course.about_course,
          userId: user?.id || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })) as Course[];
        
        setCourses(formattedCourses);
      } catch (error) {
        console.error('Error fetching courses:', error);
        Alert.alert('Error', 'Could not fetch your courses.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCourses();
  }, [isGuest, user?.id]);

  const handleCourseSelect = (course: Course) => {
    updateLectureData({ course });
    setShowCourseDropdown(false);
  };

  const handleContinue = () => {
    if (!lectureData.course) {
      Alert.alert('Error', 'Please select a course to continue.');
      return;
    }
    
    navigation.navigate('DateTime');
  };

  const handleAddCourse = () => {
    // Navigate to add course flow
    // For now, we'll use the existing modal
    setShowCourseDropdown(false);
    // navigation.navigate('AddCourseFlow'); // This would be ideal
    Alert.alert('Add Course', 'Please use the main menu to add a course first.');
  };

  if (isGuest) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Course</Text>
          <Text style={styles.subtitle}>Step 1 of 4</Text>
        </View>
        
        <View style={styles.guestContainer}>
          <Text style={styles.guestText}>
            Create an account to save your lectures and get reminders.
          </Text>
          <Button 
            title="Sign Up" 
            onPress={() => {
              // Navigate to auth
              Alert.alert('Sign Up', 'Please use the main menu to create an account.');
            }} 
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Course</Text>
        <Text style={styles.subtitle}>Step 1 of 4</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Choose a course for your lecture *</Text>
        
        <TouchableOpacity
          style={styles.courseInput}
          onPress={() => setShowCourseDropdown(true)}
          disabled={isLoading}
        >
          <Text style={[styles.courseInputText, !lectureData.course && styles.placeholderText]}>
            {isLoading 
              ? 'Loading courses...' 
              : lectureData.course?.courseName || (courses.length === 0 ? 'Please add a course first' : 'Select a course')
            }
          </Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>

        <Modal
          visible={showCourseDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCourseDropdown(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowCourseDropdown(false)}
          >
            <View style={styles.dropdownContainer}>
              {courses.length === 0 ? (
                <View style={styles.noCoursesContainer}>
                  <Text style={styles.noCoursesText}>You have no courses.</Text>
                  <TouchableOpacity
                    style={styles.addCourseButton}
                    onPress={handleAddCourse}
                  >
                    <Text style={styles.addCourseButtonText}>Add a Course</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView style={styles.coursesList}>
                  {courses.map(course => (
                    <TouchableOpacity
                      key={course.id}
                      style={[
                        styles.dropdownOption,
                        lectureData.course?.id === course.id && styles.selectedOption
                      ]}
                      onPress={() => handleCourseSelect(course)}
                    >
                      <Text style={styles.dropdownOptionText}>{course.courseName}</Text>
                      {course.courseCode && (
                        <Text style={styles.courseCode}>{course.courseCode}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        {lectureData.course && (
          <View style={styles.selectedCourseInfo}>
            <Text style={styles.selectedCourseTitle}>Selected Course:</Text>
            <Text style={styles.selectedCourseName}>{lectureData.course.courseName}</Text>
            {lectureData.course.courseCode && (
              <Text style={styles.selectedCourseCode}>{lectureData.course.courseCode}</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Button 
          title="Continue" 
          onPress={handleContinue}
          disabled={!lectureData.course}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  courseInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  courseInputText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 20,
    maxHeight: 400,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  coursesList: {
    maxHeight: 300,
  },
  dropdownOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedOption: {
    backgroundColor: '#f0f8ff',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  courseCode: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  noCoursesContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noCoursesText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  addCourseButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addCourseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedCourseInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedCourseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  selectedCourseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  selectedCourseCode: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  guestText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
});

export default SelectCourseScreen;
