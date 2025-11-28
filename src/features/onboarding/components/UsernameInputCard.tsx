import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import {
  validateUsernameLength,
  validateUsernameCharacters,
  validateUsernameFormat,
  validateReservedUsername,
} from '@/utils/usernameValidation';

export interface UsernameInputCardProps {
  username: string;
  onUsernameChange: (username: string) => void;
  isAvailable: boolean | null;
  isChecking: boolean;
  usernameError: string | null;
  onValidate: (username: string) => void;
}

/**
 * UsernameInputCard Component
 * 
 * Displays the username input field with validation feedback and availability checking
 */
export const UsernameInputCard: React.FC<UsernameInputCardProps> = ({
  username,
  onUsernameChange,
  isAvailable,
  isChecking,
  usernameError,
  onValidate,
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleTextChange = (text: string) => {
    // Allow dots and underscores, preserve case
    const formattedText = text.replace(/[^a-zA-Z0-9_.]/g, '');
    onUsernameChange(formattedText);

    // Clear previous validation errors
    setValidationError(null);

    // Validate in order: Length → Characters → Format → Reserved Word
    if (formattedText.length === 0) {
      return; // Don't validate empty input
    }

    // Length validation
    const lengthValidation = validateUsernameLength(formattedText);
    if (!lengthValidation.valid) {
      setValidationError(lengthValidation.error || null);
      return;
    }

    // Character validation
    const charValidation = validateUsernameCharacters(formattedText);
    if (!charValidation.valid) {
      setValidationError(charValidation.error || null);
      return;
    }

    // Format validation
    const formatValidation = validateUsernameFormat(formattedText);
    if (!formatValidation.valid) {
      setValidationError(formatValidation.error || null);
      return;
    }

    // Reserved word validation
    const reservedValidation = validateReservedUsername(formattedText);
    if (!reservedValidation.valid) {
      setValidationError(reservedValidation.error || null);
      return;
    }

    // All validations passed, trigger availability check via API
    onValidate(formattedText);
  };

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['#ffffff', '#fafbff']}
        style={styles.cardGradient}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>👤 Username</Text>
          <View style={styles.requiredBadge}>
            <Text style={styles.requiredText}>Required</Text>
          </View>
        </View>

        <TextInput
          style={styles.input}
          placeholder="e.g., john_doe"
          value={username}
          onChangeText={handleTextChange}
          autoCapitalize="none"
          placeholderTextColor={COLORS.textSecondary}
        />

        {isChecking && (
          <View style={styles.feedbackContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.feedbackText}>Checking availability...</Text>
          </View>
        )}
        {!isChecking && username.length > 0 && username.length < 4 && (
          <Text style={[styles.feedback, styles.error]}>
            Username must be at least 4 characters.
          </Text>
        )}
        {!isChecking && username.length >= 4 && isAvailable === true && (
          <Text style={[styles.feedback, styles.success]}>
            ✓ Username is available!
          </Text>
        )}
        {!isChecking &&
          username.length >= 4 &&
          (validationError || usernameError) && (
            <Text
              style={[
                styles.feedback,
                validationError || isAvailable === false
                  ? styles.error
                  : styles.neutral,
              ]}>
              {validationError ||
                (isAvailable === false ? `✗ ${usernameError}` : usernameError)}
            </Text>
          )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.xl,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  cardGradient: {
    padding: SPACING.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg + 1,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  requiredBadge: {
    backgroundColor: '#fff0f0',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffe0e0',
  },
  requiredText: {
    fontSize: FONT_SIZES.xs,
    color: '#c62828',
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e8eaf6',
    padding: SPACING.md + 2,
    borderRadius: 14,
    fontSize: FONT_SIZES.md,
    backgroundColor: '#fafbff',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  feedbackText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  feedback: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  success: {
    color: '#2e7d32',
  },
  error: {
    color: '#c62828',
  },
  neutral: {
    color: COLORS.textSecondary,
  },
});

