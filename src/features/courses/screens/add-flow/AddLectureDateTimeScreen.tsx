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
  Modal,
  TextInput,
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
  const [showTimePicker, setShowTimePicker] = useState<'start' | 'end' | null>(
    null,
  );
  const [selectedDay, setSelectedDay] = useState<number | null>(null); // 0 = Sunday, 1 = Monday, etc.
  const [hasPickedDay, setHasPickedDay] = useState(false);
  const [hasPickedStartTime, setHasPickedStartTime] = useState(false);
  const [hasPickedEndTime, setHasPickedEndTime] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [venue, setVenue] = useState(courseData.venue || '');
  const [hasInteractedWithRecurrence, setHasInteractedWithRecurrence] =
    useState(false);
  // Auto-enable recurrence toggle on mount
  const [repeats, setRepeats] = useState(true);
  const [recurrence, setRecurrence] = useState<'weekly' | 'bi-weekly' | null>(
    null,
  );

  // Day names for selector
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const formatTime = (date: Date) => {
    return i18nFormatDate(date, { timeStyle: 'short' });
  };

  const onTimeChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
    type?: 'start' | 'end',
  ) => {
    // Don't auto-close on either platform - wait for "Done" button
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
      // Keep picker open - only close when "Done" is tapped
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
    if (selectedDay === null) {
      Alert.alert('Day Required', 'Please select a day of the week.');
      return;
    }

    // Set the startTime to the selected day of the week
    const now = new Date();
    const currentDay = now.getDay();
    const daysToAdd = (selectedDay - currentDay + 7) % 7;
    const nextDate = new Date(now);
    nextDate.setDate(now.getDate() + (daysToAdd === 0 ? 7 : daysToAdd)); // If today, use next week
    nextDate.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);

    const finalEndTime = new Date(
      nextDate.getTime() + (endTime.getTime() - startTime.getTime()),
    );

    updateCourseData({
      startTime: nextDate,
      endTime: finalEndTime,
      venue: venue.trim(),
      recurrence: repeats && recurrence ? recurrence : 'none',
    });
    // Navigate directly to reminders screen (skip venue screen)
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
    hasPickedDay &&
    hasPickedStartTime &&
    hasPickedEndTime &&
    hasInteractedWithRecurrence &&
    (!repeats || (repeats && recurrence !== null));

  const recurrenceOptions: Array<'weekly' | 'bi-weekly'> = [
    'weekly',
    'bi-weekly',
  ];

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
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top },
      ]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
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
      <ProgressIndicator currentStep={2} totalSteps={3} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: theme.text }]}>
          Setting of Lecture
        </Text>
        <Text style={[styles.subtitle, { color: '#64748b' }]}>
          Set the day, time, venue, and recurrence for your lecture.
        </Text>

        {/* Day Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface || '#FFFFFF',
              borderColor: theme.border,
            },
          ]}>
          <TouchableOpacity
            style={styles.cardRow}
            onPress={() => setShowDayPicker(true)}
            activeOpacity={0.7}>
            <View style={styles.cardRowLeft}>
              <View
                style={[styles.iconContainer, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="calendar-outline" size={20} color="#dc2626" />
              </View>
              <Text style={[styles.cardLabel, { color: theme.text }]}>Day</Text>
            </View>
            <View style={styles.cardRowRight}>
              <Text style={styles.dayBadge}>
                {selectedDay !== null ? dayNames[selectedDay] : 'Select Day'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </View>
          </TouchableOpacity>

          {/* Time Picker Section */}
          <View style={[styles.timeSection, { backgroundColor: '#f8fafc' }]}>
            <View style={styles.timeRow}>
              <View style={styles.timeRowLeft}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: '#dbeafe' },
                  ]}>
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
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: '#f3e8ff' },
                  ]}>
                  <Ionicons
                    name="stopwatch-outline"
                    size={20}
                    color="#9333ea"
                  />
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

        {/* Venue Card - Moved above Repeat Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface || '#FFFFFF',
              borderColor: theme.border,
            },
          ]}>
          <View style={styles.venueSection}>
            <View style={styles.venueSectionHeader}>
              <View
                style={[styles.iconContainer, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="location-outline" size={20} color="#16a34a" />
              </View>
              <Text style={[styles.cardLabel, { color: theme.text }]}>
                Venue
              </Text>
            </View>
            <TextInput
              style={[
                styles.venueInput,
                {
                  backgroundColor: theme.surface || '#FFFFFF',
                  borderColor: '#dbdfe6',
                  color: theme.text,
                },
              ]}
              value={venue}
              onChangeText={setVenue}
              placeholder="e.g. Room 404, Main Building"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Repeat Card */}
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
                          recurrence === option
                            ? '#135bec20'
                            : theme.surface || '#FFFFFF',
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

      {/* Time Pickers in Modal */}
      <Modal
        visible={showTimePicker !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowTimePicker(null);
        }}>
        <TouchableOpacity
          style={styles.pickerModalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowTimePicker(null);
          }}>
          <View
            style={[
              styles.pickerModalContent,
              { backgroundColor: theme.surface || '#FFFFFF' },
            ]}
            onStartShouldSetResponder={() => true}>
            {showTimePicker && (
              <DateTimePicker
                value={showTimePicker === 'start' ? startTime : endTime}
                mode="time"
                display="spinner"
                onChange={(e, date) => onTimeChange(e, date, showTimePicker)}
                style={styles.picker}
              />
            )}
            {/* Done button for both iOS and Android */}
            <TouchableOpacity
              style={styles.pickerDoneButton}
              onPress={() => {
                setShowTimePicker(null);
              }}>
              <Text style={styles.pickerDoneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Day Picker Modal */}
      <Modal
        visible={showDayPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDayPicker(false)}>
        <TouchableOpacity
          style={styles.pickerModalOverlay}
          activeOpacity={1}
          onPress={() => setShowDayPicker(false)}>
          <View
            style={[
              styles.pickerModalContent,
              { backgroundColor: theme.surface || '#FFFFFF' },
            ]}
            onStartShouldSetResponder={() => true}>
            <View style={styles.dayPickerContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayPickerScrollContent}>
                {dayNames.map((dayName, index) => {
                  const isSelected = selectedDay === index;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dayPickerItem,
                        isSelected && styles.dayPickerItemActive,
                        {
                          backgroundColor: isSelected
                            ? '#135bec20'
                            : 'transparent',
                          borderColor: isSelected ? '#135bec' : 'transparent',
                        },
                      ]}
                      onPress={() => {
                        setSelectedDay(index);
                        setHasPickedDay(true);
                        setShowDayPicker(false);
                      }}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.dayPickerItemText,
                          {
                            color: isSelected ? '#135bec' : theme.text,
                            fontWeight: isSelected ? '600' : '500',
                          },
                        ]}>
                        {dayName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.pickerDoneButton}
                onPress={() => setShowDayPicker(false)}>
                <Text style={styles.pickerDoneButtonText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
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
  daySection: {
    padding: 16,
  },
  daySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    flex: 1,
    minWidth: '13%',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonActive: {
    borderWidth: 1,
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '500',
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
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    maxHeight: '50%',
  },
  picker: {
    width: '100%',
    height: Platform.OS === 'ios' ? 200 : undefined,
  },
  pickerDoneButton: {
    padding: 16,
    alignItems: 'center',
  },
  pickerDoneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#135bec',
  },
  dayBadge: {
    fontSize: 14,
    fontWeight: '600',
    color: '#135bec',
    backgroundColor: '#135bec10',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dayPickerContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  dayPickerScrollContent: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  dayPickerItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 4,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPickerItemActive: {
    borderWidth: 2,
  },
  dayPickerItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  venueSection: {
    padding: 16,
  },
  venueSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  venueInput: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
});

export default AddLectureDateTimeScreen;
