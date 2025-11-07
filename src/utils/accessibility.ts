/**
 * Accessibility Utilities
 *
 * Provides utilities for accessibility features, screen reader detection,
 * and accessibility helpers.
 */

import React from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Check if screen reader is enabled
 */
export async function isScreenReaderEnabled(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch (error) {
    console.error('Failed to check screen reader status:', error);
    return false;
  }
}

/**
 * Check if reduce motion is enabled (for animations)
 */
export async function isReduceMotionEnabled(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch (error) {
    console.error('Failed to check reduce motion status:', error);
    return false;
  }
}

/**
 * Check if reduce transparency is enabled
 */
export async function isReduceTransparencyEnabled(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      return await AccessibilityInfo.isReduceTransparencyEnabled();
    }
    return false; // Android doesn't support this
  } catch (error) {
    console.error('Failed to check reduce transparency status:', error);
    return false;
  }
}

/**
 * Check if bold text is enabled
 */
export async function isBoldTextEnabled(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      return await AccessibilityInfo.isBoldTextEnabled();
    }
    return false; // Android doesn't support this
  } catch (error) {
    console.error('Failed to check bold text status:', error);
    return false;
  }
}

/**
 * Check if grayscale is enabled
 */
export async function isGrayscaleEnabled(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      return await AccessibilityInfo.isGrayscaleEnabled();
    }
    return false; // Android doesn't support this
  } catch (error) {
    console.error('Failed to check grayscale status:', error);
    return false;
  }
}

/**
 * Check if invert colors is enabled
 */
export async function isInvertColorsEnabled(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      return await AccessibilityInfo.isInvertColorsEnabled();
    }
    return false; // Android doesn't support this
  } catch (error) {
    console.error('Failed to check invert colors status:', error);
    return false;
  }
}

/**
 * Get accessibility props for button
 */
export function getButtonAccessibilityProps(
  label: string,
  hint?: string,
  disabled?: boolean,
): {
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityRole: 'button';
  accessibilityState?: { disabled: boolean };
} {
  return {
    accessibilityLabel: label,
    ...(hint && { accessibilityHint: hint }),
    accessibilityRole: 'button',
    ...(disabled !== undefined && {
      accessibilityState: { disabled },
    }),
  };
}

/**
 * Get accessibility props for text input
 */
export function getInputAccessibilityProps(
  label: string,
  hint?: string,
  error?: string,
): {
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityRole: 'textbox';
} {
  return {
    accessibilityLabel: label,
    accessibilityHint: error || hint,
    accessibilityRole: 'textbox',
  };
}

/**
 * Get accessibility props for list item
 */
export function getListItemAccessibilityProps(
  label: string,
  hint?: string,
): {
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityRole: 'button';
} {
  return {
    accessibilityLabel: label,
    ...(hint && { accessibilityHint: hint }),
    accessibilityRole: 'button',
  };
}

/**
 * Get accessibility props for image
 */
export function getImageAccessibilityProps(
  label: string,
  decorative: boolean = false,
): {
  accessibilityLabel?: string;
  accessibilityRole: 'image';
  accessible: boolean;
} {
  return {
    ...(decorative ? {} : { accessibilityLabel: label }),
    accessibilityRole: 'image',
    accessible: !decorative,
  };
}

/**
 * Format label with state information
 */
export function formatAccessibilityLabel(
  baseLabel: string,
  state?: {
    selected?: boolean;
    checked?: boolean;
    count?: number;
    disabled?: boolean;
  },
): string {
  let label = baseLabel;

  if (state?.selected) {
    label = `${label}, selected`;
  }

  if (state?.checked !== undefined) {
    label = `${label}, ${state.checked ? 'checked' : 'unchecked'}`;
  }

  if (state?.count !== undefined) {
    label = `${label}, ${state.count} items`;
  }

  if (state?.disabled) {
    label = `${label}, disabled`;
  }

  return label;
}

/**
 * Accessibility hook for screen reader detection
 */
export function useAccessibility() {
  const [screenReaderEnabled, setScreenReaderEnabled] = React.useState(false);
  const [reduceMotion, setReduceMotion] = React.useState(false);

  React.useEffect(() => {
    // Check initial state
    isScreenReaderEnabled().then(setScreenReaderEnabled);
    isReduceMotionEnabled().then(setReduceMotion);

    // Listen for changes
    const screenReaderSubscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setScreenReaderEnabled,
    );

    const reduceMotionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => {
      screenReaderSubscription?.remove();
      reduceMotionSubscription?.remove();
    };
  }, []);

  return {
    isScreenReaderEnabled: screenReaderEnabled,
    isReduceMotion: reduceMotion,
  };
}
