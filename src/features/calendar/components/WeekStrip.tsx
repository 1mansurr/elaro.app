// FILE: src/components/Calendar/WeekStrip.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  format,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameDay,
} from 'date-fns';
import { useTheme } from '@/contexts/ThemeContext';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from '@/constants/theme';

interface Props {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

const WeekStrip: React.FC<Props> = ({ selectedDate, onDateSelect }) => {
  const { theme } = useTheme();
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}>
      {weekDays.map(day => {
        const isSelected = isSameDay(day, selectedDate);
        return (
          <TouchableOpacity
            key={day.toISOString()}
            style={[
              styles.dayContainer,
              {
                backgroundColor: theme.isDark ? '#1E293B' : '#FFFFFF',
                borderColor: theme.isDark
                  ? 'rgba(255, 255, 255, 0.1)'
                  : '#E5E7EB',
              },
              isSelected && [
                styles.selectedDayContainer,
                {
                  backgroundColor: COLORS.primary,
                },
              ],
            ]}
            onPress={() => onDateSelect(day)}>
            <Text
              style={[
                styles.dayName,
                {
                  color: isSelected
                    ? '#FFFFFF'
                    : theme.isDark
                      ? '#9CA3AF'
                      : '#6B7280',
                },
              ]}>
              {format(day, 'E')}
            </Text>
            <Text
              style={[
                styles.dayNumber,
                {
                  color: isSelected
                    ? '#FFFFFF'
                    : theme.isDark
                      ? '#FFFFFF'
                      : '#111418',
                },
              ]}>
              {format(day, 'd')}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
  },
  dayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 70,
    borderRadius: BORDER_RADIUS.md,
    marginHorizontal: SPACING.xs,
    borderWidth: 1,
    ...SHADOWS.xs,
  },
  selectedDayContainer: {
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.xs,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  dayName: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  dayNumber: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
});

export default WeekStrip;
