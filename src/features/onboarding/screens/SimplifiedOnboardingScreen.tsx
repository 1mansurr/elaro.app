import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList } from '@/types';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { Button } from '@/shared/components';

type SimplifiedOnboardingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OnboardingFlow'>;

interface OnboardingData {
  firstName: string;
  lastName: string;
  university: string;
  program: string;
  courses: string[];
}

const SimplifiedOnboardingScreen: React.FC = () => {
  const navigation = useNavigation<SimplifiedOnboardingScreenNavigationProp>();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingData>({
    firstName: '',
    lastName: '',
    university: '',
    program: '',
    courses: [],
  });

  const steps = [
    {
      title: 'Welcome to ELARO',
      subtitle: 'Let\'s get you set up in just a few steps',
      component: WelcomeStep,
    },
    {
      title: 'Tell us about yourself',
      subtitle: 'This helps us personalize your experience',
      component: ProfileStep,
    },
    {
      title: 'Add your courses',
      subtitle: 'Start by adding your current courses',
      component: CourseStep,
    },
  ];

  const handleNext = useCallback((stepData: Partial<OnboardingData>) => {
    setFormData(prev => ({ ...prev, ...stepData }));
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete onboarding
      handleCompleteOnboarding();
    }
  }, [currentStep, steps.length]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleCompleteOnboarding = useCallback(() => {
    // Save onboarding data and navigate to main app
    navigation.navigate('Main');
  }, [navigation]);

  const CurrentStep = steps[currentStep].component;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{steps[currentStep].title}</Text>
        <Text style={styles.subtitle}>{steps[currentStep].subtitle}</Text>
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
      </View>

      <ScrollView style={styles.content}>
        <CurrentStep 
          data={formData}
          onNext={handleNext}
          onBack={handleBack}
          canGoBack={currentStep > 0}
        />
      </ScrollView>
    </View>
  );
};

// Step Components
const WelcomeStep: React.FC<{
  data: OnboardingData;
  onNext: (data: Partial<OnboardingData>) => void;
  onBack: () => void;
  canGoBack: boolean;
}> = ({ onNext }) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>Welcome to ELARO!</Text>
    <Text style={styles.stepDescription}>
      Your personal academic companion for managing courses, assignments, and study sessions.
    </Text>
    <Button.Primary
      title="Get Started"
      onPress={() => onNext({})}
    />
  </View>
);

const ProfileStep: React.FC<{
  data: OnboardingData;
  onNext: (data: Partial<OnboardingData>) => void;
  onBack: () => void;
  canGoBack: boolean;
}> = ({ data, onNext, onBack, canGoBack }) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>Tell us about yourself</Text>
    <Text style={styles.stepDescription}>
      This helps us personalize your experience and provide relevant features.
    </Text>
    
    <View style={styles.formContainer}>
      <Text style={styles.formLabel}>First Name</Text>
      <Text style={styles.formInput}>{data.firstName || 'Enter your first name'}</Text>
      
      <Text style={styles.formLabel}>Last Name</Text>
      <Text style={styles.formInput}>{data.lastName || 'Enter your last name'}</Text>
      
      <Text style={styles.formLabel}>University</Text>
      <Text style={styles.formInput}>{data.university || 'Enter your university'}</Text>
    </View>

    <View style={styles.buttonContainer}>
      {canGoBack && (
        <Button.Secondary
          title="Back"
          onPress={onBack}
        />
      )}
      <Button.Primary
        title="Continue"
        onPress={() => onNext({ firstName: 'John', lastName: 'Doe', university: 'Example University' })}
      />
    </View>
  </View>
);

const CourseStep: React.FC<{
  data: OnboardingData;
  onNext: (data: Partial<OnboardingData>) => void;
  onBack: () => void;
  canGoBack: boolean;
}> = ({ data, onNext, onBack, canGoBack }) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepTitle}>Add your courses</Text>
    <Text style={styles.stepDescription}>
      Start by adding your current courses. You can always add more later.
    </Text>
    
    <View style={styles.courseContainer}>
      <Text style={styles.courseItem}>📚 Computer Science 101</Text>
      <Text style={styles.courseItem}>📚 Mathematics 201</Text>
      <Text style={styles.courseItem}>📚 Physics 301</Text>
    </View>

    <View style={styles.buttonContainer}>
      {canGoBack && (
        <Button.Secondary
          title="Back"
          onPress={onBack}
        />
      )}
      <Button.Primary
        title="Complete Setup"
        onPress={() => onNext({ courses: ['CS101', 'MATH201', 'PHYS301'] })}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.lightGray,
    borderRadius: 2,
    marginRight: SPACING.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  stepDescription: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  formContainer: {
    marginBottom: SPACING.xl,
  },
  formLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  formInput: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  courseContainer: {
    marginBottom: SPACING.xl,
  },
  courseItem: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
});

export default SimplifiedOnboardingScreen;
