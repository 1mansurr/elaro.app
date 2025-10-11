import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AddAssignmentStackParamList } from '@/navigation/AddAssignmentNavigator';
import { useAddAssignment } from '@/features/assignments/contexts/AddAssignmentContext';
import { Button } from '@/shared/components';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

type DueDateScreenNavigationProp = StackNavigationProp<AddAssignmentStackParamList, 'DueDate'>;

const DueDateScreen = () => {
  const navigation = useNavigation<DueDateScreenNavigationProp>();
  const { assignmentData, updateAssignmentData } = useAddAssignment();
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Initialize with current date/time if not set
  const dueDate = assignmentData.dueDate || new Date();

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const newDueDate = new Date(selectedDate);
      newDueDate.setHours(dueDate.getHours());
      newDueDate.setMinutes(dueDate.getMinutes());
      
      updateAssignmentData({ dueDate: newDueDate });
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newDueDate = new Date(dueDate);
      newDueDate.setHours(selectedTime.getHours());
      newDueDate.setMinutes(selectedTime.getMinutes());
      
      updateAssignmentData({ dueDate: newDueDate });
    }
  };

  const handleContinue = () => {
    if (!assignmentData.dueDate) {
      return;
    }
    
    navigation.navigate('SubmissionMethod');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const isValid = assignmentData.dueDate && assignmentData.dueDate > new Date();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Due Date</Text>
        <Text style={styles.subtitle}>Step 4 of 6</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>When is this assignment due?</Text>
        <Text style={styles.sectionDescription}>
          Set the date and time when you need to submit your assignment.
        </Text>
        
        <View style={styles.datetimeSection}>
          <Text style={styles.label}>Due Date & Time</Text>
          
          <View style={styles.datetimeRow}>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateTimeButtonText}>
                {format(dueDate, 'MMM dd, yyyy')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.dateTimeButtonText}>
                {format(dueDate, 'h:mm a')}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={dueDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={dueDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          )}
        </View>

        {!isValid && assignmentData.dueDate && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              Due date must be in the future
            </Text>
          </View>
        )}

        {assignmentData.dueDate && isValid && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Assignment Summary:</Text>
            <Text style={styles.summaryText}>
              <Text style={styles.bold}>{assignmentData.title || 'Untitled Assignment'}</Text>
            </Text>
            <Text style={styles.summaryText}>
              Due: {format(dueDate, 'EEEE, MMM dd, yyyy')} at {format(dueDate, 'h:mm a')}
            </Text>
            <Text style={styles.summaryText}>
              Course: {assignmentData.course?.courseName}
            </Text>
          </View>
        )}

        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Tips:</Text>
          <Text style={styles.tipText}>
            • Set reminders to avoid last-minute stress
          </Text>
          <Text style={styles.tipText}>
            • Consider time zones if submitting online
          </Text>
          <Text style={styles.tipText}>
            • Factor in time for review and submission
          </Text>
        </View>
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
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    lineHeight: 24,
  },
  datetimeSection: {
    marginBottom: 24,
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
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
    color: '#333',
  },
  tipsContainer: {
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6f2ff',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
});

export default DueDateScreen;
