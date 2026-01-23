import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Input } from '@/shared/components/Input';
import { useTheme } from '@/contexts/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface TaskTitleFieldProps {
  title: string;
  onChange: (title: string) => void;
  placeholder?: string;
  maxLength?: number;
  label?: string;
  showCharacterCount?: boolean;
}

export const TaskTitleField: React.FC<TaskTitleFieldProps> = ({
  title,
  onChange,
  placeholder = 'Enter title',
  maxLength = 35,
  label,
  showCharacterCount = true,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <View style={styles.field}>
      {label && (
        <View style={styles.labelRow}>
          <Text
            style={[
              styles.label,
              { color: isDark ? '#FFFFFF' : '#374151' },
            ]}>
            {label}
          </Text>
          {showCharacterCount && (
            <Text
              style={[
                styles.characterCount,
                { color: isDark ? '#9CA3AF' : '#6B7280' },
              ]}>
              {title.length}/{maxLength}
            </Text>
          )}
        </View>
      )}
      <Input
        value={title}
        onChangeText={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    marginBottom: SPACING.lg,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  characterCount: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
});
