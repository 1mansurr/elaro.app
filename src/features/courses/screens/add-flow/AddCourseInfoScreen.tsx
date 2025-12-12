import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAddCourse } from '@/features/courses/contexts/AddCourseContext';
import { AddCourseStackParamList } from '@/navigation/AddCourseNavigator';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import { FloatingLabelInput, ProgressIndicator } from '@/shared/components';
import { useTheme } from '@/hooks/useTheme';
import { useLimitCheck } from '@/hooks/useLimitCheck';
import { useUsageLimitPaywall } from '@/contexts/UsageLimitPaywallContext';

type AddCourseInfoScreenNavigationProp = StackNavigationProp<
  AddCourseStackParamList,
  'AddCourseInfo'
>;

const COURSE_LIMITS: { [key: string]: number } = {
  free: 2,
  oddity: 7,
};

const AddCourseInfoScreen = () => {
  const navigation = useNavigation<AddCourseInfoScreenNavigationProp>();
  const { courseData, updateCourseData } = useAddCourse();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [courseName, setCourseName] = useState(courseData.courseName || '');
  const [courseCode, setCourseCode] = useState(courseData.courseCode || '');
  const [description, setDescription] = useState(
    courseData.courseDescription || '',
  );
  const [courseCount, setCourseCount] = useState(0);
  const [hasInteractedWithName, setHasInteractedWithName] = useState(false);
  const [hasInteractedWithCode, setHasInteractedWithCode] = useState(false);

  useEffect(() => {
    const checkCourseCount = async () => {
      if (!user?.id) return;

      const { count, error } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (!error && count !== null) {
        setCourseCount(count);
      }
    };

    checkCourseCount();
  }, [user?.id]);

  const { checkCourseLimit } = useLimitCheck();
  const { showUsageLimitPaywall } = useUsageLimitPaywall();

  const handleNext = async () => {
    if (!courseName.trim()) {
      Alert.alert('Course name is required.');
      return;
    }

    // Check course limit before proceeding
    const limitCheck = await checkCourseLimit();
    if (!limitCheck.allowed && limitCheck.limitType) {
      showUsageLimitPaywall(
        limitCheck.limitType,
        limitCheck.currentUsage!,
        limitCheck.maxLimit!,
        limitCheck.actionLabel!,
        null, // No pending action - user can retry after upgrade
      );
      return;
    }

    updateCourseData({
      courseName: courseName.trim(),
      courseCode: courseCode.trim(),
      courseDescription: description.trim(),
    });
    navigation.navigate('AddLectureDateTime');
  };

  const handleCancel = () => {
    navigation.getParent()?.goBack();
  };

  // Course code is optional, so it shouldn't affect button enablement
  const isButtonEnabled = hasInteractedWithName && courseName.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          onPress={handleCancel}
          style={styles.cancelButton}
          activeOpacity={0.7}>
          <Text style={[styles.cancelText, { color: '#616f89' }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          New Course
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress Indicator */}
      <ProgressIndicator currentStep={1} totalSteps={4} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Title */}
        <Text style={[styles.title, { color: theme.text }]}>
          What are you studying?
        </Text>

        {/* Inputs */}
        <View style={styles.inputsContainer}>
          <FloatingLabelInput
            label="Course Name"
            value={courseName}
            onChangeText={text => {
              setCourseName(text);
              setHasInteractedWithName(true);
            }}
            onFocus={() => setHasInteractedWithName(true)}
            autoFocus
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => {
              // Focus next input if needed
            }}
          />
          <FloatingLabelInput
            label="Course Code"
            optional
            value={courseCode}
            onChangeText={text => {
              setCourseCode(text);
              setHasInteractedWithCode(true);
            }}
            onFocus={() => setHasInteractedWithCode(true)}
            autoCapitalize="characters"
            returnKeyType="next"
          />
          <FloatingLabelInput
            label="About"
            optional
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={300}
            showCharacterCount
            placeholderHint="Description"
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Footer Button */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.background,
            paddingBottom: insets.bottom + 16,
          },
        ]}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            !isButtonEnabled && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!isButtonEnabled}
          activeOpacity={0.8}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  cancelButton: {
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.015,
  },
  headerSpacer: {
    width: 64,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 34,
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  inputsContainer: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  nextButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#135bec',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#e5e7eb',
    opacity: 0.6,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AddCourseInfoScreen;
