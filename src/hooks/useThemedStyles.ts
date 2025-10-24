import { useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeType } from '@/contexts/ThemeContext';

/**
 * Hook for creating memoized themed styles
 * Reduces theme context re-renders by memoizing style objects
 */
export const useThemedStyles = <T>(
  styleFactory: (theme: ThemeType) => T
): T => {
  const { theme } = useTheme();
  
  return useMemo(() => styleFactory(theme), [theme, styleFactory]);
};

/**
 * Hook for creating static styles that don't depend on theme
 * Use this for styles that are consistent across themes
 */
export const useStaticStyles = <T>(styles: T): T => {
  return useMemo(() => styles, []);
};

/**
 * Hook for creating conditional themed styles
 * Use this when you need to apply different styles based on theme state
 */
export const useConditionalThemedStyles = <T>(
  styleFactory: (theme: ThemeType, isDark: boolean) => T
): T => {
  const { theme, isDark } = useTheme();
  
  return useMemo(() => styleFactory(theme, isDark), [theme, isDark, styleFactory]);
};
