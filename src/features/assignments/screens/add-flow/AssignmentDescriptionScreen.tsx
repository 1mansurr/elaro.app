import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AddAssignmentStackParamList } from '@/navigation/AddAssignmentNavigator';
// import { useAddAssignment } from '@/features/assignments/contexts/AddAssignmentContext';
import { Input, Button } from '@/shared/components';

type AssignmentDescriptionScreenNavigationProp = StackNavigationProp<
  AddAssignmentStackParamList,
  'AssignmentDescription'
>;

const AssignmentDescriptionScreen = () => {
  const navigation = useNavigation<AssignmentDescriptionScreenNavigationProp>();
  // const { assignmentData, updateAssignmentData } = useAddAssignment();
  // Mock data for now
  const assignmentData = {
    courseId: null,
    course: null,
    title: '',
    description: '',
    dueDate: null,
    submissionMethod: null,
    reminders: [],
  };
  const updateAssignmentData = (data: any) => {
    console.log('Mock updateAssignmentData:', data);
  };

  const handleDescriptionChange = (description: string) => {
    updateAssignmentData({ description });
  };

  const handleContinue = () => {
    navigation.navigate('DueDate');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Description</Text>
        <Text style={styles.subtitle}>Step 3 of 6</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Add more details (optional)</Text>
        <Text style={styles.sectionDescription}>
          Include any additional information about your assignment,
          requirements, or notes.
        </Text>

        <View style={styles.inputContainer}>
          <Input
            value={assignmentData.description}
            onChangeText={handleDescriptionChange}
            placeholder="Enter assignment description or requirements..."
            multiline
            numberOfLines={6}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>
            {assignmentData.description.length}/500 characters
          </Text>
        </View>

        {assignmentData.description.trim() && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Preview:</Text>
            <Text style={styles.previewText}>
              {assignmentData.description.trim()}
            </Text>
          </View>
        )}

        <View style={styles.examplesContainer}>
          <Text style={styles.examplesTitle}>Examples:</Text>
          <Text style={styles.exampleText}>
            • &quot;Research paper on climate change, 2000 words minimum&quot;
          </Text>
          <Text style={styles.exampleText}>
            • &quot;Group project presentation, 15 minutes&quot;
          </Text>
          <Text style={styles.exampleText}>
            • &quot;Submit via Canvas, include bibliography&quot;
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => navigation.navigate('DueDate')}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>

          <View style={styles.continueButtonContainer}>
            <Button title="Continue" onPress={handleContinue} />
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
  inputContainer: {
    marginBottom: 24,
  },
  characterCount: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  previewContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
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

export default AssignmentDescriptionScreen;
