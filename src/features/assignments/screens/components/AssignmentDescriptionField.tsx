import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface AssignmentDescriptionFieldProps {
  description: string;
  onDescriptionChange: (description: string) => void;
}

export const AssignmentDescriptionField: React.FC<AssignmentDescriptionFieldProps> = ({
  description,
  onDescriptionChange,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.field}>
      <Text
        style={[
          styles.label,
          { color: theme.isDark ? '#FFFFFF' : '#374151' },
        ]}>
        Description
      </Text>
      <TextInput
        style={[
          styles.textArea,
          {
            backgroundColor: theme.isDark ? '#1C252E' : '#FFFFFF',
            borderColor: theme.isDark ? '#3B4754' : 'transparent',
            color: theme.isDark ? '#FFFFFF' : '#111418',
          },
        ]}
        value={description}
        onChangeText={onDescriptionChange}
        placeholder="Add any additional details..."
        placeholderTextColor={theme.isDark ? '#6B7280' : '#9CA3AF'}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        maxLength={500}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.sm,
  },
  textArea: {
    minHeight: 100,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: FONT_SIZES.md,
  },
});

