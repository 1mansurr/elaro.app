import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  validatePassword,
  getPasswordStrengthColor,
} from '@/utils/passwordValidation';
import { useTheme } from '@/contexts/ThemeContext';
import {
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
} from '@/constants/theme';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

/**
 * A reusable component that displays password strength requirements and indicator
 *
 * @example
 * ```tsx
 * <PasswordStrengthIndicator
 *   password={password}
 *   showRequirements={true}
 * />
 * ```
 */
export const PasswordStrengthIndicator: React.FC<
  PasswordStrengthIndicatorProps
> = ({ password, showRequirements = true }) => {
  const { theme } = useTheme();
  const validation = validatePassword(password);

  if (password.length === 0) return null;

  return (
    <View>
      {showRequirements && (
        <View style={[styles.requirements, { backgroundColor: theme.surface }]}>
          <Text style={[styles.title, { color: theme.text }]}>
            Password Requirements:
          </Text>

          <RequirementItem
            met={validation.checks.hasMinLength}
            text="At least 8 characters"
            theme={theme}
          />
          <RequirementItem
            met={validation.checks.hasLowercase}
            text="At least one lowercase letter (a-z)"
            theme={theme}
          />
          <RequirementItem
            met={validation.checks.hasUppercase}
            text="At least one uppercase letter (A-Z)"
            theme={theme}
          />
          <RequirementItem
            met={validation.checks.hasNumber}
            text="At least one number (0-9)"
            theme={theme}
          />
          <RequirementItem
            met={validation.checks.hasSpecialChar}
            text="At least one special character (!@#$%...)"
            theme={theme}
          />
        </View>
      )}

      {/* Strength Bar */}
      <View style={styles.strengthContainer}>
        <View
          style={[
            styles.strengthBar,
            {
              width: `${validation.strength * 20}%`,
              backgroundColor: getPasswordStrengthColor(validation.strength),
            },
          ]}
        />
      </View>
    </View>
  );
};

const RequirementItem: React.FC<{ met: boolean; text: string; theme: any }> = ({
  met,
  text,
  theme,
}) => (
  <View style={styles.requirementItem}>
    <Ionicons
      name={met ? 'checkmark-circle' : 'close-circle'}
      size={16}
      color={met ? theme.success : theme.destructive}
    />
    <Text
      style={[
        styles.requirementText,
        { color: met ? theme.success : theme.destructive },
      ]}>
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  requirements: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  title: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold as any,
    marginBottom: SPACING.sm,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  requirementText: {
    fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.xs,
    flex: 1,
  },
  strengthContainer: {
    height: 5,
    width: '100%',
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    marginTop: 4,
    marginBottom: 10,
  },
  strengthBar: {
    height: '100%',
    borderRadius: 5,
  },
});
