import { User } from '@/types';

/**
 * Sanitizes and validates user profile data to prevent display issues
 * Removes database artifacts, JSON strings, and invalid characters
 */
export function sanitizeProfileData(user: User | null): {
  firstName: string;
  lastName: string;
  username: string;
  university: string;
  program: string;
  country: string;
} {
  if (!user) {
    return {
      firstName: '',
      lastName: '',
      username: '',
      university: '',
      program: '',
      country: '',
    };
  }

  /**
   * Cleans a string value by:
   * - Removing JSON-like artifacts
   * - Removing database column names that might leak through
   * - Trimming whitespace
   * - Returning empty string for invalid values
   */
  const clean = (str: string | undefined | null): string => {
    if (!str || typeof str !== 'string') return '';

    const trimmed = str.trim();

    // Check for JSON artifacts (common database serialization issues)
    if (
      trimmed.includes('{') ||
      trimmed.includes('}') ||
      trimmed.includes('"') ||
      trimmed.includes('[') ||
      trimmed.includes(']')
    ) {
      // If it looks like JSON, try to parse it
      // Guard: Only parse if trimmed is valid
      if (
        trimmed &&
        trimmed !== 'undefined' &&
        trimmed !== 'null'
      ) {
        try {
          const parsed = JSON.parse(trimmed);
          // If it's an object, try to extract meaningful values
          if (typeof parsed === 'object' && parsed !== null) {
            // Look for common field names
            const value =
              parsed.first_name ||
              parsed.firstName ||
              parsed.name ||
              parsed.value ||
              '';
            return typeof value === 'string' ? value.trim() : '';
          }
          return '';
        } catch {
          return '';
        }
      }
      // Not valid JSON, return empty
      return '';
    }

    // Check for database column names that might leak through
    const dbColumnPatterns = [
      /^first_name$/i,
      /^last_name$/i,
      /^username$/i,
      /^university$/i,
      /^program$/i,
      /^country$/i,
      /^user_metadata$/i,
    ];

    if (dbColumnPatterns.some(pattern => pattern.test(trimmed))) {
      return '';
    }

    return trimmed;
  };

  return {
    firstName: clean(user.first_name),
    lastName: clean(user.last_name),
    username: clean(user.username),
    university: clean(user.university),
    program: clean(user.program),
    country: clean(user.country),
  };
}

/**
 * Validates that profile data is complete and ready for display
 */
export function isProfileDataValid(
  data: ReturnType<typeof sanitizeProfileData>,
): boolean {
  // At minimum, we should have a username or name
  return !!(data.username || data.firstName || data.lastName);
}
