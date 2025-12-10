import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface SegmentedControlOption {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  selectedValue: string | null;
  onValueChange: (value: string) => void;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selectedValue,
  onValueChange,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.isDark ? '#1E293B' : '#FFFFFF',
        },
      ]}>
      {options.map((option, index) => {
        const isSelected = selectedValue === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.button,
              isSelected && styles.buttonSelected,
              index === 0 && styles.buttonFirst,
              index === options.length - 1 && styles.buttonLast,
            ]}
            onPress={() => onValueChange(option.value)}
            activeOpacity={0.7}>
            {option.icon && (
              <Ionicons
                name={option.icon}
                size={18}
                color={
                  isSelected ? '#FFFFFF' : theme.isDark ? '#9CA3AF' : '#6B7280'
                }
              />
            )}
            <Text
              style={[
                styles.buttonText,
                {
                  color: isSelected
                    ? '#FFFFFF'
                    : theme.isDark
                      ? '#9CA3AF'
                      : '#6B7280',
                },
                isSelected && styles.buttonTextSelected,
              ]}>
              {option.label}
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
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    borderRadius: 8,
  },
  buttonSelected: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonFirst: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  buttonLast: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  buttonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  buttonTextSelected: {
    fontWeight: FONT_WEIGHTS.semibold,
  },
});
