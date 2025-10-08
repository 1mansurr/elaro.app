import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, useIsFocused, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Progress from 'react-native-progress';

import { RootStackParamList } from '../../types';
import { Input, Button } from '../../components';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import { debounce } from '../../utils/debounce';

type OnboardingNavProp = StackNavigationProp<RootStackParamList, 'OnboardingForm'>;
type OnboardingRouteProp = RouteProp<RootStackParamList, 'OnboardingForm'>;

interface Course {
  course_name: string;
  course_code: string;
  about_course: string;
}

const TOTAL_STEPS = 3;

const OnboardingFormScreen = () => {
  const navigation = useNavigation<OnboardingNavProp>();
  const route = useRoute<OnboardingRouteProp>();
  const isFocused = useIsFocused();

  const [currentStep, setCurrentStep] = useState(1);
  // Username state with availability checking
  const [username, setUsername] = useState('');
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [university, setUniversity] = useState('');
  const [program, setProgram] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounced function to check username availability
  const checkUsername = useCallback(
    debounce(async (newUsername: string) => {
      if (newUsername.length < 3) {
        setIsUsernameAvailable(null);
        setIsCheckingUsername(false);
        return;
      }
      setIsCheckingUsername(true);
      try {
        const { data, error } = await supabase.functions.invoke('check-username-availability', {
          body: { username: newUsername },
        });
        if (error) throw error;
        setIsUsernameAvailable(data.isAvailable);
      } catch (err) {
        console.error('Error checking username:', err);
        setIsUsernameAvailable(null); // Set to null on error to avoid blocking user
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500), // 500ms debounce delay
    []
  );

  useEffect(() => {
    if (isFocused && route.params?.newCourse) {
      // Add the new course from the modal to our state, avoiding duplicates
      if (!courses.some(c => c.course_name === route.params?.newCourse?.course_name)) {
        setCourses(prevCourses => [...prevCourses, route.params?.newCourse!]);
      }
      // Clear the params to prevent re-adding on focus change
      navigation.setParams({ newCourse: undefined });
    }
  }, [isFocused, route.params?.newCourse]);

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      // Validate username before proceeding
      if (!username.trim() || !isUsernameAvailable) {
        Alert.alert('Please choose an available username.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.functions.invoke('complete-onboarding', {
        body: {
          username: username.trim(),
          university,
          program,
          courses,
        },
      });

      if (error) {
        throw error;
      }

      Alert.alert('Setup Complete!', 'Your profile has been saved successfully.');
      navigation.replace('Main');

    } catch (error: any) {
      console.error('Onboarding completion error:', error);
      Alert.alert('Error', `There was a problem saving your profile: ${error.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const progress = currentStep / TOTAL_STEPS;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.progressContainer}>
          <Progress.Bar progress={progress} width={null} color={COLORS.primary} unfilledColor={COLORS.lightGray} borderWidth={0} />
          <Text style={styles.progressText}>Step {currentStep} of {TOTAL_STEPS}</Text>
        </View>

        {currentStep === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Choose your username</Text>
            <Text style={styles.stepSubtitle}>
              This will be your unique identifier on the platform. You can only use letters, numbers, and underscores.
            </Text>
            <View>
              <Input
                label="Username"
                value={username}
                onChangeText={(text) => {
                  const formattedText = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
                  setUsername(formattedText);
                  setIsCheckingUsername(true); // Show loading indicator immediately
                  checkUsername(formattedText);
                }}
                placeholder="e.g., john_doe"
                autoCapitalize="none"
              />
              {isCheckingUsername && (
                <View style={styles.checkingContainer}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.checkingText}>Checking availability...</Text>
                </View>
              )}
              {isUsernameAvailable === true && username.length >= 3 && (
                <Text style={styles.successText}>✓ Username is available!</Text>
              )}
              {isUsernameAvailable === false && (
                <Text style={styles.errorText}>✗ Username is already taken.</Text>
              )}
              {username.length > 0 && username.length < 3 && (
                <Text style={styles.warningText}>Username must be at least 3 characters long.</Text>
              )}
            </View>
          </View>
        )}

        {currentStep === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Tell us about your studies</Text>
            <Input
              label="University Name"
              value={university}
              onChangeText={setUniversity}
              placeholder="e.g., Harvard University"
            />
            <Text style={styles.explanationText}>
              Why? In the future, we plan to create tools and communities specific to your university.
            </Text>

            <Input
              label="Program of Study"
              value={program}
              onChangeText={setProgram}
              placeholder="e.g., Computer Science"
            />
            <Text style={styles.explanationText}>
              Why? This helps us tailor suggestions and content relevant to your field.
            </Text>
          </View>
        )}

        {currentStep === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Add your first courses</Text>
            <Text style={styles.stepSubtitle}>
              Get a head start by adding up to 3 courses now. You can always add more later.
            </Text>
            
            <View style={styles.courseList}>
              {courses.map((course, index) => (
                <View key={index} style={styles.courseItem}>
                  <Text style={styles.courseName}>{course.course_name}</Text>
                  {course.course_code && <Text style={styles.courseCode}>{course.course_code}</Text>}
                </View>
              ))}
              {courses.length === 0 && <Text style={styles.noCoursesText}>No courses added yet.</Text>}
            </View>

            <Button
              title="Add a Course"
              onPress={() => navigation.navigate('AddCourseOnboardingModal')}
              disabled={courses.length >= 3}
              variant="outline"
            />
          </View>
        )}

      </ScrollView>

      <View style={styles.footer}>
        {currentStep > 1 && (
          <Button 
            title="Back" 
            onPress={handleBack} 
            variant="outline"
            style={styles.backButton}
          />
        )}
        <Button
          title={currentStep === TOTAL_STEPS ? 'Finish Setup' : 'Next'}
          onPress={handleNext}
          style={styles.nextButton}
          loading={loading && currentStep === TOTAL_STEPS}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: SPACING.lg,
  },
  progressContainer: {
    marginBottom: SPACING.xl,
  },
  progressText: {
    fontWeight: FONT_WEIGHTS.normal as any,
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontWeight: FONT_WEIGHTS.bold as any,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  stepSubtitle: {
    fontWeight: FONT_WEIGHTS.normal as any,
    fontSize: FONT_SIZES.md,
    color: COLORS.gray,
    marginBottom: SPACING.lg,
    lineHeight: 24,
  },
  explanationText: {
    fontWeight: FONT_WEIGHTS.normal as any,
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    backgroundColor: COLORS.background,
    gap: SPACING.md,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
  courseList: {
    marginBottom: SPACING.lg,
    minHeight: 100,
  },
  courseItem: {
    backgroundColor: COLORS.gray,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  courseName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.text,
  },
  courseCode: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
  },
  noCoursesText: {
    textAlign: 'center',
    color: COLORS.gray,
    fontStyle: 'italic',
    marginTop: SPACING.lg,
  },
  checkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  checkingText: {
    marginLeft: SPACING.xs,
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
  },
  successText: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZES.sm,
    color: '#22c55e',
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  errorText: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZES.sm,
    color: '#ef4444',
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  warningText: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZES.sm,
    color: '#f59e0b',
    fontWeight: FONT_WEIGHTS.medium as any,
  },
});

export default OnboardingFormScreen;