import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { COLORS } from '@/constants/theme';

interface ProfileFormInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  helperText?: string;
  editable?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export const ProfileFormInput: React.FC<ProfileFormInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  helperText,
  editable = true,
  autoCapitalize = 'sentences',
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View style={styles.inputContainer}>
        {icon && (
          <View style={styles.iconContainer}>
            <Ionicons
              name={icon}
              size={22}
              color={theme.isDark ? '#9CA3AF' : '#6B7280'}
            />
          </View>
        )}
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.background,
              color: theme.text,
              borderColor: theme.isDark ? '#374151' : '#DBDFE6',
              paddingLeft: icon ? 44 : SPACING.md,
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.isDark ? '#6B7280' : '#9CA3AF'}
          editable={editable}
          autoCapitalize={autoCapitalize}
        />
      </View>
      {helperText && (
        <Text
          style={[
            styles.helperText,
            { color: theme.isDark ? '#9CA3AF' : '#6B7280' },
          ]}>
          {helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginLeft: 4,
  },
  inputContainer: {
    position: 'relative',
  },
  iconContainer: {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: [{ translateY: -11 }],
    zIndex: 1,
  },
  input: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  helperText: {
    fontSize: 12,
    marginLeft: 4,
  },
});
