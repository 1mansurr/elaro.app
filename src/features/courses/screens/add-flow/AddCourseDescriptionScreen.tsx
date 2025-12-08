import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAddCourse } from '@/features/courses/contexts/AddCourseContext';
import { AddCourseStackParamList } from '@/navigation/AddCourseNavigator';
import { ProgressIndicator } from '@/shared/components';
import { useTheme } from '@/hooks/useTheme';

type AddCourseDescriptionScreenNavigationProp = StackNavigationProp<
  AddCourseStackParamList,
  'AddCourseDescription'
>;

const AddCourseDescriptionScreen = () => {
  const navigation = useNavigation<AddCourseDescriptionScreenNavigationProp>();
  const { courseData, updateCourseData } = useAddCourse();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [description, setDescription] = useState(
    courseData.courseDescription || '',
  );
  const [isFocused, setIsFocused] = useState(false);
  const [hasTyped, setHasTyped] = useState(false);
  const animatedValue = useRef(new Animated.Value(description ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isFocused || description ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isFocused, description, animatedValue]);

  const handleNext = () => {
    updateCourseData({ courseDescription: description.trim() });
    navigation.navigate('AddLectureDateTime');
  };

  const handleSkip = () => {
    updateCourseData({ courseDescription: '' });
    navigation.navigate('AddLectureDateTime');
  };

  const handleBack = () => {
    updateCourseData({ courseDescription: description });
    navigation.goBack();
  };

  const labelTranslateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });

  const labelFontSize = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 12],
  });

  const showNextStep = description.trim().length > 0;
  const isButtonEnabled = hasTyped && description.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top, backgroundColor: theme.background },
        ]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Add Course
        </Text>
        <TouchableOpacity
          onPress={showNextStep ? handleNext : handleSkip}
          style={styles.skipButton}
          activeOpacity={0.7}>
          <Text style={styles.skipButtonText}>
            {showNextStep ? 'Next Step' : 'Skip'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress Indicator */}
      <ProgressIndicator currentStep={2} totalSteps={5} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: theme.text }]}>
          What is this course about?
        </Text>

        <View style={styles.textAreaContainer}>
          <TextInput
            style={[
              styles.textArea,
              {
                borderColor: isFocused ? '#135bec' : '#dbdfe6',
                backgroundColor: theme.surface || '#FFFFFF',
                color: theme.text,
              },
            ]}
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              setHasTyped(true);
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            multiline
            placeholder=""
            placeholderTextColor="transparent"
            textAlignVertical="top"
            minHeight={220}
          />
          <Animated.Text
            style={[
              styles.label,
              {
                transform: [{ translateY: labelTranslateY }],
                fontSize: labelFontSize,
                color: isFocused ? '#135bec' : '#616f89',
              },
            ]}
            pointerEvents="none">
            Course Description
          </Animated.Text>
          {isFocused && (
            <Text style={styles.placeholderHint}>
              e.g., Syllabus covers chapters 1-5...
            </Text>
          )}
        </View>

        <Text style={[styles.helperText, { color: '#616f89' }]}>
          This is optional. You can add details later.
        </Text>
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.015,
  },
  skipButton: {
    width: 64,
    alignItems: 'flex-end',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#135bec',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 30,
    marginTop: 8,
    marginBottom: 16,
    letterSpacing: -0.01,
  },
  textAreaContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  textArea: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 16,
    fontSize: 16,
    minHeight: 220,
  },
  label: {
    position: 'absolute',
    left: 16,
    top: 8,
    fontSize: 12,
    color: '#616f89',
  },
  placeholderHint: {
    position: 'absolute',
    left: 16,
    top: 56,
    fontSize: 16,
    color: '#616f8940',
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
    paddingTop: 12,
    paddingHorizontal: 4,
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

export default AddCourseDescriptionScreen;
