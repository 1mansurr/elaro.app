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
const REQUIRED_VARS = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
];

/**
 * Recommended environment variables (warn if missing)
 * Note: Mixpanel is parked, so token is optional
 */
const RECOMMENDED_VARS = [
  'EXPO_PUBLIC_REVENUECAT_APPLE_KEY',
  'EXPO_PUBLIC_SENTRY_DSN',
  // 'EXPO_PUBLIC_MIXPANEL_TOKEN', // Removed - service is parked (see MIXPANEL_STATUS.md)
];

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
    console.error('\n💡 Solution: Add missing variables to your .env file');
    console.error('   See docs/CONFIGURATION_GUIDE.md for details\n');
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  Configuration Warning: Recommended variables missing:');
    result.warnings.forEach(varName => {
      console.warn(`   - ${varName}`);
    });
    console.warn(
      '   These are optional but recommended for full functionality\n',
    );
  }

  if (result.isValid && result.warnings.length === 0) {
    console.log('✅ Configuration validated successfully');
  }
}

/**
 * Get Supabase configuration
 */
export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = getConfigValue('EXPO_PUBLIC_SUPABASE_URL');
  const anonKey = getConfigValue('EXPO_PUBLIC_SUPABASE_ANON_KEY');

  if (!url || !anonKey) {
    console.error('❌ Supabase configuration is missing');
    return null;
  }

  return { url, anonKey };
}

/**
 * Get analytics configuration
 */
export function getAnalyticsConfig(): {
  mixpanelToken?: string;
  sentryDsn?: string;
} {
  return {
    mixpanelToken: getConfigValue('EXPO_PUBLIC_MIXPANEL_TOKEN'),
    sentryDsn: getConfigValue('EXPO_PUBLIC_SENTRY_DSN'),
  };
}

/**
 * Get RevenueCat configuration
 */
export function getRevenueCatConfig(): { appleKey?: string } {
  return {
    appleKey: getConfigValue('EXPO_PUBLIC_REVENUECAT_APPLE_KEY'),
  };
}
