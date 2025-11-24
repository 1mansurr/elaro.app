/**
 * Locale Context
 *
 * Provides locale state and functions to change locale throughout the app.
 */

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useCallback,
} from 'react';
import {
  SupportedLocale,
  setLocale,
  getLocale,
  isRTL,
  LOCALES,
  LOCALE_NAMES,
} from '@/i18n';
import { I18nManager } from 'react-native';

interface LocaleContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  isRTL: boolean;
  localeNames: typeof LOCALE_NAMES;
  supportedLocales: SupportedLocale[];
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};

interface LocaleProviderProps {
  children: ReactNode;
}

export const LocaleProvider: React.FC<LocaleProviderProps> = ({ children }) => {
  const [locale, setLocaleState] = useState<SupportedLocale>(getLocale());
  const rtl = isRTL(locale);

  // Update locale
  const handleSetLocale = useCallback(
    (newLocale: SupportedLocale) => {
      setLocaleState(newLocale);
      setLocale(newLocale);

      // Update RTL layout
      if (I18nManager.forceRTL !== undefined) {
        I18nManager.forceRTL(rtl);
        // Note: App restart may be required for RTL changes to take effect
        // Consider showing a message to user
      }

      console.log(`🌍 Locale changed to: ${newLocale} (RTL: ${rtl})`);
    },
    [rtl],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale: handleSetLocale,
      isRTL: rtl,
      localeNames: LOCALE_NAMES,
      supportedLocales: Object.values(LOCALES),
    }),
    [locale, handleSetLocale, rtl],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
};
