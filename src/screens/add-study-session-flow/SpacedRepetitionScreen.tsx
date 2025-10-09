import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AddStudySessionStackParamList } from '../../navigation/AddStudySessionNavigator';
import { useAddStudySession } from '../../contexts/AddStudySessionContext';
import { Button } from '../../components';

type SpacedRepetitionScreenNavigationProp = StackNavigationProp<AddStudySessionStackParamList, 'SpacedRepetition'>;

const SpacedRepetitionScreen = () => {
  const navigation = useNavigation<SpacedRepetitionScreenNavigationProp>();
  const { sessionData, updateSessionData } = useAddStudySession();

  const handleSpacedRepetitionToggle = (value: boolean) => {
    updateSessionData({ hasSpacedRepetition: value });
  };

  const handleContinue = () => {
    navigation.navigate('Reminders');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSkip = () => {
    // Skip to reminders with default spaced repetition setting
    updateSessionData({ hasSpacedRepetition: false });
    navigation.navigate('Reminders');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Spaced Repetition</Text>
        <Text style={styles.subtitle}>Step 4 of 5</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Enable spaced repetition?</Text>
        <Text style={styles.sectionDescription}>
          Spaced repetition helps you remember information better by reviewing material at increasing intervals.
        </Text>

        <View style={styles.toggleContainer}>
          <View style={styles.toggleContent}>
            <View style={styles.toggleHeader}>
              <Text style={styles.toggleLabel}>Spaced Repetition</Text>
              <Switch
                value={sessionData.hasSpacedRepetition}
                onValueChange={handleSpacedRepetitionToggle}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={sessionData.hasSpacedRepetition ? '#fff' : '#f4f3f4'}
              />
            </View>
            <Text style={styles.toggleDescription}>
              {sessionData.hasSpacedRepetition 
                ? 'You will be reminded to review this topic on days 1, 3, and 7 after your study session.'
                : 'Review reminders will not be scheduled for this study session.'
              }
            </Text>
          </View>
        </View>

        {sessionData.hasSpacedRepetition && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>📅 Review Schedule:</Text>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleDay}>Day 1</Text>
              <Text style={styles.scheduleDescription}>Initial review (same day)</Text>
            </View>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleDay}>Day 3</Text>
              <Text style={styles.scheduleDescription}>First spaced review</Text>
            </View>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleDay}>Day 7</Text>
              <Text style={styles.scheduleDescription}>Long-term retention review</Text>
            </View>
          </View>
        )}

        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>🧠 Benefits of Spaced Repetition:</Text>
          <Text style={styles.benefitText}>
            • Improves long-term memory retention
          </Text>
          <Text style={styles.benefitText}>
            • Reduces forgetting curve effects
          </Text>
          <Text style={styles.benefitText}>
            • Makes studying more efficient
          </Text>
          <Text style={styles.benefitText}>
            • Builds stronger neural pathways
          </Text>
        </View>

        {sessionData.hasSpacedRepetition && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Study Session Preview:</Text>
            <Text style={styles.previewText}>
              <Text style={styles.bold}>Topic:</Text> {sessionData.topic || 'Untitled'}
            </Text>
            <Text style={styles.previewText}>
              <Text style={styles.bold}>Course:</Text> {sessionData.course?.course_name}
            </Text>
            <Text style={styles.previewText}>
              <Text style={styles.bold}>Date:</Text> {sessionData.sessionDate?.toLocaleDateString()} at {sessionData.sessionDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={styles.previewText}>
              <Text style={styles.bold}>Spaced Repetition:</Text> Enabled ✅
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
  toggleContainer: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 24,
  },
  toggleContent: {
    flex: 1,
  },
  toggleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  toggleDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  infoContainer: {
    backgroundColor: '#e8f5e8',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 12,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleDay: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
    width: 50,
  },
  scheduleDescription: {
    fontSize: 14,
    color: '#2e7d32',
    flex: 1,
  },
  benefitsContainer: {
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6f2ff',
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  previewContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
    color: '#333',
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

export default SpacedRepetitionScreen;
