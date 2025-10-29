import { COLORS } from '@/constants/theme';

// Common hardcoded colors mapped to theme colors
export const COLOR_MAPPINGS = {
  '#007AFF': 'COLORS.primary',
  '#2C5EFF': 'COLORS.primary',
  '#3B82F6': 'COLORS.blue500',
  '#FFFFFF': 'COLORS.white',
  '#FFF': 'COLORS.white',
  '#000000': 'COLORS.black',
  '#000': 'COLORS.black',
  '#333333': 'COLORS.textPrimary',
  '#333': 'COLORS.textPrimary',
  '#666666': 'COLORS.textSecondary',
  '#666': 'COLORS.textSecondary',
  '#8E8E93': 'COLORS.textSecondary',
  '#999999': 'COLORS.textSecondary',
  '#FF3B30': 'COLORS.error',
  '#F44336': 'COLORS.error',
  '#DC2626': 'COLORS.red600',
  '#34C759': 'COLORS.success',
  '#10B981': 'COLORS.green500',
  '#22C55E': 'COLORS.green500',
  '#FF9500': 'COLORS.warning',
  '#F59E0B': 'COLORS.yellow500',
  '#FF9800': 'COLORS.warning',
  '#F8F9FA': 'COLORS.backgroundSecondary',
  '#F2F2F7': 'COLORS.surface',
  '#E0E0E0': 'COLORS.lightGray',
  '#E3F2FD': 'COLORS.blue50',
  '#38383A': 'COLORS.border',
  '#8B5CF6': 'COLORS.purple500',
  '#9C27B0': 'COLORS.purple',
  '#8B0000': 'COLORS.red700',
  '#FFF5F5': 'COLORS.red50',
  '#FFE4E1': 'COLORS.red200',
  '#FFE4B5': 'COLORS.yellow200',
  '#FFFAF0': 'COLORS.yellow50',
  '#F0F5FF': 'COLORS.blue50',
  '#F0FFF4': 'COLORS.green50',
} as const;

export const EXTENDED_COLOR_MAPPINGS = {
  '#1D4ED8': 'COLORS.blue700',
  '#60A5FA': 'COLORS.blue400',
  '#059669': 'COLORS.green600',
  '#4ADE80': 'COLORS.green400',
  '#D97706': 'COLORS.yellow600',
  '#FBBF24': 'COLORS.yellow400',
  '#7C3AED': 'COLORS.purple600',
  '#A78BFA': 'COLORS.purple400',
} as const;

export const normalizeHex = (hex: string) => hex.toUpperCase();

export const getThemeColor = (hardcodedColor: string): string => {
  const normalized = normalizeHex(hardcodedColor);
  if (COLOR_MAPPINGS[normalized as keyof typeof COLOR_MAPPINGS]) {
    return COLOR_MAPPINGS[normalized as keyof typeof COLOR_MAPPINGS];
  }
  if (EXTENDED_COLOR_MAPPINGS[normalized as keyof typeof EXTENDED_COLOR_MAPPINGS]) {
    return EXTENDED_COLOR_MAPPINGS[normalized as keyof typeof EXTENDED_COLOR_MAPPINGS];
  }
  return hardcodedColor;
};

export const isHardcodedColor = (color: string): boolean => {
  return /^#[0-9A-Fa-f]{3,6}$/.test(color);
};

export const replaceHardcodedColors = (content: string): string => {
  const matches = content.match(/#[0-9A-Fa-f]{3,6}/g) || [];
  let updated = content;
  [...new Set(matches)].forEach((hex) => {
    const replacement = getThemeColor(hex);
    if (replacement !== hex) {
      updated = updated.replace(new RegExp(hex, 'g'), replacement);
    }
  });
  return updated;
};

export const getMigrationSuggestions = (
  filePath: string,
  content: string,
) => {
  const suggestions: Array<{ line: number; original: string; suggestion: string; reason: string }> = [];
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const matches = line.match(/#[0-9A-Fa-f]{3,6}/g) || [];
    matches.forEach((hex) => {
      const suggestion = getThemeColor(hex);
      if (suggestion !== hex) {
        suggestions.push({
          line: idx + 1,
          original: hex,
          suggestion,
          reason: 'Replace hardcoded color with theme token',
        });
      }
    });
  });
  return suggestions;
};

export const validateThemeUsage = (content: string) => {
  const violations: Array<{ line: number; color: string; suggestion: string }> = [];
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const matches = line.match(/#[0-9A-Fa-f]{3,6}/g) || [];
    matches.forEach((hex) => {
      const suggestion = getThemeColor(hex);
      if (suggestion !== hex) {
        violations.push({ line: idx + 1, color: hex, suggestion });
      }
    });
  });
  return { isValid: violations.length === 0, violations };
};

export const getColorStats = (content: string) => {
  const all = content.match(/#[0-9A-Fa-f]{3,6}/g) || [];
  const unique = [...new Set(all)];
  const unmapped = unique.filter((hex) => getThemeColor(hex) === hex);
  const mapped = unique.filter((hex) => getThemeColor(hex) !== hex);
  return {
    totalColors: all.length,
    hardcodedColors: unmapped.length,
    themeColors: mapped.length,
    unmappedColors: unmapped,
  };
};


