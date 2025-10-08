import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAddCourse } from '../../contexts/AddCourseContext';
import { AddCourseStackParamList } from '../../navigation/AddCourseNavigator';

type ScreenNavigationProp = StackNavigationProp<AddCourseStackParamList, 'AddLectureDateTime'>;

const AddLectureDateTimeScreen = () => {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { courseData, updateCourseData } = useAddCourse();

  // Initialize with context data or default to now + 1 hour for end time
  const [startTime, setStartTime] = useState(courseData.startTime || new Date());
  const [endTime, setEndTime] = useState(courseData.endTime || new Date(new Date().getTime() + 60 * 60 * 1000));
  
  const [showPicker, setShowPicker] = useState<'start' | 'end' | 'none'>('none');

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || (showPicker === 'start' ? startTime : endTime);
    setShowPicker('none'); // Hide picker on all platforms
    if (event.type === 'set') {
      if (showPicker === 'start') {
        setStartTime(currentDate);
        // Also update end time to be 1 hour after new start time
        setEndTime(new Date(currentDate.getTime() + 60 * 60 * 1000));
      } else if (showPicker === 'end') {
        setEndTime(currentDate);
      }
    }
  };

  const handleNext = () => {
    if (endTime <= startTime) {
      Alert.alert('Invalid Time', 'End time must be after the start time.');
      return;
    }
    updateCourseData({ startTime, endTime });
    navigation.navigate('AddLectureRecurrence');
  };

  const handleBack = () => {
    updateCourseData({ startTime, endTime });
    navigation.goBack();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>When is the lecture?</Text>
      
      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Start Time</Text>
        <TouchableOpacity onPress={() => setShowPicker('start')} style={styles.pickerButton}>
          <Text style={styles.pickerText}>{formatDate(startTime)}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pickerContainer}>
        <Text style={styles.label}>End Time</Text>
        <TouchableOpacity onPress={() => setShowPicker('end')} style={styles.pickerButton}>
          <Text style={styles.pickerText}>{formatDate(endTime)}</Text>
        </TouchableOpacity>
      </View>

      {showPicker !== 'none' && (
        <DateTimePicker
          value={showPicker === 'start' ? startTime : endTime}
          mode="datetime"
          display="default"
          onChange={onDateChange}
        />
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
  pickerContainer: { marginBottom: 25 },
  label: { fontSize: 16, fontWeight: '500', marginBottom: 8 },
  pickerButton: { borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 8 },
  pickerText: { fontSize: 18, textAlign: 'center' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 },
});

export default AddLectureDateTimeScreen;
