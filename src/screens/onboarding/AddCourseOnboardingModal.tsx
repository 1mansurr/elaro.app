import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Input, Button } from '../../components';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '../../constants/theme';

const AddCourseOnboardingModal = () => {
  const navigation = useNavigation();
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [aboutCourse, setAboutCourse] = useState('');

  const handleSave = () => {
    if (!courseName.trim()) {
      Alert.alert('Course Name Required', 'Please enter a name for your course.');
      return;
    }

    // Pass the new course data back to the OnboardingFormScreen
    navigation.navigate('OnboardingForm', {
      newCourse: {
        course_name: courseName.trim(),
        course_code: courseCode.trim(),
        about_course: aboutCourse.trim(),
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add a Course</Text>
      <Input
        label="Course Name *"
        value={courseName}
        onChangeText={setCourseName}
        placeholder="e.g., Introduction to Psychology"
      />
      <Input
        label="Course Code (Optional)"
        value={courseCode}
        onChangeText={setCourseCode}
        placeholder="e.g., PSY 101"
      />
      <Input
        label="About this Course (Optional)"
        value={aboutCourse}
        onChangeText={setAboutCourse}
        placeholder="A brief description of the course"
        multiline
        numberOfLines={3}
        style={styles.textArea}
      />
      <Button title="Save Course" onPress={handleSave} />
      <Button title="Cancel" onPress={() => navigation.goBack()} variant="outline" style={{ marginTop: SPACING.md }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
});

export default AddCourseOnboardingModal;
