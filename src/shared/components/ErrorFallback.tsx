/**
 * Error Fallback Component
 *
 * Provides consistent error fallback UI across the app.
 * Used by error boundaries and error states.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
} from '@/constants/theme';
import {
  mapErrorCodeToMessage,
  getErrorTitle,
  isRecoverableError,
} from '@/utils/errorMapping';

export interface ErrorFallbackProps {
  error: Error | unknown;
  resetError?: () => void;
  retry?: () => void | Promise<void>;
  title?: string;
  message?: string;
  showRetry?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  compact?: boolean;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  retry,
  title,
  message,
  showRetry = true,
  icon = 'alert-circle-outline',
  compact = false,
}) => {
  const errorTitle = title || getErrorTitle(error);
  const errorMessage = message || mapErrorCodeToMessage(error);
  const canRetry =
    showRetry && (retry || resetError) && isRecoverableError(error);
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetry = async () => {
    if (isRetrying) return;

    setIsRetrying(true);
    try {
      if (retry) {
        await retry();
      } else if (resetError) {
        resetError();
      }
    } catch (err) {
      console.error('Retry failed:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Ionicons name={icon} size={24} color={COLORS.error} />
        <Text style={styles.compactTitle}>{errorTitle}</Text>
        <Text style={styles.compactMessage}>{errorMessage}</Text>
        {canRetry && (
          <TouchableOpacity
            style={styles.compactButton}
            onPress={handleRetry}
            disabled={isRetrying}>
            <Text style={styles.compactButtonText}>
              {isRetrying ? 'Retrying...' : 'Retry'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name={icon} size={64} color={COLORS.error} />
        <Text style={styles.title}>{errorTitle}</Text>
        <Text style={styles.message}>{errorMessage}</Text>

        {canRetry && (
          <TouchableOpacity
            style={[styles.button, isRetrying && styles.buttonDisabled]}
            onPress={handleRetry}
            disabled={isRetrying}
            activeOpacity={0.8}>
            <Text style={styles.buttonText}>
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </Text>
          </TouchableOpacity>
        )}

        {!canRetry && resetError && (
          <TouchableOpacity
            style={styles.button}
            onPress={resetError}
            activeOpacity={0.8}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  message: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 24,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 200,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: FONT_SIZES.md,
  },
  // Compact styles
  compactContainer: {
    padding: SPACING.md,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.xs,
  },
  compactTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  compactMessage: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  compactButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.xs,
    ...SHADOWS.xs,
  },
  compactButtonText: {
    color: COLORS.white,
    fontWeight: FONT_WEIGHTS.semibold,
    fontSize: FONT_SIZES.sm,
  },
});
