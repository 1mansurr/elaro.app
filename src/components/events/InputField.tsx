import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
} from '../../constants/theme';

interface InputFieldProps {
  label: string;
  icon?: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
  accessibilityLabel?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  icon,
  error,
  children,
  required = false,
  accessibilityLabel,
}) => (
  <View
    style={styles.container}
    accessible={true}
    accessibilityLabel={accessibilityLabel || label}
    accessibilityRole="text">
    <View style={styles.labelContainer}>
      {icon && (
        <Ionicons
          name={icon as any}
          size={16}
          color={COLORS.textSecondary}
          style={styles.icon}
        />
      )}
      <Text style={styles.labelText}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
    </View>
    <View style={styles.inputContainer}>{children}</View>
    {error && (
      <View style={styles.errorContainer}>
        <Ionicons name="warning" size={14} color={COLORS.error} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  icon: {
    marginRight: SPACING.xs,
  },
  labelText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.textSecondary,
  },
  required: {
    color: COLORS.error,
  },
  inputContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    overflow: 'hidden',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  errorText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.error,
    flex: 1,
  },
});

export default InputField;
