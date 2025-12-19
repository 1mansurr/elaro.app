import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAddCourse } from '@/features/courses/contexts/AddCourseContext';
import { AddCourseStackParamList } from '@/navigation/AddCourseNavigator';
import { ProgressIndicator } from '@/shared/components';
import { useTheme } from '@/hooks/useTheme';
import {
  DayPickerCard,
  TimePickerSection,
  VenueCard,
  RecurrenceCard,
} from './components';

type ScreenNavigationProp = StackNavigationProp<
  AddCourseStackParamList,
  'AddLectureSetting'
>;

const AddLectureSettingScreen = () => {
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
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [hasPickedDay, setHasPickedDay] = useState(false);
  const [hasPickedStartTime, setHasPickedStartTime] = useState(false);
  const [hasPickedEndTime, setHasPickedEndTime] = useState(false);
  const [activePicker, setActivePicker] = useState<
    'day' | 'start' | 'end' | null
  >(null);
  const [venue, setVenue] = useState(courseData.venue || '');
  const [hasInteractedWithRecurrence, setHasInteractedWithRecurrence] =
    useState(false);
  const [repeats, setRepeats] = useState(true);
  const [recurrence, setRecurrence] = useState<'weekly' | 'bi-weekly' | null>(
    null,
  );

  const onTimeChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
    type?: 'start' | 'end',
  ) => {
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
    } else if (event.type === 'dismissed') {
      setActivePicker(null);
    }
  };

  const handleDaySelect = (dayIndex: number) => {
    setSelectedDay(dayIndex);
    setHasPickedDay(true);
    setActivePicker(null);
  };

  const handlePickerToggle = (picker: 'day' | 'start' | 'end') => {
    if (activePicker === picker) {
      setActivePicker(null);
    } else {
      setActivePicker(picker);
    }
  };

  const handleRecurrenceToggle = (value: boolean) => {
    setRepeats(value);
    setHasInteractedWithRecurrence(true);
    setActivePicker(null);
    if (!value) {
      setRecurrence(null);
    }
  };

  const handleRecurrenceSelect = (option: 'weekly' | 'bi-weekly') => {
    setRecurrence(option);
    setHasInteractedWithRecurrence(true);
    setActivePicker(null);
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

    const now = new Date();
    const currentDay = now.getDay();
    const daysToAdd = (selectedDay - currentDay + 7) % 7;
    const nextDate = new Date(now);
    nextDate.setDate(now.getDate() + (daysToAdd === 0 ? 7 : daysToAdd));
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

        {/* Day and Time Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface || '#FFFFFF',
              borderColor: theme.border,
            },
          ]}>
          <DayPickerCard
            selectedDay={selectedDay}
            activePicker={activePicker}
            onToggle={() => handlePickerToggle('day')}
            onSelect={handleDaySelect}
          />

          <TimePickerSection
            startTime={startTime}
            endTime={endTime}
            activePicker={activePicker}
            onToggle={picker => handlePickerToggle(picker)}
            onTimeChange={onTimeChange}
          />
        </View>

        <VenueCard
          venue={venue}
          onVenueChange={text => {
            setVenue(text);
            setActivePicker(null);
          }}
          onFocus={() => setActivePicker(null)}
        />

        <RecurrenceCard
          repeats={repeats}
          recurrence={recurrence}
          onToggle={handleRecurrenceToggle}
          onSelect={handleRecurrenceSelect}
        />
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

export default AddLectureSettingScreen;
