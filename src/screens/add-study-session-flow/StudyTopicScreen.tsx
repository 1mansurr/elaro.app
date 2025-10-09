import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AddStudySessionStackParamList } from '../../navigation/AddStudySessionNavigator';
import { useAddStudySession } from '../../contexts/AddStudySessionContext';
import { Input, Button } from '../../components';

type StudyTopicScreenNavigationProp = StackNavigationProp<AddStudySessionStackParamList, 'StudyTopic'>;

const StudyTopicScreen = () => {
  const navigation = useNavigation<StudyTopicScreenNavigationProp>();
  const { sessionData, updateSessionData } = useAddStudySession();

  const handleTopicChange = (topic: string) => {
    updateSessionData({ topic });
  };

  const handleDescriptionChange = (description: string) => {
    updateSessionData({ description });
  };

  const handleContinue = () => {
    if (!sessionData.topic.trim()) {
      return;
    }
    
    navigation.navigate('SessionDate');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const isValid = sessionData.topic.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Study Topic</Text>
        <Text style={styles.subtitle}>Step 2 of 5</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>What will you study?</Text>
        <Text style={styles.sectionDescription}>
          Choose a specific topic or subject you want to focus on during this study session.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Topic *</Text>
          <Input
            value={sessionData.topic}
            onChangeText={handleTopicChange}
            placeholder="e.g., Calculus derivatives, World War II, Organic chemistry"
            autoFocus={true}
            maxLength={100}
          />
          <Text style={styles.characterCount}>
            {sessionData.topic.length}/100 characters
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Description (Optional)</Text>
          <Input
            value={sessionData.description}
            onChangeText={handleDescriptionChange}
            placeholder="Additional notes about what you plan to study..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={300}
          />
          <Text style={styles.characterCount}>
            {sessionData.description.length}/300 characters
          </Text>
        </View>

        {sessionData.topic.trim() && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Study Session Preview:</Text>
            <Text style={styles.previewText}>
              <Text style={styles.bold}>Topic:</Text> {sessionData.topic.trim()}
            </Text>
            <Text style={styles.previewText}>
              <Text style={styles.bold}>Course:</Text> {sessionData.course?.course_name}
            </Text>
            {sessionData.description.trim() && (
              <Text style={styles.previewText}>
                <Text style={styles.bold}>Notes:</Text> {sessionData.description.trim()}
              </Text>
            )}
          </View>
        )}

        <View style={styles.examplesContainer}>
          <Text style={styles.examplesTitle}>💡 Topic Examples:</Text>
          <Text style={styles.exampleText}>
            • "Chapter 5: Photosynthesis"
          </Text>
          <Text style={styles.exampleText}>
            • "Integration techniques"
          </Text>
          <Text style={styles.exampleText}>
            • "French Revolution causes"
          </Text>
          <Text style={styles.exampleText}>
            • "Lab report: Enzyme kinetics"
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
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  previewContainer: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  previewText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
    color: '#333',
  },
  examplesContainer: {
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6f2ff',
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  exampleText: {
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

export default StudyTopicScreen;
