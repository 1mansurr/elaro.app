import { isReservedUsername } from '@/constants/reservedUsernames';

/**
 * Username validation utilities
 * 
 * These functions validate usernames according to ELARO's requirements:
 * - Length: 4-20 characters
 * - Characters: letters, numbers, dots, and underscores only
 * - Format: cannot start/end with dots/underscores, no consecutive dots/underscores
 * - Reserved: cannot contain reserved words
 */

export interface UsernameValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates username length (4-20 characters)
 */
export const validateUsernameLength = (
  username: string,
): UsernameValidationResult => {
  if (username.length < 4) {
    return { valid: false, error: 'Username must be at least 4 characters.' };
  }
  if (username.length > 20) {
    return { valid: false, error: 'Username must be 20 characters or less.' };
  }
  return { valid: true };
};

/**
 * Validates username contains only allowed characters
 * Allowed: letters, numbers, dots, and underscores
 */
export const validateUsernameCharacters = (
  username: string,
): UsernameValidationResult => {
  const regex = /^[a-zA-Z0-9_.]+$/;
  if (!regex.test(username)) {
    return {
      valid: false,
      error:
        'Username can only contain letters, numbers, dots, and underscores.',
    };
  }
  return { valid: true };
};

/**
 * Validates username format rules
 * - Cannot start with dot or underscore
 * - Cannot end with dot or underscore
 * - Cannot have consecutive dots or underscores
 */
export const validateUsernameFormat = (
  username: string,
): UsernameValidationResult => {
  // Check start/end
  if (/^[._]/.test(username)) {
    return {
      valid: false,
      error: 'Username cannot start with a dot or underscore.',
    };
  }
  if (/[._]$/.test(username)) {
    return {
      valid: false,
      error: 'Username cannot end with a dot or underscore.',
    };
  }
  // Check consecutive
  if (/[._]{2,}/.test(username)) {
    return {
      valid: false,
      error: 'Username cannot have consecutive dots or underscores.',
    };
  }
  return { valid: true };
};

/**
 * Validates username is not reserved
 */
export const validateReservedUsername = (
  username: string,
): UsernameValidationResult => {
  if (isReservedUsername(username)) {
    return { valid: false, error: 'This username is not available.' };
  }
  return { valid: true };
};

/**
 * Validates username using all validation rules in order
 * Returns the first validation error encountered, or success if all pass
 * 
 * @param username - The username to validate
 * @returns Validation result with first error or success
 */
export const validateUsername = (
  username: string,
): UsernameValidationResult => {
  // Validate in order: Length → Characters → Format → Reserved Word
  if (username.length === 0) {
    return { valid: true }; // Empty is valid (not required until submission)
  }

  const lengthValidation = validateUsernameLength(username);
  if (!lengthValidation.valid) {
    return lengthValidation;
  }

  const charValidation = validateUsernameCharacters(username);
  if (!charValidation.valid) {
    return charValidation;
  }

  const formatValidation = validateUsernameFormat(username);
  if (!formatValidation.valid) {
    return formatValidation;
  }

  const reservedValidation = validateReservedUsername(username);
  if (!reservedValidation.valid) {
    return reservedValidation;
  }

  return { valid: true };
};

