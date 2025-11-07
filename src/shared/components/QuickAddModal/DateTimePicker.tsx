import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  COMPONENT_TOKENS,
} from '@/constants/theme';

interface DateTimePickerProps {
  dateTime: Date;
  showDatePicker: boolean;
  showTimePicker: boolean;
  onDateTimeChange: (date: Date) => void;
  onShowDatePicker: (show: boolean) => void;
  onShowTimePicker: (show: boolean) => void;
}

export const DateTimePickerComponent: React.FC<DateTimePickerProps> = ({
  dateTime,
  showDatePicker,
  showTimePicker,
  onDateTimeChange,
  onShowDatePicker,
  onShowTimePicker,
}) => {
  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || dateTime;
    onShowDatePicker(false);
    onDateTimeChange(currentDate);
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    const currentTime = selectedTime || dateTime;
    onShowTimePicker(false);
    onDateTimeChange(currentTime);
  };

  return (
    <>
      {/* Date and Time Selection */}
      <Text style={styles.label}>Due Date & Time *</Text>
      <View style={styles.dateTimeContainer}>
        <TouchableOpacity
          style={styles.dateTimeButton}
          onPress={() => onShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
          <Text style={styles.dateTimeButtonText}>
            {format(dateTime, 'MMM dd, yyyy')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateTimeButton}
          onPress={() => onShowTimePicker(true)}>
          <Ionicons name="time-outline" size={18} color={COLORS.primary} />
          <Text style={styles.dateTimeButtonText}>
            {format(dateTime, 'h:mm a')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={dateTime}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={dateTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: COMPONENT_TOKENS.dateTimePicker.borderWidth,
    borderColor: COMPONENT_TOKENS.dateTimePicker.borderColor,
    borderRadius: COMPONENT_TOKENS.dateTimePicker.borderRadius,
    padding: COMPONENT_TOKENS.dateTimePicker.padding,
    backgroundColor: COMPONENT_TOKENS.dateTimePicker.backgroundColor,
  },
  dateTimeButtonText: {
    fontSize: FONT_SIZES.md,
    color: COMPONENT_TOKENS.dateTimePicker.textColor,
  },
});

export default DateTimePickerComponent;
