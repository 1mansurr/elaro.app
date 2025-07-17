import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Appearance, ColorSchemeName, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_PREFERENCE_KEY = 'theme_preference';

const lightTheme = {
  background: '#FFFFFF',
  surface: '#F2F2F7',
  text: '#000000',
  textSecondary: '#8E8E93',
  accent: '#007AFF',
  destructive: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  border: '#E0E0E0',
  separator: '#E0E0E0',
  card: '#FFFFFF',
  input: '#FFFFFF',
  inputBorder: '#E0E0E0',
  // Extended tokens from COLORS
  primary: '#2C5EFF',
  primaryLight: '#5A7FFF',
  primaryDark: '#1E42CC',
  secondary: '#FF6B6B',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#F5F5F5',
  lightGray: '#E0E0E0',
  darkGray: '#666666',
  error: '#F44336',
  info: '#2196F3',
  textPrimary: '#212121',
  textLight: '#BDBDBD',
  backgroundSecondary: '#F8F9FA',
  divider: '#F0F0F0',
  overlay: 'rgba(0, 0, 0, 0.5)',
  modalBackground: 'rgba(0, 0, 0, 0.3)',
  green: '#8BC34A',
  blue: '#03A9F4',
  purple: '#9C27B0',
  orange: '#FF9800',
  yellow: '#FFEB3B',
  pink: '#E91E63',
  red: '#F44336',
  elaroGradientStart: '#667eea',
  elaroGradientEnd: '#764ba2',
  oddityGradientStart: '#f093fb',
  oddityGradientEnd: '#f5576c',
  oddityGold: '#FFD700',
  // Tailwind-style tokens
  yellow50: '#fefce8',
  yellow100: '#fef3c7',
  yellow200: '#fde68a',
  yellow400: '#facc15',
  yellow500: '#eab308',
  yellow600: '#ca8a04',
  yellow700: '#a16207',
  orange50: '#fff7ed',
  orange100: '#ffedd5',
  orange200: '#fed7aa',
  orange400: '#fb923c',
  orange500: '#f97316',
  orange600: '#ea580c',
  purple50: '#faf5ff',
  purple100: '#f3e8ff',
  purple200: '#e9d5ff',
  purple400: '#c084fc',
  purple500: '#a855f7',
  purple600: '#9333ea',
  purple800: '#6b21a8',
  blue50: '#eff6ff',
  blue100: '#dbeafe',
  blue200: '#bfdbfe',
  blue400: '#60a5fa',
  blue500: '#3b82f6',
  blue600: '#2563eb',
  blue700: '#1d4ed8',
  green50: '#f0fdf4',
  green100: '#dcfce7',
  green200: '#bbf7d0',
  green300: '#86efac',
  green400: '#4ade80',
  green500: '#22c55e',
  green600: '#16a34a',
  green700: '#15803d',
  green800: '#166534',
  red50: '#fef2f2',
  red100: '#fee2e2',
  red200: '#fecaca',
  red400: '#f87171',
  red500: '#ef4444',
  red600: '#dc2626',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
};

const darkTheme = {
  background: '#1C1C1E',
  surface: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  accent: '#007AFF',
  destructive: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  border: '#38383A',
  separator: '#38383A',
  card: '#232329',
  input: '#232329',
  inputBorder: '#38383A',
  // Extended tokens from COLORS
  primary: '#2C5EFF',
  primaryLight: '#5A7FFF',
  primaryDark: '#1E42CC',
  secondary: '#FF6B6B',
  white: '#232329',
  black: '#000000',
  gray: '#232329',
  lightGray: '#38383A',
  darkGray: '#666666',
  error: '#F44336',
  info: '#2196F3',
  textPrimary: '#FFFFFF',
  textLight: '#BDBDBD',
  backgroundSecondary: '#232329',
  divider: '#232329',
  overlay: 'rgba(0, 0, 0, 0.7)',
  modalBackground: 'rgba(0, 0, 0, 0.5)',
  green: '#8BC34A',
  blue: '#03A9F4',
  purple: '#9C27B0',
  orange: '#FF9800',
  yellow: '#FFEB3B',
  pink: '#E91E63',
  red: '#F44336',
  elaroGradientStart: '#667eea',
  elaroGradientEnd: '#764ba2',
  oddityGradientStart: '#f093fb',
  oddityGradientEnd: '#f5576c',
  oddityGold: '#FFD700',
  // Tailwind-style tokens
  yellow50: '#fefce8',
  yellow100: '#fef3c7',
  yellow200: '#fde68a',
  yellow400: '#facc15',
  yellow500: '#eab308',
  yellow600: '#ca8a04',
  yellow700: '#a16207',
  orange50: '#fff7ed',
  orange100: '#ffedd5',
  orange200: '#fed7aa',
  orange400: '#fb923c',
  orange500: '#f97316',
  orange600: '#ea580c',
  purple50: '#faf5ff',
  purple100: '#f3e8ff',
  purple200: '#e9d5ff',
  purple400: '#c084fc',
  purple500: '#a855f7',
  purple600: '#9333ea',
  purple800: '#6b21a8',
  blue50: '#eff6ff',
  blue100: '#dbeafe',
  blue200: '#bfdbfe',
  blue400: '#60a5fa',
  blue500: '#3b82f6',
  blue600: '#2563eb',
  blue700: '#1d4ed8',
  green50: '#f0fdf4',
  green100: '#dcfce7',
  green200: '#bbf7d0',
  green300: '#86efac',
  green400: '#4ade80',
  green500: '#22c55e',
  green600: '#16a34a',
  green700: '#15803d',
  green800: '#166534',
  red50: '#fef2f2',
  red100: '#fee2e2',
  red200: '#fecaca',
  red400: '#f87171',
  red500: '#ef4444',
  red600: '#dc2626',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
};

export type ThemeType = typeof lightTheme;

interface ThemeContextProps {
  theme: ThemeType;
  colorScheme: ColorSchemeName;
  isDark: boolean;
  toggleTheme: (mode?: 'light' | 'dark' | 'system') => void;
  mode: 'light' | 'dark' | 'system';
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  console.log('ThemeProvider mounted');
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<'light' | 'dark' | 'system'>('system');
  const [colorScheme, setColorScheme] = useState<ColorSchemeName>(systemColorScheme);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setMode(stored);
      }
    })();
  }, []);

  useEffect(() => {
    if (mode === 'system') {
      setColorScheme(systemColorScheme);
    } else {
      setColorScheme(mode);
    }
  }, [mode, systemColorScheme]);

  const toggleTheme = async (newMode?: 'light' | 'dark' | 'system') => {
    let nextMode: 'light' | 'dark' | 'system';
    if (newMode) {
      nextMode = newMode;
    } else {
      nextMode = mode === 'light' ? 'dark' : 'light';
    }
    setMode(nextMode);
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, nextMode);
  };

  const isDark = colorScheme === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, colorScheme, isDark, toggleTheme, mode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  console.log('useTheme called');
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Add a warning with stack trace for debugging
    console.warn('[⚠️ useTheme] Called outside of ThemeProvider', new Error().stack);
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}; 