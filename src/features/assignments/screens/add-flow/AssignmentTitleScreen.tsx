import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AddAssignmentStackParamList } from '@/navigation/AddAssignmentNavigator';
import { useAddAssignment } from '@/features/assignments/contexts/AddAssignmentContext';
import { Input, Button } from '@/shared/components';

type AssignmentTitleScreenNavigationProp = StackNavigationProp<AddAssignmentStackParamList, 'AssignmentTitle'>;

const AssignmentTitleScreen = () => {
  const navigation = useNavigation<AssignmentTitleScreenNavigationProp>();
  const { assignmentData, updateAssignmentData } = useAddAssignment();

  const handleTitleChange = (title: string) => {
    updateAssignmentData({ title });
  };

  const handleContinue = () => {
    if (!assignmentData.title.trim()) {
      return;
    }
    
    navigation.navigate('AssignmentDescription');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const isValid = assignmentData.title.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Assignment Title</Text>
        <Text style={styles.subtitle}>Step 2 of 6</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>What&apos;s your assignment about?</Text>
        <Text style={styles.sectionDescription}>
          Give your assignment a clear, descriptive title that helps you remember what it&apos;s for.
        </Text>

        <View style={styles.inputContainer}>
          <Input
            value={assignmentData.title}
            onChangeText={handleTitleChange}
            placeholder="Enter assignment title"
            autoFocus={true}
            maxLength={100}
          />
          <Text style={styles.characterCount}>
            {assignmentData.title.length}/100 characters
          </Text>
        </View>

        {assignmentData.title.trim() && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Preview:</Text>
            <Text style={styles.previewText}>
              Assignment: &quot;{assignmentData.title.trim()}&quot;
            </Text>
            <Text style={styles.previewSubtext}>
              For {assignmentData.course?.courseName}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={() => navigation.navigate('AssignmentDescription')}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
          
          <View style={styles.continueButtonContainer}>
            <Button 
              title="Continue" 
              onPress={handleContinue}
              disabled={!isValid}
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
    padding: 20,
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
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
    marginBottom: 4,
  },
  previewSubtext: {
    fontSize: 14,
    color: '#666',
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

export default AssignmentTitleScreen;
