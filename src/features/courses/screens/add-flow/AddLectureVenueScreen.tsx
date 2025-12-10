import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAddCourse } from '@/features/courses/contexts/AddCourseContext';
import { AddCourseStackParamList } from '@/navigation/AddCourseNavigator';
import { FloatingLabelInput, ProgressIndicator } from '@/shared/components';
import { useTheme } from '@/hooks/useTheme';

type AddLectureVenueScreenNavigationProp = StackNavigationProp<
  AddCourseStackParamList,
  'AddLectureVenue'
>;

const AddLectureVenueScreen = () => {
  const navigation = useNavigation<AddLectureVenueScreenNavigationProp>();
  const { courseData, updateCourseData } = useAddCourse();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [venue, setVenue] = useState(courseData.venue || '');
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleNext = () => {
    updateCourseData({ venue: venue.trim() });
    navigation.navigate('AddLectureReminders');
  };

  const handleBack = () => {
    updateCourseData({ venue: venue.trim() });
    navigation.goBack();
  };

  const handleSkip = () => {
    updateCourseData({ venue: '' });
    navigation.navigate('AddLectureReminders');
  };

  const isButtonEnabled = hasInteracted && venue.trim().length > 0;

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
          Add Lecture Venue
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress Indicator */}
      <ProgressIndicator currentStep={3} totalSteps={4} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: theme.text }]}>
          Venue of the lecture?
        </Text>
        <Text style={[styles.subtitle, { color: '#64748b' }]}>
          Enter the location, such as a room number or building name.
        </Text>

        <View style={styles.inputContainer}>
          <FloatingLabelInput
            label="Venue"
            optional
            value={venue}
            onChangeText={text => {
              setVenue(text);
              setHasInteracted(true);
            }}
            onFocus={() => setHasInteracted(true)}
            placeholderHint="e.g. Room 404, Main Building"
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleNext}
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
          onPress={isButtonEnabled ? handleNext : handleSkip}
          activeOpacity={0.8}>
          <Text style={styles.nextButtonText}>
            {isButtonEnabled ? 'Next Step' : 'Skip'}
          </Text>
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
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    lineHeight: 36,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  inputContainer: {
    marginTop: 8,
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
    height: 48,
    backgroundColor: '#135bec',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#e5e7eb',
    opacity: 0.6,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddLectureVenueScreen;
