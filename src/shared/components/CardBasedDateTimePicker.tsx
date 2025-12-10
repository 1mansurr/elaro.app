import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface CardBasedDateTimePickerProps {
  date: Date;
  time?: Date;
  onDateChange: (date: Date) => void;
  onTimeChange?: (time: Date) => void;
  label: string;
  startLabel?: string;
  endLabel?: string;
  showDuration?: boolean;
  startTime?: Date;
  endTime?: Date;
  onStartTimeChange?: (time: Date) => void;
  onEndTimeChange?: (time: Date) => void;
  mode?: 'single' | 'range';
}

export const CardBasedDateTimePicker: React.FC<
  CardBasedDateTimePickerProps
> = ({
  date,
  time,
  onDateChange,
  onTimeChange,
  label,
  startLabel = 'Starts',
  endLabel = 'Ends',
  showDuration = false,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  mode = 'single',
}) => {
  const { theme } = useTheme();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<
    'start' | 'end' | 'single' | null
  >(null);

  const formatTime = (date: Date) => {
    return format(date, 'h:mm a');
  };

  const formatDate = (date: Date) => {
    return format(date, 'MMM dd, yyyy');
  };

  const getDuration = () => {
    if (!startTime || !endTime) return '';
    const diffMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / (1000 * 60),
    );
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      onDateChange(selectedDate);
      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
    } else if (event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  const handleTimeChange = (
    event: DateTimePickerEvent,
    selectedTime?: Date,
  ) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(null);
    }
    if (event.type === 'set' && selectedTime) {
      if (mode === 'range') {
        if (showTimePicker === 'start' && onStartTimeChange) {
          onStartTimeChange(selectedTime);
        } else if (showTimePicker === 'end' && onEndTimeChange) {
          onEndTimeChange(selectedTime);
        }
      } else if (onTimeChange) {
        onTimeChange(selectedTime);
      }
      if (Platform.OS === 'ios') {
        setShowTimePicker(null);
      }
    } else if (event.type === 'dismissed') {
      setShowTimePicker(null);
    }
  };

  if (mode === 'range' && startTime && endTime) {
    return (
      <>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.isDark ? '#1E293B' : '#FFFFFF',
              borderColor: theme.isDark ? '#374151' : '#E5E7EB',
            },
          ]}>
          <View style={styles.cardRow}>
            <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.dateButton}>
              <Text style={[styles.dateText, { color: theme.text }]}>
                {formatDate(startTime)}
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.timeSection,
              {
                backgroundColor: theme.isDark ? '#111827' : '#F8F9FA',
              },
            ]}>
            <View style={styles.timeRow}>
              <Text style={[styles.timeLabel, { color: theme.text }]}>
                {startLabel}
              </Text>
              <TouchableOpacity
                onPress={() => setShowTimePicker('start')}
                style={styles.timeButton}>
                <Text style={[styles.timeText, { color: theme.text }]}>
                  {formatTime(startTime)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timeRow}>
              <View style={styles.endTimeRow}>
                <Text style={[styles.timeLabel, { color: theme.text }]}>
                  {endLabel}
                </Text>
                {showDuration && (
                  <View
                    style={[
                      styles.durationBadge,
                      {
                        backgroundColor: COLORS.primary + '1A',
                        borderColor: COLORS.primary + '33',
                      },
                    ]}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={COLORS.primary}
                    />
                    <Text
                      style={[styles.durationText, { color: COLORS.primary }]}>
                      {getDuration()}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setShowTimePicker('end')}
                style={styles.timeButton}>
                <Text style={[styles.timeText, { color: theme.text }]}>
                  {formatTime(endTime)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={startTime}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={showTimePicker === 'start' ? startTime : endTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}
      </>
    );
  }

  // Single mode (for assignments and study sessions)
  return (
    <>
      <View style={styles.singleModeContainer}>
        <Text
          style={[
            styles.singleLabel,
            { color: theme.isDark ? '#9CA3AF' : '#374151' },
          ]}>
          {label}
        </Text>
        <View style={styles.singleButtonsRow}>
          <TouchableOpacity
            style={[
              styles.singleButton,
              {
                backgroundColor: theme.isDark ? '#1E293B' : '#FFFFFF',
                borderColor: theme.isDark ? '#374151' : '#E5E7EB',
              },
            ]}
            onPress={() => setShowDatePicker(true)}>
            <Ionicons
              name="calendar-outline"
              size={20}
              color={COLORS.primary}
            />
            <Text style={[styles.singleButtonText, { color: theme.text }]}>
              Select Date
            </Text>
          </TouchableOpacity>

          {time && onTimeChange && (
            <TouchableOpacity
              style={[
                styles.singleButton,
                {
                  backgroundColor: theme.isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: theme.isDark ? '#374151' : '#E5E7EB',
                },
              ]}
              onPress={() => setShowTimePicker('single')}>
              <Ionicons name="time-outline" size={20} color={COLORS.primary} />
              <Text style={[styles.singleButtonText, { color: theme.text }]}>
                Select Time
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
      {showTimePicker === 'single' && time && (
        <DateTimePicker
          value={time}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  dateButton: {
    paddingVertical: 4,
  },
  dateText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  timeSection: {
    padding: SPACING.md,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  endTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  timeLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  timeButton: {
    paddingVertical: 4,
  },
  timeText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  durationText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.semibold,
    letterSpacing: 0.5,
  },
  singleModeContainer: {
    marginBottom: SPACING.md,
  },
  singleLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.sm,
  },
  singleButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  singleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  singleButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
});
