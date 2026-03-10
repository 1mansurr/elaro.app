import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { formatDate as i18nFormatDate } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';

interface TimePickerSectionProps {
  startTime: Date | null;
  endTime: Date | null;
  activePicker: 'day' | 'start' | 'end' | null;
  onToggle: (picker: 'start' | 'end') => void;
  onTimeChange: (
    event: DateTimePickerEvent,
    selectedDate?: Date,
    type?: 'start' | 'end',
  ) => void;
  hasPickedStartTime?: boolean;
  hasPickedEndTime?: boolean;
}

export const TimePickerSection: React.FC<TimePickerSectionProps> = ({
  startTime,
  endTime,
  activePicker,
  onToggle,
  onTimeChange,
  hasPickedStartTime = false,
  hasPickedEndTime = false,
}) => {
  const { theme } = useTheme();

  const formatTime = (date: Date) => {
    return i18nFormatDate(date, { timeStyle: 'short' });
  };

  const getDuration = () => {
    if (!startTime || !endTime) return '';
    const diff = endTime.getTime() - startTime.getTime();
    const minutes = Math.round(diff / (1000 * 60));
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hr`;
  };

  // Use a default date for the picker when time is null
  const pickerStartTime = startTime || new Date();
  const pickerEndTime = endTime || new Date();

  return (
    <View style={[styles.timeSection, { backgroundColor: '#f8fafc' }]}>
      <View style={styles.timeRow}>
        <View style={styles.timeRowLeft}>
          <View style={[styles.iconContainer, { backgroundColor: '#dbeafe' }]}>
            <Ionicons name="time-outline" size={20} color="#2563eb" />
          </View>
          <Text style={[styles.cardLabel, { color: theme.text }]}>Starts</Text>
        </View>
        <TouchableOpacity onPress={() => onToggle('start')}>
          <Text
            style={[
              styles.timeText,
              {
                color: hasPickedStartTime ? theme.text : '#9ca3af',
                fontWeight: hasPickedStartTime ? 'bold' : '500',
              },
            ]}>
            {hasPickedStartTime && startTime
              ? formatTime(startTime)
              : 'Set Time'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Inline Start Time Picker */}
      {activePicker === 'start' && (
        <View style={styles.inlinePickerContainer}>
          <DateTimePicker
            value={pickerStartTime}
            mode="time"
            display="spinner"
            onChange={(e, date) => onTimeChange(e, date, 'start')}
            style={styles.inlinePicker}
          />
        </View>
      )}

      <View style={styles.timeRow}>
        <View style={styles.timeRowLeft}>
          <View style={[styles.iconContainer, { backgroundColor: '#f3e8ff' }]}>
            <Ionicons name="stopwatch-outline" size={20} color="#9333ea" />
          </View>
          <Text style={[styles.cardLabel, { color: theme.text }]}>Ends</Text>
        </View>
        <View style={styles.timeRowRight}>
          {hasPickedStartTime && hasPickedEndTime && startTime && endTime && (
            <Text style={styles.durationBadge}>{getDuration()}</Text>
          )}
          <TouchableOpacity onPress={() => onToggle('end')}>
            <Text
              style={[
                styles.timeText,
                {
                  color: hasPickedEndTime ? theme.text : '#9ca3af',
                  fontWeight: hasPickedEndTime ? 'bold' : '500',
                },
              ]}>
              {hasPickedEndTime && endTime ? formatTime(endTime) : 'Set Time'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Inline End Time Picker */}
      {activePicker === 'end' && (
        <View style={styles.inlinePickerContainer}>
          <DateTimePicker
            value={pickerEndTime}
            mode="time"
            display="spinner"
            onChange={(e, date) => onTimeChange(e, date, 'end')}
            style={styles.inlinePicker}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
  inlinePickerContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  inlinePicker: {
    width: '100%',
    height: Platform.OS === 'ios' ? 200 : undefined,
  },
});
