import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useAddCourse,
  AddCourseData,
} from '@/features/courses/contexts/AddCourseContext';
import { AddCourseStackParamList } from '@/navigation/AddCourseNavigator';
import { ProgressIndicator } from '@/shared/components';
import { useTheme } from '@/hooks/useTheme';

type ScreenNavigationProp = StackNavigationProp<
  AddCourseStackParamList,
  'AddLectureRecurrence'
>;

const RecurrenceOptions: ('weekly' | 'bi-weekly')[] = ['weekly', 'bi-weekly'];

const AddLectureRecurrenceScreen = () => {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { courseData, updateCourseData } = useAddCourse();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [repeats, setRepeats] = useState(courseData.recurrence !== 'none');
  const [recurrence, setRecurrence] = useState<'weekly' | 'bi-weekly'>(
    courseData.recurrence === 'none' ? 'weekly' : courseData.recurrence,
  );

  const handleNext = () => {
    const finalRecurrence = repeats ? recurrence : 'none';
    updateCourseData({ recurrence: finalRecurrence });
    navigation.navigate('AddLectureReminders');
  };

  const handleBack = () => {
    const finalRecurrence = repeats ? recurrence : 'none';
    updateCourseData({ recurrence: finalRecurrence });
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
          Lecture Schedule
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress Indicator */}
      <ProgressIndicator currentStep={4} totalSteps={5} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: theme.text }]}>
          Does this lecture repeat?
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface || '#FFFFFF',
              borderColor: theme.border,
            },
          ]}>
          <View style={styles.repeatHeader}>
            <View style={styles.repeatHeaderLeft}>
              <View
                style={[styles.iconContainer, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="repeat-outline" size={20} color="#16a34a" />
              </View>
              <Text style={[styles.cardLabel, { color: theme.text }]}>
                Repeat
              </Text>
            </View>
            <Switch
              value={repeats}
              onValueChange={setRepeats}
              trackColor={{ false: '#e5e7eb', true: '#135bec' }}
              thumbColor="#ffffff"
            />
          </View>

          {repeats && (
            <View style={styles.frequencySection}>
              <Text style={[styles.frequencyLabel, { color: '#64748b' }]}>
                Frequency
              </Text>
              <View style={styles.frequencyGrid}>
                {RecurrenceOptions.map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.frequencyButton,
                      recurrence === option && styles.frequencyButtonActive,
                      {
                        backgroundColor:
                          recurrence === option
                            ? '#135bec20'
                            : theme.surface || '#FFFFFF',
                        borderColor:
                          recurrence === option ? '#135bec33' : theme.border,
                      },
                    ]}
                    onPress={() => setRecurrence(option)}
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.frequencyButtonText,
                        {
                          color: recurrence === option ? '#135bec' : theme.text,
                          fontWeight: recurrence === option ? '600' : '500',
                        },
                      ]}>
                      {option === 'bi-weekly' ? 'Every 2 Weeks' : 'Every Week'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.background,
            paddingBottom: insets.bottom + 16,
          },
        ]}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}>
          <Text style={styles.nextButtonText}>Next Step</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    marginBottom: 24,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  repeatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  repeatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  frequencySection: {
    padding: 16,
  },
  frequencyLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  frequencyButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frequencyButtonActive: {
    borderWidth: 1,
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  nextButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#135bec',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddLectureRecurrenceScreen;
