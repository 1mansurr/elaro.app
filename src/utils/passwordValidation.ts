export interface PasswordValidationResult {
  isValid: boolean;
  strength: number; // 0-5
  checks: {
    hasMinLength: boolean;
    hasLowercase: boolean;
    hasUppercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

/**
 * Validates a password against strength requirements
 * @param password - The password to validate
 * @returns Validation result with strength score and individual checks
 */
export const validatePassword = (password: string): PasswordValidationResult => {
  const checks = {
    hasMinLength: password.length >= 8,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[^a-zA-Z0-9]/.test(password),
  };

  let strength = 0;
  if (checks.hasMinLength) strength++;
  if (checks.hasLowercase) strength++;
  if (checks.hasUppercase) strength++;
  if (checks.hasNumber) strength++;
  if (checks.hasSpecialChar) strength++;

  return {
    isValid: Object.values(checks).every(check => check === true),
    strength,
    checks,
  };
};

/**
 * Gets a human-readable label for password strength
 * @param strength - The strength score (0-5)
 * @returns Label string
 */
export const getPasswordStrengthLabel = (strength: number): string => {
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  return labels[strength] || 'Very Weak';
};

/**
 * Gets the color for password strength indicator
 * @param strength - The strength score (0-5)
 * @returns Hex color string
 */
export const getPasswordStrengthColor = (strength: number): string => {
  const colors = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#34C759', '#34C759'];
  return colors[strength - 1] || '#E0E0E0';
};

