import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AddStudySessionStackParamList } from '../../navigation/AddStudySessionNavigator';
import { useAddStudySession } from '../../contexts/AddStudySessionContext';
import { Button } from '../../components';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

type SessionDateScreenNavigationProp = StackNavigationProp<AddStudySessionStackParamList, 'SessionDate'>;

const SessionDateScreen = () => {
  const navigation = useNavigation<SessionDateScreenNavigationProp>();
  const { sessionData, updateSessionData } = useAddStudySession();
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Initialize with current date/time if not set
  const sessionDate = sessionData.sessionDate || new Date();

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const newSessionDate = new Date(selectedDate);
      newSessionDate.setHours(sessionDate.getHours());
      newSessionDate.setMinutes(sessionDate.getMinutes());
      
      updateSessionData({ sessionDate: newSessionDate });
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newSessionDate = new Date(sessionDate);
      newSessionDate.setHours(selectedTime.getHours());
      newSessionDate.setMinutes(selectedTime.getMinutes());
      
      updateSessionData({ sessionDate: newSessionDate });
    }
  };

  const handleContinue = () => {
    if (!sessionData.sessionDate) {
      return;
    }
    
    navigation.navigate('SpacedRepetition');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const isValid = sessionData.sessionDate && sessionData.sessionDate > new Date();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Session Date</Text>
        <Text style={styles.subtitle}>Step 3 of 5</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>When will you study?</Text>
        <Text style={styles.sectionDescription}>
          Set the date and time for your study session. Choose a time when you can focus without distractions.
        </Text>
        
        <View style={styles.datetimeSection}>
          <Text style={styles.label}>Date & Time</Text>
          
          <View style={styles.datetimeRow}>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateTimeButtonText}>
                {format(sessionDate, 'MMM dd, yyyy')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.dateTimeButtonText}>
                {format(sessionDate, 'h:mm a')}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={sessionDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={sessionDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          )}
        </View>

        {!isValid && sessionData.sessionDate && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              Study session must be scheduled for the future
            </Text>
          </View>
        )}

        {sessionData.sessionDate && isValid && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Study Session Summary:</Text>
            <Text style={styles.summaryText}>
              <Text style={styles.bold}>Topic:</Text> {sessionData.topic || 'Untitled'}
            </Text>
            <Text style={styles.summaryText}>
              <Text style={styles.bold}>Date:</Text> {format(sessionDate, 'EEEE, MMM dd, yyyy')} at {format(sessionDate, 'h:mm a')}
            </Text>
            <Text style={styles.summaryText}>
              <Text style={styles.bold}>Course:</Text> {sessionData.course?.course_name}
            </Text>
          </View>
        )}

        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Study Timing Tips:</Text>
          <Text style={styles.tipText}>
            • Choose your most productive time of day
          </Text>
          <Text style={styles.tipText}>
            • Allow for breaks between sessions
          </Text>
          <Text style={styles.tipText}>
            • Consider your energy levels
          </Text>
          <Text style={styles.tipText}>
            • Set realistic time blocks (25-50 minutes)
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

export default SessionDateScreen;
