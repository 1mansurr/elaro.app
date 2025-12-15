import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  COLORS,
} from '@/constants/theme';

type ViewMode = 'month' | 'week' | 'agenda';

interface ViewModeToggleProps {
  selectedMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  selectedMode,
  onModeChange,
}) => {
  const { theme } = useTheme();

  const modes: { label: string; value: ViewMode }[] = [
    { label: 'Month', value: 'month' },
    { label: 'Week', value: 'week' },
    { label: 'Agenda', value: 'agenda' },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.isDark ? '#374151' : '#E5E7EB',
        },
      ]}>
      {modes.map(mode => {
        const isSelected = selectedMode === mode.value;
        return (
          <TouchableOpacity
            key={mode.value}
            onPress={() => onModeChange(mode.value)}
            style={[
              styles.button,
              isSelected && {
                backgroundColor: theme.isDark ? '#1E293B' : '#FFFFFF',
              },
            ]}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.buttonText,
                {
                  color: isSelected
                    ? theme.text
                    : theme.isDark
                      ? '#9CA3AF'
                      : '#6B7280',
                },
                isSelected && styles.buttonTextSelected,
              ]}>
              {mode.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    padding: 4,
    gap: 4,
    ...SHADOWS.xs,
  },
  button: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  buttonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  buttonTextSelected: {
    fontWeight: FONT_WEIGHTS.semibold,
  },
});
