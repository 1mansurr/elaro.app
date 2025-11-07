import React from 'react';
import { Text, ViewStyle, TextStyle } from 'react-native';
import { BaseButton } from './BaseButton';
import { useTheme } from '@/contexts/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  hapticFeedback?: boolean;
}

// Primary Button - Main action button
export const PrimaryButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  hapticFeedback = true,
}) => {
  const { theme } = useTheme();

  return (
    <BaseButton
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      style={[styles.primary, { backgroundColor: theme.accent }, style]}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      hapticFeedback={hapticFeedback}>
      <Text style={[styles.text, { color: theme.white }, textStyle]}>
        {title}
      </Text>
    </BaseButton>
  );
};

// Secondary Button - Secondary action button
export const SecondaryButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  hapticFeedback = true,
}) => {
  const { theme } = useTheme();

  return (
    <BaseButton
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      style={[styles.secondary, { backgroundColor: theme.surface }, style]}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      hapticFeedback={hapticFeedback}>
      <Text style={[styles.text, { color: theme.text }, textStyle]}>
        {title}
      </Text>
    </BaseButton>
  );
};

// Outline Button - Outlined button
export const OutlineButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  hapticFeedback = true,
}) => {
  const { theme } = useTheme();

  return (
    <BaseButton
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      style={[
        styles.outline,
        {
          backgroundColor: 'transparent',
          borderColor: theme.accent,
          borderWidth: 1,
        },
        style,
      ]}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      hapticFeedback={hapticFeedback}>
      <Text style={[styles.text, { color: theme.accent }, textStyle]}>
        {title}
      </Text>
    </BaseButton>
  );
};

// Danger Button - Destructive action button
export const DangerButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  hapticFeedback = true,
}) => {
  const { theme } = useTheme();

  return (
    <BaseButton
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      style={[styles.danger, { backgroundColor: theme.destructive }, style]}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      hapticFeedback={hapticFeedback}>
      <Text style={[styles.text, { color: theme.white }, textStyle]}>
        {title}
      </Text>
    </BaseButton>
  );
};

// Ghost Button - Minimal button
export const GhostButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  hapticFeedback = true,
}) => {
  const { theme } = useTheme();

  return (
    <BaseButton
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      style={[styles.ghost, { backgroundColor: 'transparent' }, style]}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      hapticFeedback={hapticFeedback}>
      <Text style={[styles.text, { color: theme.accent }, textStyle]}>
        {title}
      </Text>
    </BaseButton>
  );
};

const styles = {
  primary: {
    // Base styles handled by BaseButton
  },
  secondary: {
    // Base styles handled by BaseButton
  },
  outline: {
    // Base styles handled by BaseButton
  },
  danger: {
    // Base styles handled by BaseButton
  },
  ghost: {
    // Base styles handled by BaseButton
  },
  text: {
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
};
