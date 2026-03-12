/**
 * Configuration Validator
 *
 * Validates that all required environment variables are present at runtime.
 * Provides helpful error messages for missing configuration.
 */

import Constants from 'expo-constants';

interface ConfigValidationResult {
  isValid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Required environment variables for app to function
 */
const REQUIRED_VARS: string[] = [];

/**
 * Recommended environment variables (warn if missing)
 */
const RECOMMENDED_VARS: string[] = [];

/**
 * Validate app configuration
 *
 * @returns Validation result with missing vars and warnings
 */
export function validateConfig(): ConfigValidationResult {
  const extra = Constants.expoConfig?.extra || {};
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  REQUIRED_VARS.forEach(varName => {
    const value = extra[varName];
    if (!value || value === '') {
      missing.push(varName);
    }
  });

  // Check recommended variables
  RECOMMENDED_VARS.forEach(varName => {
    const value = extra[varName];
    if (!value || value === '') {
      warnings.push(varName);
    }
  });

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Get configuration value with validation
 *
 * @param varName - Environment variable name
 * @param defaultValue - Default value if not found
 * @returns Configuration value or default
 */
export function getConfigValue(
  varName: string,
  defaultValue?: string,
): string | undefined {
  const extra = Constants.expoConfig?.extra || {};
  const value = extra[varName];

  if (!value && defaultValue === undefined) {
    console.warn(`⚠️ Configuration variable ${varName} is not set`);
  }

  return value || defaultValue;
}

/**
 * Validate and log configuration issues
 *
 * Call this during app initialization to catch config issues early
 */
export function validateAndLogConfig(): void {
  const result = validateConfig();

  if (!result.isValid) {
    console.error('❌ Configuration Error: Missing required variables:');
    result.missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  Configuration Warning: Recommended variables missing:');
    result.warnings.forEach(varName => {
      console.warn(`   - ${varName}`);
    });
  }

  if (result.isValid && result.warnings.length === 0) {
    console.log('✅ Configuration validated successfully');
  }
}
