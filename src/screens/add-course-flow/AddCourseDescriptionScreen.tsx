import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAddCourse } from '../../contexts/AddCourseContext';
import { AddCourseStackParamList } from '../../navigation/AddCourseNavigator';

type AddCourseDescriptionScreenNavigationProp = StackNavigationProp<
  AddCourseStackParamList,
  'AddCourseDescription'
>;

const AddCourseDescriptionScreen = () => {
  const navigation = useNavigation<AddCourseDescriptionScreenNavigationProp>();
  const { courseData, updateCourseData } = useAddCourse();

  const [description, setDescription] = useState(courseData.courseDescription || '');

  const handleNext = () => {
    updateCourseData({ courseDescription: description.trim() });
    navigation.navigate('AddLectureDateTime');
  };

  const handleSkip = () => {
    // Ensure description is empty if skipped
    updateCourseData({ courseDescription: '' });
    navigation.navigate('AddLectureDateTime');
  };

  const handleBack = () => {
    // Save current input before going back
    updateCourseData({ courseDescription: description });
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add a description (Optional)</Text>
      
      <TextInput
        style={styles.input}
        placeholder="e.g., A study of the human mind and behavior..."
        value={description}
        onChangeText={setDescription}
        multiline={true}
        numberOfLines={4}
        autoCapitalize="sentences"
      />

      <View style={styles.buttonContainer}>
        <Button title="Back" onPress={handleBack} color="#888" />
        <Button title="Skip" onPress={handleSkip} color="#888" />
        <Button title="Next" onPress={handleNext} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 },
});

export default AddCourseDescriptionScreen;
