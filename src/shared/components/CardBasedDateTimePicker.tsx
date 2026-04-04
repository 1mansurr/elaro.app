import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface CardBasedDateTimePickerProps {
  date: Date | null;
  time?: Date | null;
  onDateChange: (date: Date) => void;
  onTimeChange?: (time: Date) => void;
  label: string;
  startLabel?: string;
  endLabel?: string;
  showDuration?: boolean;
  startTime?: Date | null;
  endTime?: Date | null;
  onStartTimeChange?: (time: Date) => void;
  onEndTimeChange?: (time: Date) => void;
  mode?: 'single' | 'range';
  hasPickedStartTime?: boolean;
  hasPickedEndTime?: boolean;
}

type ActivePicker = 'date' | 'time' | 'start' | 'end' | null;

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
  hasPickedStartTime = false,
  hasPickedEndTime = false,
}) => {
  const { theme, isDark } = useTheme();
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [hasPickedDate, setHasPickedDate] = useState(false);
  const [hasPickedTime, setHasPickedTime] = useState(false);

  const formatTime = (d: Date) => format(d, 'h:mm a');
  const formatDate = (d: Date) => format(d, 'MMM dd, yyyy');

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

  const switchPicker = (target: NonNullable<ActivePicker>) => {
    Keyboard.dismiss();
    // Commit the departing picker's value so its button shows the chosen value
    if (activePicker === 'date' && date) setHasPickedDate(true);
    if (activePicker === 'time' && time) setHasPickedTime(true);
    setActivePicker(prev => (prev === target ? null : target));
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === 'android') setActivePicker(null);
    if (event.type === 'dismissed') {
      setActivePicker(null);
      return;
    }
    if (event.type === 'set' && selectedDate) {
      onDateChange(selectedDate);
      setHasPickedDate(true);
    }
  };

  const handleTimeChange = (
    event: DateTimePickerEvent,
    selectedTime?: Date,
  ) => {
    if (Platform.OS === 'android') setActivePicker(null);
    if (event.type === 'dismissed') {
      setActivePicker(null);
      return;
    }
    if (event.type === 'set' && selectedTime) {
      if (mode === 'range') {
        if (activePicker === 'start' && onStartTimeChange)
          onStartTimeChange(selectedTime);
        else if (activePicker === 'end' && onEndTimeChange)
          onEndTimeChange(selectedTime);
      } else if (onTimeChange) {
        onTimeChange(selectedTime);
        setHasPickedTime(true);
      }
    }
  };

  if (mode === 'range') {
    const pickerStartTime = startTime || new Date();
    const pickerEndTime = endTime || new Date();

    return (
      <>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#374151' : '#E5E7EB',
            },
          ]}>
          <View style={styles.cardRow}>
            <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
            <TouchableOpacity
              onPress={() => switchPicker('date')}
              style={styles.dateButton}>
              <Text style={[styles.dateText, { color: theme.text }]}>
                {startTime ? formatDate(startTime) : 'Select Date'}
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.timeSection,
              {
                backgroundColor: isDark ? '#111827' : '#F8F9FA',
              },
            ]}>
            <View style={styles.timeRow}>
              <Text style={[styles.timeLabel, { color: theme.text }]}>
                {startLabel}
              </Text>
              <TouchableOpacity
                onPress={() => switchPicker('start')}
                style={styles.timeButton}>
                <Text
                  style={[
                    styles.timeText,
                    {
                      color: hasPickedStartTime ? theme.text : '#9ca3af',
                      fontWeight: hasPickedStartTime ? 'medium' : 'normal',
                    },
                  ]}>
                  {hasPickedStartTime && startTime
                    ? formatTime(startTime)
                    : 'Set Time'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timeRow}>
              <View style={styles.endTimeRow}>
                <Text style={[styles.timeLabel, { color: theme.text }]}>
                  {endLabel}
                </Text>
                {showDuration &&
                  hasPickedStartTime &&
                  hasPickedEndTime &&
                  startTime &&
                  endTime && (
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
                        style={[
                          styles.durationText,
                          { color: COLORS.primary },
                        ]}>
                        {getDuration()}
                      </Text>
                    </View>
                  )}
              </View>
              <TouchableOpacity
                onPress={() => switchPicker('end')}
                style={styles.timeButton}>
                <Text
                  style={[
                    styles.timeText,
                    {
                      color: hasPickedEndTime ? theme.text : '#9ca3af',
                      fontWeight: hasPickedEndTime ? 'medium' : 'normal',
                    },
                  ]}>
                  {hasPickedEndTime && endTime
                    ? formatTime(endTime)
                    : 'Set Time'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Always mounted — display:none hides without unmounting, preventing iOS collapse animation */}
        <DateTimePicker
          style={
            activePicker !== 'date' ? ({ display: 'none' } as any) : undefined
          }
          value={pickerStartTime}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
        <DateTimePicker
          style={
            activePicker !== 'start' && activePicker !== 'end'
              ? ({ display: 'none' } as any)
              : undefined
          }
          value={activePicker === 'end' ? pickerEndTime : pickerStartTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      </>
    );
  }

  // Single mode (assignments and study sessions)
  return (
    <>
      <View style={styles.singleModeContainer}>
        <Text
          style={[
            styles.singleLabel,
            { color: isDark ? '#9CA3AF' : '#374151' },
          ]}>
          {label}
        </Text>
        <View style={styles.singleButtonsRow}>
          <TouchableOpacity
            style={[
              styles.singleButton,
              {
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderColor: isDark ? '#374151' : '#E5E7EB',
              },
            ]}
            onPress={() => switchPicker('date')}>
            <Ionicons
              name="calendar-outline"
              size={20}
              color={COLORS.primary}
            />
            <Text
              style={[
                styles.singleButtonText,
                {
                  color: hasPickedDate ? theme.text : '#9ca3af',
                  fontWeight: hasPickedDate ? 'medium' : 'normal',
                },
              ]}>
              {hasPickedDate && date ? formatDate(date) : 'Set Date'}
            </Text>
          </TouchableOpacity>

          {onTimeChange && (
            <TouchableOpacity
              style={[
                styles.singleButton,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: isDark ? '#374151' : '#E5E7EB',
                },
              ]}
              onPress={() => switchPicker('time')}>
              <Ionicons name="time-outline" size={20} color={COLORS.primary} />
              <Text
                style={[
                  styles.singleButtonText,
                  {
                    color: hasPickedTime ? theme.text : '#9ca3af',
                    fontWeight: hasPickedTime ? 'medium' : 'normal',
                  },
                ]}>
                {hasPickedTime && time ? formatTime(time) : 'Set Time'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Always mounted — display:none hides without unmounting, preventing iOS collapse animation */}
      <DateTimePicker
        style={
          activePicker !== 'date' ? ({ display: 'none' } as any) : undefined
        }
        value={date || new Date()}
        mode="date"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        onChange={handleDateChange}
        minimumDate={new Date()}
      />
      {onTimeChange && (
        <DateTimePicker
          style={
            activePicker !== 'time' ? ({ display: 'none' } as any) : undefined
          }
          value={time || new Date()}
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
