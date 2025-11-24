import React from 'react';
import { ViewStyle, TextStyle } from 'react-native';
import {
  PrimaryButton,
  SecondaryButton,
  OutlineButton,
  DangerButton,
  GhostButton,
} from './ButtonVariants';

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

// Button factory that provides all variants
export const Button = {
  Primary: PrimaryButton,
  Secondary: SecondaryButton,
  Outline: OutlineButton,
  Danger: DangerButton,
  Ghost: GhostButton,
};

// Default export for backward compatibility
export const DefaultButton = PrimaryButton;

// Export individual components for direct import
export {
  PrimaryButton,
  SecondaryButton,
  OutlineButton,
  DangerButton,
  GhostButton,
};

// Type for button variants
export type ButtonVariant = keyof typeof Button;
