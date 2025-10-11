import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AddLectureStackParamList } from '@/navigation/AddLectureNavigator';
import { useAddLecture } from '@/features/lectures/contexts/AddLectureContext';
import { Button } from '@/shared/components';

type RecurrenceScreenNavigationProp = StackNavigationProp<AddLectureStackParamList, 'Recurrence'>;

const RecurrenceScreen = () => {
  const navigation = useNavigation<RecurrenceScreenNavigationProp>();
  const { lectureData, updateLectureData } = useAddLecture();

  const recurrenceOptions = [
    { value: 'none', label: 'One-time only', description: 'This is a single lecture' },
    { value: 'weekly', label: 'Weekly', description: 'Repeat every week' },
    { value: 'bi-weekly', label: 'Bi-weekly', description: 'Repeat every 2 weeks' },
  ] as const;

  const handleRecurrenceSelect = (recurrence: 'none' | 'weekly' | 'bi-weekly') => {
    updateLectureData({ recurrence });
  };

  const handleContinue = () => {
    navigation.navigate('Reminders');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSkip = () => {
    // Skip to reminders with default recurrence
    updateLectureData({ recurrence: 'none' });
    navigation.navigate('Reminders');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Recurrence</Text>
        <Text style={styles.subtitle}>Step 3 of 4</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>How often should this lecture repeat?</Text>
        <Text style={styles.sectionDescription}>
          Choose if this lecture happens regularly or is just a one-time event.
        </Text>

        <View style={styles.optionsContainer}>
          {recurrenceOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionCard,
                lectureData.recurrence === option.value && styles.selectedOptionCard
              ]}
              onPress={() => handleRecurrenceSelect(option.value)}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionHeader}>
                  <Text style={[
                    styles.optionLabel,
                    lectureData.recurrence === option.value && styles.selectedOptionLabel
                  ]}>
                    {option.label}
                  </Text>
                  <View style={[
                    styles.radioButton,
                    lectureData.recurrence === option.value && styles.selectedRadioButton
                  ]}>
                    {lectureData.recurrence === option.value && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                </View>
                <Text style={[
                  styles.optionDescription,
                  lectureData.recurrence === option.value && styles.selectedOptionDescription
                ]}>
                  {option.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {lectureData.recurrence !== 'none' && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Preview:</Text>
            <Text style={styles.previewText}>
              This lecture will repeat {lectureData.recurrence === 'weekly' ? 'every week' : 'every 2 weeks'} 
              {' '}at the same time and day.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
          
          <View style={styles.continueButtonContainer}>
            <Button 
              title="Continue" 
              onPress={handleContinue}
            />
          </View>
        </View>
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
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 20,
    backgroundColor: '#fff',
  },
  selectedOptionCard: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  optionContent: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  selectedOptionLabel: {
    color: '#007AFF',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRadioButton: {
    borderColor: '#007AFF',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  selectedOptionDescription: {
    color: '#007AFF',
  },
  previewContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginTop: 24,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  continueButtonContainer: {
    flex: 1,
  },
});

export default RecurrenceScreen;
