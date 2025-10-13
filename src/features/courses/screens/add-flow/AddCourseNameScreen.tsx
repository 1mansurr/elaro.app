import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAddCourse } from '@/features/courses/contexts/AddCourseContext';
import { AddCourseStackParamList } from '@/navigation/AddCourseNavigator';

// Define the navigation prop type for this screen
type AddCourseNameScreenNavigationProp = StackNavigationProp<
  AddCourseStackParamList,
  'AddCourseName'
>;

const AddCourseNameScreen = () => {
  const navigation = useNavigation<AddCourseNameScreenNavigationProp>();
  const { courseData, updateCourseData } = useAddCourse();

  const [courseName, setCourseName] = useState(courseData.courseName || '');
  const [courseCode, setCourseCode] = useState(courseData.courseCode || '');

  const handleNext = () => {
    if (!courseName.trim()) {
      Alert.alert('Course name is required.');
      return;
    }
    updateCourseData({ 
      courseName: courseName.trim(),
      courseCode: courseCode.trim()
    });
    navigation.navigate('AddCourseDescription');
  };

  const handleCancel = () => {
    // This will close the modal navigator
    navigation.getParent()?.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What&apos;s the course name?</Text>
      
      <TextInput
        style={styles.input}
        placeholder="e.g., Introduction to Psychology"
        value={courseName}
        onChangeText={setCourseName}
        autoFocus={true} // Automatically focus the input
        autoCapitalize="words"
      />

      <Text style={styles.label}>Course Code (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., PSY 101"
        value={courseCode}
        onChangeText={setCourseCode}
        autoCapitalize="characters"
      />

      <View style={styles.buttonContainer}>
        <Button title="Cancel" onPress={handleCancel} color="#888" />
        <Button title="Next" onPress={handleNext} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 8, fontSize: 18 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 },
});

export default AddCourseNameScreen;
