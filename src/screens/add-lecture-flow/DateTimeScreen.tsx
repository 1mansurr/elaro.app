import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AddLectureStackParamList } from '../../navigation/AddLectureNavigator';
import { useAddLecture } from '../../contexts/AddLectureContext';
import { Button } from '../../components';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

type DateTimeScreenNavigationProp = StackNavigationProp<AddLectureStackParamList, 'DateTime'>;

const DateTimeScreen = () => {
  const navigation = useNavigation<DateTimeScreenNavigationProp>();
  const { lectureData, updateLectureData } = useAddLecture();
  
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Initialize with current date/time if not set
  const startTime = lectureData.startTime || new Date();
  const endTime = lectureData.endTime || new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const newStartTime = new Date(selectedDate);
      newStartTime.setHours(startTime.getHours());
      newStartTime.setMinutes(startTime.getMinutes());
      
      updateLectureData({ startTime: newStartTime });
      
      // Update end time if it's before start time
      if (endTime <= newStartTime) {
        const newEndTime = new Date(newStartTime.getTime() + 60 * 60 * 1000); // 1 hour later
        updateLectureData({ endTime: newEndTime });
      }
    }
  };

  const handleStartTimeChange = (event: any, selectedTime?: Date) => {
    setShowStartTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newStartTime = new Date(startTime);
      newStartTime.setHours(selectedTime.getHours());
      newStartTime.setMinutes(selectedTime.getMinutes());
      
      updateLectureData({ startTime: newStartTime });
      
      // Update end time if it's before or same as start time
      if (endTime <= newStartTime) {
        const newEndTime = new Date(newStartTime.getTime() + 60 * 60 * 1000); // 1 hour later
        updateLectureData({ endTime: newEndTime });
      }
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const newEndTime = new Date(selectedDate);
      newEndTime.setHours(endTime.getHours());
      newEndTime.setMinutes(endTime.getMinutes());
      
      updateLectureData({ endTime: newEndTime });
    }
  };

  const handleEndTimeChange = (event: any, selectedTime?: Date) => {
    setShowEndTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newEndTime = new Date(endTime);
      newEndTime.setHours(selectedTime.getHours());
      newEndTime.setMinutes(selectedTime.getMinutes());
      
      updateLectureData({ endTime: newEndTime });
    }
  };

  const handleContinue = () => {
    if (!lectureData.startTime || !lectureData.endTime) {
      return;
    }
    
    if (lectureData.endTime <= lectureData.startTime) {
      return;
    }
    
    navigation.navigate('Recurrence');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const isValid = lectureData.startTime && lectureData.endTime && lectureData.endTime > lectureData.startTime;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Date & Time</Text>
        <Text style={styles.subtitle}>Step 2 of 4</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>When is your lecture?</Text>
        
        <View style={styles.datetimeSection}>
          <Text style={styles.label}>Start Date & Time</Text>
          
          <View style={styles.datetimeRow}>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.dateTimeButtonText}>
                {format(startTime, 'MMM dd, yyyy')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowStartTimePicker(true)}
            >
              <Text style={styles.dateTimeButtonText}>
                {format(startTime, 'h:mm a')}
              </Text>
            </TouchableOpacity>
          </View>

          {showStartDatePicker && (
            <DateTimePicker
              value={startTime}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleStartDateChange}
              minimumDate={new Date()}
            />
          )}

          {showStartTimePicker && (
            <DateTimePicker
              value={startTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleStartTimeChange}
            />
          )}
        </View>

        <View style={styles.datetimeSection}>
          <Text style={styles.label}>End Date & Time</Text>
          
          <View style={styles.datetimeRow}>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={styles.dateTimeButtonText}>
                {format(endTime, 'MMM dd, yyyy')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowEndTimePicker(true)}
            >
              <Text style={styles.dateTimeButtonText}>
                {format(endTime, 'h:mm a')}
              </Text>
            </TouchableOpacity>
          </View>

          {showEndDatePicker && (
            <DateTimePicker
              value={endTime}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleEndDateChange}
              minimumDate={startTime}
            />
          )}

          {showEndTimePicker && (
            <DateTimePicker
              value={endTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleEndTimeChange}
            />
          )}
        </View>

        {!isValid && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              {!lectureData.startTime || !lectureData.endTime 
                ? 'Please select both start and end times'
                : 'End time must be after start time'
              }
            </Text>
          </View>
        )}

        {lectureData.startTime && lectureData.endTime && isValid && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Lecture Summary:</Text>
            <Text style={styles.summaryText}>
              {lectureData.course?.course_name} • {format(startTime, 'MMM dd')} • {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Button 
          title="Continue" 
          onPress={handleContinue}
          disabled={!isValid}
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
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 24,
  },
  datetimeSection: {
    marginBottom: 32,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  datetimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  dateTimeButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
    marginTop: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
  summaryContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginTop: 24,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
});

export default DateTimeScreen;
