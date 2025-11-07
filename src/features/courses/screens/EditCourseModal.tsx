// FILE: src/features/courses/screens/EditCourseModal.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@/types';
import { Input, Button, QueryStateWrapper } from '@/shared/components';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { coursesApiMutations } from '@/features/courses/services/mutations';
import { useCourseDetail } from '@/hooks/useCourseDetail';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';

type EditCourseModalRouteProp = RouteProp<
  RootStackParamList,
  'EditCourseModal'
>;

const EditCourseModal = () => {
  const navigation = useNavigation();
  const route = useRoute<EditCourseModalRouteProp>();
  const { courseId } = route.params;
  const { user } = useAuth();
  const { isOnline } = useNetwork();

  // Fetch course details using React Query
  const {
    data: courseData,
    isLoading,
    isError,
    error,
    refetch,
  } = useCourseDetail(courseId);

  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [aboutCourse, setAboutCourse] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Update form fields when course data is loaded
  useEffect(() => {
    if (courseData) {
      setCourseName(courseData.courseName);
      setCourseCode(courseData.courseCode || '');
      setAboutCourse(courseData.aboutCourse || '');
    }
  }, [courseData]);

  const handleSave = async () => {
    if (!courseName.trim()) {
      Alert.alert('Error', 'Course name is required.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    setIsSaving(true);
    try {
      // Use the offline-aware mutation service
      await coursesApiMutations.update(
        courseId,
        {
          course_name: courseName.trim(),
          course_code: courseCode.trim(),
          about_course: aboutCourse.trim(),
        },
        isOnline,
        user.id,
      );

      navigation.goBack();
    } catch (error) {
      const errorTitle = getErrorTitle(error);
      const errorMessage = mapErrorCodeToMessage(error);
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <QueryStateWrapper
      isLoading={isLoading}
      isError={isError}
      error={error}
      data={courseData}
      refetch={refetch}
      emptyTitle="Course Not Found"
      emptyMessage="The course you're trying to edit could not be found."
      emptyIcon="alert-circle-outline">
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

        <Button
          title="Save Changes"
          onPress={handleSave}
          disabled={isSaving}
          loading={isSaving}
        />
      </View>
    </QueryStateWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
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
