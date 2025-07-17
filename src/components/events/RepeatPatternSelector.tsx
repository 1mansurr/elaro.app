import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const DAYS_OF_WEEK = [
  { short: 'M', long: 'Mon', full: 'Monday' },
  { short: 'T', long: 'Tue', full: 'Tuesday' },
  { short: 'W', long: 'Wed', full: 'Wednesday' },
  { short: 'T', long: 'Thu', full: 'Thursday' },
  { short: 'F', long: 'Fri', full: 'Friday' },
  { short: 'S', long: 'Sat', full: 'Saturday' },
  { short: 'S', long: 'Sun', full: 'Sunday' },
];

const PRESET_PATTERNS = [
  { label: 'MWF', days: ['Monday', 'Wednesday', 'Friday'] },
  { label: 'TTh', days: ['Tuesday', 'Thursday'] },
  { label: 'Daily', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
  { label: 'Weekends', days: ['Saturday', 'Sunday'] },
];

interface RepeatPatternSelectorProps {
  selectedDays: string[];
  onDaysChange: (days: string[]) => void;
  endDate: Date;
  onEndDateChange: (date: Date) => void;
  errors?: { repeatDays?: string; endDate?: string };
}

export const RepeatPatternSelector: React.FC<RepeatPatternSelectorProps> = ({
  selectedDays,
  onDaysChange,
  endDate,
  onEndDateChange,
  errors,
}) => {
  const [showCustom, setShowCustom] = useState(false);
  
  const handlePresetSelect = (preset: typeof PRESET_PATTERNS[0]) => {
    onDaysChange(preset.days);
    setShowCustom(false);
  };
  
  const handleDayToggle = (day: string) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day];
    onDaysChange(newDays);
  };
  
  const isPresetSelected = (preset: typeof PRESET_PATTERNS[0]) => {
    return JSON.stringify(selectedDays.sort()) === JSON.stringify(preset.days.sort());
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Repeat Pattern</Text>
      
      <View style={styles.presetGrid}>
        {PRESET_PATTERNS.map((preset) => (
          <TouchableOpacity
            key={preset.label}
            style={[
              styles.presetButton,
              isPresetSelected(preset) && styles.presetButtonSelected,
            ]}
            onPress={() => handlePresetSelect(preset)}
            accessibilityRole="button"
            accessibilityLabel={`Select ${preset.label} pattern`}
            accessibilityState={{ selected: isPresetSelected(preset) }}
          >
            <Text style={[
              styles.presetLabel,
              isPresetSelected(preset) && styles.presetLabelSelected,
            ]}>
              {preset.label}
            </Text>
            <Text style={[
              styles.presetSubtext,
              isPresetSelected(preset) && styles.presetSubtextSelected,
            ]}>
              {preset.days.map(d => d.slice(0, 3)).join(', ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <TouchableOpacity
        style={styles.customButton}
        onPress={() => setShowCustom(!showCustom)}
        accessibilityRole="button"
        accessibilityLabel="Toggle custom pattern selection"
      >
        <Ionicons 
          name={showCustom ? "chevron-up" : "chevron-down"} 
          size={16} 
          color={COLORS.primary} 
        />
        <Text style={styles.customButtonText}>Custom pattern</Text>
      </TouchableOpacity>
      
      {showCustom && (
        <View style={styles.customDaysContainer}>
          <View style={styles.daysGrid}>
            {DAYS_OF_WEEK.map((day) => (
              <TouchableOpacity
                key={day.full}
                style={[
                  styles.dayButton,
                  selectedDays.includes(day.full) && styles.dayButtonSelected,
                ]}
                onPress={() => handleDayToggle(day.full)}
                accessibilityRole="button"
                accessibilityLabel={`Toggle ${day.full}`}
                accessibilityState={{ selected: selectedDays.includes(day.full) }}
              >
                <Text style={[
                  styles.dayButtonText,
                  selectedDays.includes(day.full) && styles.dayButtonTextSelected,
                ]}>
                  {day.short}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      
      {errors?.repeatDays && (
        <Text style={styles.errorText}>{errors.repeatDays}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  presetButton: {
    flex: 1,
    minWidth: 80,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    alignItems: 'center',
    ...SHADOWS.xs,
  },
  presetButtonSelected: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary,
  },
  presetLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  presetLabelSelected: {
    color: COLORS.primary,
  },
  presetSubtext: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  presetSubtextSelected: {
    color: COLORS.primary + 'CC',
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
  customButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  customDaysContainer: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.md,
  },
  daysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  dayButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.text,
  },
  dayButtonTextSelected: {
    color: COLORS.white,
  },
  errorText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
});

export default RepeatPatternSelector; 