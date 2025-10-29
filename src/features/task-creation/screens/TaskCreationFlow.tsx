/**
 * @deprecated This screen is not registered in the navigation structure.
 * The route 'TaskCreationFlow' has been removed from RootStackParamList.
 * 
 * This file is kept for reference but should not be used for navigation.
 * Consider using AddAssignmentFlow, AddLectureFlow, or AddStudySessionFlow instead.
 * 
 * Removed on: Navigation Audit - Pass 2 Fixes
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList } from '@/types';
import { DESIGN_SYSTEM, VISUAL_HIERARCHY } from '@/constants/designSystem';
import { PrimaryButton, SecondaryButton, OutlineButton } from '@/shared/components';
import { HeaderSection, ContentSection, ActionSection } from '@/shared/components/LayoutComponents';

// Note: TaskCreationFlow is not in RootStackParamList anymore
type TaskCreationFlowNavigationProp = StackNavigationProp<RootStackParamList>;

interface TaskCreationData {
  type: 'assignment' | 'lecture' | 'study_session';
  title: string;
  description: string;
  dueDate: Date;
  reminders: number[];
  course: any;
}

const TaskCreationFlow: React.FC = () => {
  const navigation = useNavigation<TaskCreationFlowNavigationProp>();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<TaskCreationData>({
    type: 'assignment',
    title: '',
    description: '',
    dueDate: new Date(),
    reminders: [120],
    course: null,
  });

  const steps = [
    {
      title: 'Task Type',
      component: TaskTypeStep,
    },
    {
      title: 'Details',
      component: TaskDetailsStep,
    },
    {
      title: 'Schedule',
      component: TaskScheduleStep,
    },
    {
      title: 'Review',
      component: TaskReviewStep,
    },
  ];

  const handleNext = useCallback((stepData: Partial<TaskCreationData>) => {
    setFormData(prev => ({ ...prev, ...stepData }));
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleCompleteTask();
    }
  }, [currentStep, steps.length]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigation.goBack();
    }
  }, [currentStep, navigation]);

  const handleCompleteTask = useCallback(() => {
    // Save task and navigate back
    console.log('Task created:', formData);
    navigation.goBack();
  }, [formData, navigation]);

  const CurrentStep = steps[currentStep].component;

  return (
    <View style={styles.container}>
      <HeaderSection>
        <Text style={styles.title}>{steps[currentStep].title}</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentStep + 1) / steps.length) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {currentStep + 1} of {steps.length}
          </Text>
        </View>
      </HeaderSection>

      <ContentSection>
        <ScrollView>
          <CurrentStep 
            data={formData}
            onNext={handleNext}
            onBack={handleBack}
            canGoBack={currentStep > 0}
          />
        </ScrollView>
      </ContentSection>

      <ActionSection>
        <View style={styles.buttonContainer}>
          <SecondaryButton
            title="Back"
            onPress={handleBack}
          />
          <PrimaryButton
            title={currentStep === steps.length - 1 ? 'Create Task' : 'Next'}
            onPress={() => handleNext({})}
          />
        </View>
      </ActionSection>
    </View>
  );
};

// Step Components
const TaskTypeStep: React.FC<{
  data: TaskCreationData;
  onNext: (data: Partial<TaskCreationData>) => void;
  onBack: () => void;
  canGoBack: boolean;
}> = ({ data, onNext }) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>What type of task?</Text>
    <Text style={styles.stepDescription}>
      Choose the type of task you want to create.
    </Text>
    
    <View style={styles.optionContainer}>
      <OutlineButton
        title="📚 Assignment"
        onPress={() => onNext({ type: 'assignment' })}
        style={data.type === 'assignment' ? styles.selectedOption : undefined}
      />
      <OutlineButton
        title="🎓 Lecture"
        onPress={() => onNext({ type: 'lecture' })}
        style={data.type === 'lecture' ? styles.selectedOption : undefined}
      />
      <OutlineButton
        title="📖 Study Session"
        onPress={() => onNext({ type: 'study_session' })}
        style={data.type === 'study_session' ? styles.selectedOption : undefined}
      />
    </View>
  </View>
);

const TaskDetailsStep: React.FC<{
  data: TaskCreationData;
  onNext: (data: Partial<TaskCreationData>) => void;
  onBack: () => void;
  canGoBack: boolean;
}> = ({ data, onNext }) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>Task Details</Text>
    <Text style={styles.stepDescription}>
      Provide the basic information for your task.
    </Text>
    
    <View style={styles.formContainer}>
      <Text style={styles.formLabel}>Title</Text>
      <Text style={styles.formInput}>{data.title || 'Enter task title'}</Text>
      
      <Text style={styles.formLabel}>Description</Text>
      <Text style={styles.formInput}>{data.description || 'Enter task description'}</Text>
    </View>
  </View>
);

const TaskScheduleStep: React.FC<{
  data: TaskCreationData;
  onNext: (data: Partial<TaskCreationData>) => void;
  onBack: () => void;
  canGoBack: boolean;
}> = ({ data, onNext }) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>Schedule</Text>
    <Text style={styles.stepDescription}>
      Set the due date and reminders for your task.
    </Text>
    
    <View style={styles.formContainer}>
      <Text style={styles.formLabel}>Due Date</Text>
      <Text style={styles.formInput}>
        {data.dueDate.toLocaleDateString()}
      </Text>
      
      <Text style={styles.formLabel}>Reminders</Text>
      <Text style={styles.formInput}>
        {data.reminders.length} reminder(s) set
      </Text>
    </View>
  </View>
);

const TaskReviewStep: React.FC<{
  data: TaskCreationData;
  onNext: (data: Partial<TaskCreationData>) => void;
  onBack: () => void;
  canGoBack: boolean;
}> = ({ data }) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>Review</Text>
    <Text style={styles.stepDescription}>
      Review your task details before creating.
    </Text>
    
    <View style={styles.reviewContainer}>
      <Text style={styles.reviewLabel}>Type:</Text>
      <Text style={styles.reviewValue}>{data.type}</Text>
      
      <Text style={styles.reviewLabel}>Title:</Text>
      <Text style={styles.reviewValue}>{data.title || 'No title'}</Text>
      
      <Text style={styles.reviewLabel}>Due Date:</Text>
      <Text style={styles.reviewValue}>{data.dueDate.toLocaleDateString()}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  title: {
    ...VISUAL_HIERARCHY.pageTitle,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginRight: DESIGN_SYSTEM.spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: {
    ...DESIGN_SYSTEM.typography.caption,
    color: '#666666',
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    ...DESIGN_SYSTEM.typography.h2,
    marginBottom: DESIGN_SYSTEM.spacing.md,
  },
  stepDescription: {
    ...DESIGN_SYSTEM.typography.body,
    color: '#666666',
    marginBottom: DESIGN_SYSTEM.spacing.xl,
  },
  optionContainer: {
    gap: DESIGN_SYSTEM.spacing.md,
  },
  selectedOption: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  formContainer: {
    gap: DESIGN_SYSTEM.spacing.lg,
  },
  formLabel: {
    ...DESIGN_SYSTEM.typography.bodySmall,
    fontWeight: '500',
    marginBottom: DESIGN_SYSTEM.spacing.sm,
  },
  formInput: {
    ...DESIGN_SYSTEM.typography.body,
    padding: DESIGN_SYSTEM.spacing.md,
    backgroundColor: '#F5F5F5',
    borderRadius: DESIGN_SYSTEM.borderRadius.md,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  reviewContainer: {
    gap: DESIGN_SYSTEM.spacing.md,
  },
  reviewLabel: {
    ...DESIGN_SYSTEM.typography.bodySmall,
    fontWeight: '500',
    color: '#666666',
  },
  reviewValue: {
    ...DESIGN_SYSTEM.typography.body,
    marginBottom: DESIGN_SYSTEM.spacing.sm,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: DESIGN_SYSTEM.spacing.md,
  },
});

export default TaskCreationFlow;
