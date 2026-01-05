import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CardBasedDateTimePicker } from '@/shared/components/CardBasedDateTimePicker';
import { SPACING } from '@/constants/theme';

interface TaskDateTimeSectionProps {
  // For single date/time (assignments)
  date?: Date | null;
  onDateChange?: (date: Date) => void;
  onTimeChange?: (time: Date) => void;

  // For range (lectures)
  startTime?: Date | null;
  endTime?: Date | null;
  onStartTimeChange?: (time: Date) => void;
  onEndTimeChange?: (time: Date) => void;

  mode: 'single' | 'range';
  label?: string;
  hasPickedStartTime?: boolean;
  hasPickedEndTime?: boolean;
}

export const TaskDateTimeSection: React.FC<TaskDateTimeSectionProps> = ({
  date,
  onDateChange,
  onTimeChange,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  mode,
  label,
  hasPickedStartTime = false,
  hasPickedEndTime = false,
}) => {
  if (mode === 'range') {
    if (!onStartTimeChange || !onEndTimeChange || !onDateChange) {
      return null;
    }

    // Use a default date for the picker when time is null
    const pickerDate = startTime || new Date();

    return (
      <View style={styles.field}>
        <CardBasedDateTimePicker
          date={pickerDate}
          startTime={startTime}
          endTime={endTime}
          onDateChange={onDateChange}
          onStartTimeChange={onStartTimeChange}
          onEndTimeChange={onEndTimeChange}
          label={label || 'Date & Time'}
          mode="range"
          showDuration={true}
          hasPickedStartTime={hasPickedStartTime}
          hasPickedEndTime={hasPickedEndTime}
        />
      </View>
    );
  }

  // Single mode
  if (!date || !onDateChange || !onTimeChange) {
    return null;
  }

  return (
    <View style={styles.field}>
      <CardBasedDateTimePicker
        date={date}
        time={date}
        onDateChange={onDateChange}
        onTimeChange={onTimeChange}
        label={label || 'Date & Time'}
        mode="single"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    marginBottom: SPACING.lg,
  },
});
