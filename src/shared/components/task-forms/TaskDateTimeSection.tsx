import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CardBasedDateTimePicker } from '@/shared/components';
import { SPACING } from '@/constants/theme';

interface TaskDateTimeSectionProps {
  // For single date/time (assignments)
  date?: Date;
  onDateChange?: (date: Date) => void;
  onTimeChange?: (time: Date) => void;
  
  // For range (lectures)
  startTime?: Date;
  endTime?: Date;
  onStartTimeChange?: (time: Date) => void;
  onEndTimeChange?: (time: Date) => void;
  
  mode: 'single' | 'range';
  label?: string;
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
}) => {
  if (mode === 'range') {
    if (!startTime || !endTime || !onStartTimeChange || !onEndTimeChange || !onDateChange) {
      return null;
    }

    return (
      <View style={styles.field}>
        <CardBasedDateTimePicker
          date={startTime}
          startTime={startTime}
          endTime={endTime}
          onDateChange={onDateChange}
          onStartTimeChange={onStartTimeChange}
          onEndTimeChange={onEndTimeChange}
          label={label || 'Date & Time'}
          mode="range"
          showDuration={true}
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

