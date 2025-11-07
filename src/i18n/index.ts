/**
 * Internationalization (i18n) Configuration
 *
 * Provides basic i18n infrastructure for future translation support.
 * Currently uses English as default, but structure is ready for multi-language support.
 */

// Supported locales
export type SupportedLocale = 'en' | 'es' | 'fr' | 'ar'; // English, Spanish, French, Arabic (RTL)

// Current locale (defaults to device locale or 'en')
let currentLocale: SupportedLocale = 'en';

// Locale detection
export function detectLocale(): SupportedLocale {
  // In the future, this can detect device locale
  // For now, default to English
  return 'en';
}

// Set locale
export function setLocale(locale: SupportedLocale): void {
  currentLocale = locale;
  console.log(`🌍 Locale set to: ${locale}`);
}

// Get current locale
export function getLocale(): SupportedLocale {
  return currentLocale;
}

// Check if locale is RTL
export function isRTL(locale?: SupportedLocale): boolean {
  const loc = locale || currentLocale;
  const rtlLocales: SupportedLocale[] = ['ar']; // Arabic is RTL
  return rtlLocales.includes(loc);
}

// Translation function (placeholder for future i18n library)
// Currently returns the key as-is (English)
export function t(
  key: string,
  params?: Record<string, string | number>,
): string {
  // Future: Replace with i18next or react-i18next
  // For now, return key with params replaced
  if (params) {
    let result = key;
    Object.entries(params).forEach(([paramKey, value]) => {
      result = result.replace(`{{${paramKey}}}`, String(value));
    });
    return result;
  }
  return key;
}

// Format number based on locale
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  try {
    return new Intl.NumberFormat(currentLocale, options).format(value);
  } catch (error) {
    console.error('Error formatting number:', error);
    return String(value);
  }
}

// Format date based on locale
export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  try {
    const dateObj =
      typeof date === 'string' || typeof date === 'number'
        ? new Date(date)
        : date;
    return new Intl.DateTimeFormat(currentLocale, options).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return String(date);
  }
}

// Format currency based on locale
export function formatCurrency(
  value: number,
  currency: string = 'USD',
  options?: Intl.NumberFormatOptions,
): string {
  try {
    return new Intl.NumberFormat(currentLocale, {
      style: 'currency',
      currency,
      ...options,
    }).format(value);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${currency} ${value}`;
  }
}

// Initialize i18n
export function initializeI18n(): void {
  currentLocale = detectLocale();
  console.log(`🌍 i18n initialized with locale: ${currentLocale}`);

  // Future: Initialize i18next or react-i18next here
  // i18n.init({
  //   lng: currentLocale,
  //   resources: {
  //     en: { translation: require('./locales/en.json') },
  //     es: { translation: require('./locales/es.json') },
  //     // ...
  //   },
  // });
}

// Export locale constants
export const LOCALES = {
  ENGLISH: 'en' as SupportedLocale,
  SPANISH: 'es' as SupportedLocale,
  FRENCH: 'fr' as SupportedLocale,
  ARABIC: 'ar' as SupportedLocale,
} as const;

// Locale display names
export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  ar: 'العربية',
};

// Initialize on import
initializeI18n();
