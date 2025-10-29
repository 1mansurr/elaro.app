import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AddAssignmentStackParamList } from '@/navigation/AddAssignmentNavigator';
// import { useAddAssignment, SubmissionMethod } from '@/features/assignments/contexts/AddAssignmentContext';

// Mock SubmissionMethod type
type SubmissionMethod = 'file' | 'text' | 'url' | 'Online' | 'In-person';
import { Input, Button } from '@/shared/components';

type SubmissionMethodScreenNavigationProp = StackNavigationProp<AddAssignmentStackParamList, 'SubmissionMethod'>;

const SubmissionMethodScreen = () => {
  const navigation = useNavigation<SubmissionMethodScreenNavigationProp>();
  // const { assignmentData, updateAssignmentData } = useAddAssignment();
  // Mock data for now - proper structure
  const assignmentData = { 
    courseId: null, 
    course: { id: 'mock-course-id', courseName: 'Mock Course', courseCode: 'MOCK101' }, 
    title: "Mock Assignment", 
    description: "Mock description", 
    dueDate: new Date(), 
    submissionMethod: null, 
    submissionLink: '',
    reminders: [] 
  };
  const updateAssignmentData = (data: any) => { console.log("Mock updateAssignmentData:", data); };

  const handleMethodSelect = (method: SubmissionMethod) => {
    updateAssignmentData({ 
      submissionMethod: method,
      submissionLink: method === 'Online' ? assignmentData.submissionLink : ''
    });
  };

  const handleLinkChange = (link: string) => {
    updateAssignmentData({ submissionLink: link });
  };

  const handleContinue = () => {
    navigation.navigate('Reminders');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSkip = () => {
    // Skip to reminders with no submission method
    updateAssignmentData({ submissionMethod: null, submissionLink: '' });
    navigation.navigate('Reminders');
  };

  const isValid = !assignmentData.submissionMethod || 
    (assignmentData.submissionMethod === 'Online' && assignmentData.submissionLink.trim()) ||
    assignmentData.submissionMethod === 'In-person';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Submission Method</Text>
        <Text style={styles.subtitle}>Step 5 of 6</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>How will you submit this assignment?</Text>
        <Text style={styles.sectionDescription}>
          Choose how you plan to submit your assignment. This helps us provide better reminders.
        </Text>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.optionCard,
              assignmentData.submissionMethod === 'Online' && styles.selectedOptionCard
            ]}
            onPress={() => handleMethodSelect('Online')}
          >
            <View style={styles.optionContent}>
              <View style={styles.optionHeader}>
                <Text style={[
                  styles.optionLabel,
                  assignmentData.submissionMethod === 'Online' && styles.selectedOptionLabel
                ]}>
                  Online
                </Text>
                <View style={[
                  styles.radioButton,
                  assignmentData.submissionMethod === 'Online' && styles.selectedRadioButton
                ]}>
                  {assignmentData.submissionMethod === 'Online' && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </View>
              <Text style={[
                styles.optionDescription,
                assignmentData.submissionMethod === 'Online' && styles.selectedOptionDescription
              ]}>
                Submit through an online platform (Canvas, Blackboard, etc.)
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              assignmentData.submissionMethod === 'In-person' && styles.selectedOptionCard
            ]}
            onPress={() => handleMethodSelect('In-person')}
          >
            <View style={styles.optionContent}>
              <View style={styles.optionHeader}>
                <Text style={[
                  styles.optionLabel,
                  assignmentData.submissionMethod === 'In-person' && styles.selectedOptionLabel
                ]}>
                  In-person
                </Text>
                <View style={[
                  styles.radioButton,
                  assignmentData.submissionMethod === 'In-person' && styles.selectedRadioButton
                ]}>
                  {assignmentData.submissionMethod === 'In-person' && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </View>
              <Text style={[
                styles.optionDescription,
                assignmentData.submissionMethod === 'In-person' && styles.selectedOptionDescription
              ]}>
                Submit physically (paper, presentation, etc.)
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {assignmentData.submissionMethod === 'Online' && (
          <View style={styles.linkContainer}>
            <Text style={styles.linkLabel}>Submission Link (optional)</Text>
            <Input
              value={assignmentData.submissionLink}
              onChangeText={handleLinkChange}
              placeholder="https://canvas.university.edu/assignment/..."
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.linkHelper}>
              You can add this later or leave it blank
            </Text>
          </View>
        )}

        {assignmentData.submissionMethod && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Submission Details:</Text>
            <Text style={styles.previewText}>
              Method: {assignmentData.submissionMethod}
            </Text>
            {assignmentData.submissionMethod === 'Online' && assignmentData.submissionLink && (
              <Text style={styles.previewText}>
                Link: {assignmentData.submissionLink}
              </Text>
            )}
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
  optionsContainer: {
    gap: 16,
    marginBottom: 24,
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
  linkContainer: {
    marginBottom: 24,
  },
  linkLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  linkHelper: {
    fontSize: 12,
    color: '#666',
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
    fontSize: 14,
    color: '#333',
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

export default SubmissionMethodScreen;
