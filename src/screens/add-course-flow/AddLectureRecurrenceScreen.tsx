import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAddCourse, AddCourseData } from '../../contexts/AddCourseContext';
import { AddCourseStackParamList } from '../../navigation/AddCourseNavigator';

type ScreenNavigationProp = StackNavigationProp<AddCourseStackParamList, 'AddLectureRecurrence'>;

const RecurrenceOptions: AddCourseData['recurrence'][] = ['weekly', 'bi-weekly'];

const AddLectureRecurrenceScreen = () => {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { courseData, updateCourseData } = useAddCourse();

  const [repeats, setRepeats] = useState(courseData.recurrence !== 'none');
  const [recurrence, setRecurrence] = useState(courseData.recurrence === 'none' ? 'weekly' : courseData.recurrence);

  const handleNext = () => {
    const finalRecurrence = repeats ? recurrence : 'none';
    updateCourseData({ recurrence: finalRecurrence });
    navigation.navigate('AddLectureReminders');
  };

  const handleBack = () => {
    const finalRecurrence = repeats ? recurrence : 'none';
    updateCourseData({ recurrence: finalRecurrence });
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Does this lecture repeat?</Text>
      
      <View style={styles.switchContainer}>
        <Text style={styles.label}>Repeat Lecture</Text>
        <Switch
          value={repeats}
          onValueChange={setRepeats}
        />
      </View>

      {repeats && (
        <View style={styles.optionsContainer}>
          <Text style={styles.label}>How often?</Text>
          <View style={styles.segmentedControl}>
            {RecurrenceOptions.map(option => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.segmentButton,
                  recurrence === option && styles.segmentButtonActive
                ]}
                onPress={() => setRecurrence(option)}
              >
                <Text style={[
                  styles.segmentText,
                  recurrence === option && styles.segmentTextActive
                ]}>
                  {option === 'bi-weekly' ? 'Every 2 Weeks' : 'Weekly'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <Button title="Back" onPress={handleBack} color="#888" />
        <Button title="Next" onPress={handleNext} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 40 },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  label: { fontSize: 18, fontWeight: '500' },
  optionsContainer: { marginTop: 20 },
  segmentedControl: { flexDirection: 'row', marginTop: 10, borderWidth: 1, borderColor: '#007AFF', borderRadius: 8, overflow: 'hidden' },
  segmentButton: { flex: 1, padding: 12, alignItems: 'center' },
  segmentButtonActive: { backgroundColor: '#007AFF' },
  segmentText: { fontSize: 16, color: '#007AFF' },
  segmentTextActive: { color: '#fff' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 60 },
});

export default AddLectureRecurrenceScreen;
