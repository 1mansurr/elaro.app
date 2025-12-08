import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAddCourse } from '@/features/courses/contexts/AddCourseContext';
import { AddCourseStackParamList } from '@/navigation/AddCourseNavigator';
import { formatDate as i18nFormatDate } from '@/i18n';
import { ProgressIndicator } from '@/shared/components';
import { useTheme } from '@/hooks/useTheme';

type ScreenNavigationProp = StackNavigationProp<
  AddCourseStackParamList,
  'AddLectureDateTime'
>;

const AddLectureDateTimeScreen = () => {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { courseData, updateCourseData } = useAddCourse();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [startTime, setStartTime] = useState(
    courseData.startTime || new Date(),
  );
  const [endTime, setEndTime] = useState(
    courseData.endTime || new Date(new Date().getTime() + 60 * 60 * 1000),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<'start' | 'end' | null>(
    null,
  );
  const [hasPickedDate, setHasPickedDate] = useState(false);
  const [hasPickedStartTime, setHasPickedStartTime] = useState(false);
  const [hasPickedEndTime, setHasPickedEndTime] = useState(false);
  const [hasInteractedWithRecurrence, setHasInteractedWithRecurrence] =
    useState(false);
  // Auto-enable recurrence toggle on mount
  const [repeats, setRepeats] = useState(true);
  const [recurrence, setRecurrence] = useState<'weekly' | 'bi-weekly' | null>(
    null,
  );

  const formatDate = (date: Date) => {
    return i18nFormatDate(date, { dateStyle: 'medium', timeStyle: 'short' });
  };

  const formatTime = (date: Date) => {
    return i18nFormatDate(date, { timeStyle: 'short' });
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      setStartTime(selectedDate);
      setEndTime(new Date(selectedDate.getTime() + 60 * 60 * 1000));
      setHasPickedDate(true);
      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
    } else if (event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  const onTimeChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
    type?: 'start' | 'end',
  ) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(null);
    }
    if (event.type === 'set' && selectedDate && type) {
      if (type === 'start') {
        setStartTime(selectedDate);
        setHasPickedStartTime(true);
        if (selectedDate >= endTime) {
          setEndTime(new Date(selectedDate.getTime() + 60 * 60 * 1000));
        }
      } else {
        if (selectedDate > startTime) {
          setEndTime(selectedDate);
          setHasPickedEndTime(true);
        } else {
          Alert.alert('Invalid Time', 'End time must be after start time.');
        }
      }
      if (Platform.OS === 'ios') {
        setShowTimePicker(null);
      }
    } else if (event.type === 'dismissed') {
      setShowTimePicker(null);
    }
  };

  const handleRecurrenceToggle = (value: boolean) => {
    setRepeats(value);
    setHasInteractedWithRecurrence(true);
    if (!value) {
      setRecurrence(null);
    }
  };

  const handleRecurrenceSelect = (option: 'weekly' | 'bi-weekly') => {
    setRecurrence(option);
    setHasInteractedWithRecurrence(true);
  };

  const handleNext = () => {
    if (endTime <= startTime) {
      Alert.alert('Invalid Time', 'End time must be after the start time.');
      return;
    }
    updateCourseData({
      startTime,
      endTime,
      recurrence: repeats && recurrence ? recurrence : 'none',
    });
    // Navigate directly to reminders since recurrence is handled in this screen
    navigation.navigate('AddLectureReminders');
  };

  const handleBack = () => {
    updateCourseData({
      startTime,
      endTime,
      recurrence: repeats && recurrence ? recurrence : 'none',
    });
    navigation.goBack();
  };

  const isButtonEnabled =
    hasPickedDate &&
    hasPickedStartTime &&
    hasPickedEndTime &&
    hasInteractedWithRecurrence &&
    (!repeats || (repeats && recurrence !== null));

  const recurrenceOptions: Array<'weekly' | 'bi-weekly'> = [
    'weekly',
    'bi-weekly',
  ];

  const getDateDisplay = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (startTime.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (startTime.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return formatDate(startTime).split(',')[0];
    }
  };

  const getDuration = () => {
    const diff = endTime.getTime() - startTime.getTime();
    const minutes = Math.round(diff / (1000 * 60));
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hr`;
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
      <ProgressIndicator currentStep={3} totalSteps={5} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: theme.text }]}>
          When is the lecture?
        </Text>
        <Text style={[styles.subtitle, { color: '#64748b' }]}>
          Set the date, time, and recurrence for your lecture.
        </Text>

        {/* Date Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface || '#FFFFFF', borderColor: theme.border },
          ]}>
          <TouchableOpacity
            style={styles.cardRow}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}>
            <View style={styles.cardRowLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="calendar-outline" size={20} color="#dc2626" />
              </View>
              <Text style={[styles.cardLabel, { color: theme.text }]}>Date</Text>
            </View>
            <View style={styles.cardRowRight}>
              <Text style={styles.dateBadge}>{getDateDisplay()}</Text>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </View>
          </TouchableOpacity>

          {/* Time Picker Section */}
          <View style={[styles.timeSection, { backgroundColor: '#f8fafc' }]}>
            <View style={styles.timeRow}>
              <View style={styles.timeRowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#dbeafe' }]}>
                  <Ionicons name="time-outline" size={20} color="#2563eb" />
                </View>
                <Text style={[styles.cardLabel, { color: theme.text }]}>
                  Starts
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowTimePicker('start')}>
                <Text style={[styles.timeText, { color: theme.text }]}>
                  {formatTime(startTime)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timeRowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#f3e8ff' }]}>
                  <Ionicons name="stopwatch-outline" size={20} color="#9333ea" />
                </View>
                <Text style={[styles.cardLabel, { color: theme.text }]}>
                  Ends
                </Text>
              </View>
              <View style={styles.timeRowRight}>
                <Text style={styles.durationBadge}>{getDuration()}</Text>
                <TouchableOpacity onPress={() => setShowTimePicker('end')}>
                  <Text style={[styles.timeText, { color: theme.text }]}>
                    {formatTime(endTime)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Repeat Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface || '#FFFFFF', borderColor: theme.border },
          ]}>
          <View style={styles.repeatHeader}>
            <View style={styles.repeatHeaderLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="repeat-outline" size={20} color="#16a34a" />
              </View>
              <Text style={[styles.cardLabel, { color: theme.text }]}>
                Repeat
              </Text>
            </View>
            <Switch
              value={repeats}
              onValueChange={handleRecurrenceToggle}
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
                {recurrenceOptions.map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.frequencyButton,
                      recurrence === option && styles.frequencyButtonActive,
                      {
                        backgroundColor:
                          recurrence === option ? '#135bec20' : theme.surface || '#FFFFFF',
                        borderColor:
                          recurrence === option ? '#135bec33' : theme.border,
                      },
                    ]}
                    onPress={() => handleRecurrenceSelect(option)}
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.frequencyButtonText,
                        {
                          color:
                            recurrence === option ? '#135bec' : theme.text,
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
          style={[
            styles.nextButton,
            !isButtonEnabled && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!isButtonEnabled}
          activeOpacity={0.8}>
          <Text style={styles.nextButtonText}>Next Step</Text>
        </TouchableOpacity>
      </View>

      {/* Date/Time Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={startTime}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={showTimePicker === 'start' ? startTime : endTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(e, date) => onTimeChange(e, date, showTimePicker)}
        />
      )}
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  dateBadge: {
    fontSize: 14,
    fontWeight: '600',
    color: '#135bec',
    backgroundColor: '#135bec10',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeSection: {
    backgroundColor: '#f8fafc',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  timeRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  durationBadge: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
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
  nextButtonDisabled: {
    backgroundColor: '#e5e7eb',
    opacity: 0.6,
  },
});

export default AddLectureDateTimeScreen;
