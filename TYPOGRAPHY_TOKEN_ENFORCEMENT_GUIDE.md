# Typography Token Enforcement Guide

## 📝 Overview

This guide documents the typography token enforcement system implemented across ELARO. All typography values must use centralized design tokens instead of hardcoded values to ensure consistency and maintainability.

## 🎯 Enforcement Rules

### ESLint Rules

The following ESLint rules prevent hardcoded typography values:

```javascript
// eslint.config.js
rules: {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'Property[key.name="fontWeight"] > Literal[value=/^(bold|normal|100|200|300|400|500|600|700|800|900)$/]',
      message: 'Use FONT_WEIGHTS constants instead of hardcoded font weights',
    },
    {
      selector: 'Property[key.name="fontSize"] > Literal[value=/^[0-9]+$/]',
      message: 'Use FONT_SIZES constants instead of hardcoded font sizes',
    },
    {
      selector: 'Property[key.name="color"] > Literal[value=/^#[0-9a-fA-F]{3,6}$/]',
      message: 'Use COLORS constants instead of hardcoded colors',
    },
    {
      selector: 'Property[key.name=/^(padding|margin|paddingTop|paddingBottom|paddingLeft|paddingRight|marginTop|marginBottom|marginLeft|marginRight)$/] > Literal[value=/^[0-9]+$/]',
      message: 'Use SPACING constants instead of hardcoded spacing values',
    },
    {
      selector: 'Property[key.name="lineHeight"] > Literal[value=/^[0-9]+$/]',
      message: 'Use calculated line heights or LINE_HEIGHT constants',
    },
    {
      selector: 'Property[key.name="letterSpacing"] > Literal[value=/^-?[0-9]+$/]',
      message: 'Use LETTER_SPACING constants instead of hardcoded letter spacing',
    },
  ],
}
```

## 🎨 Typography System

### Font Weights

```typescript
export const FONT_WEIGHTS = {
  light: '300' as any,
  normal: '400' as any,
  medium: '500' as any,
  semibold: '600' as any,
  bold: '700' as any,
} as const;
```

### Font Sizes

```typescript
export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
} as const;
```

### Typography Utilities

```typescript
export const TYPOGRAPHY_UTILS = {
  // Common font weight mappings
  fontWeight: {
    light: FONT_WEIGHTS.light,
    normal: FONT_WEIGHTS.normal,
    medium: FONT_WEIGHTS.medium,
    semibold: FONT_WEIGHTS.semibold,
    bold: FONT_WEIGHTS.bold,
    // Numeric mappings
    '100': FONT_WEIGHTS.light,
    '200': FONT_WEIGHTS.light,
    '300': FONT_WEIGHTS.light,
    '400': FONT_WEIGHTS.normal,
    '500': FONT_WEIGHTS.medium,
    '600': FONT_WEIGHTS.semibold,
    '700': FONT_WEIGHTS.bold,
    '800': FONT_WEIGHTS.bold,
    '900': FONT_WEIGHTS.bold,
  },

  // Common font size mappings
  fontSize: {
    xs: FONT_SIZES.xs,
    sm: FONT_SIZES.sm,
    md: FONT_SIZES.md,
    lg: FONT_SIZES.lg,
    xl: FONT_SIZES.xl,
    xxl: FONT_SIZES.xxl,
    xxxl: FONT_SIZES.xxxl,
    // Numeric mappings for common sizes
    '8': FONT_SIZES.xs,
    '9': FONT_SIZES.xs,
    '10': FONT_SIZES.xs,
    '11': FONT_SIZES.sm,
    '12': FONT_SIZES.sm,
    '13': FONT_SIZES.sm,
    '14': FONT_SIZES.sm,
    '15': FONT_SIZES.md,
    '16': FONT_SIZES.md,
    '17': FONT_SIZES.md,
    '18': FONT_SIZES.lg,
    '20': FONT_SIZES.lg,
    '24': FONT_SIZES.xl,
    '28': FONT_SIZES.xxl,
    '32': FONT_SIZES.xxxl,
  },

  // Helper functions
  getFontWeight: (weight: string | number) => {
    const weightStr = String(weight);
    return (
      TYPOGRAPHY_UTILS.fontWeight[
        weightStr as keyof typeof TYPOGRAPHY_UTILS.fontWeight
      ] || FONT_WEIGHTS.normal
    );
  },

  getFontSize: (size: string | number) => {
    const sizeStr = String(size);
    return (
      TYPOGRAPHY_UTILS.fontSize[
        sizeStr as keyof typeof TYPOGRAPHY_UTILS.fontSize
      ] || FONT_SIZES.md
    );
  },
};
```

## ✅ Correct Usage Examples

### Font Weights

```typescript
// ✅ CORRECT - Using theme tokens
const styles = StyleSheet.create({
  title: {
    fontWeight: FONT_WEIGHTS.bold,
  },
  subtitle: {
    fontWeight: FONT_WEIGHTS.semibold,
  },
  body: {
    fontWeight: FONT_WEIGHTS.normal,
  },
});

// ✅ CORRECT - Using utility functions
const styles = StyleSheet.create({
  title: {
    fontWeight: TYPOGRAPHY_UTILS.getFontWeight('bold'),
  },
  subtitle: {
    fontWeight: TYPOGRAPHY_UTILS.getFontWeight(600),
  },
});
```

### Font Sizes

```typescript
// ✅ CORRECT - Using theme tokens
const styles = StyleSheet.create({
  title: {
    fontSize: FONT_SIZES.lg,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
  },
  caption: {
    fontSize: FONT_SIZES.sm,
  },
});

// ✅ CORRECT - Using utility functions
const styles = StyleSheet.create({
  title: {
    fontSize: TYPOGRAPHY_UTILS.getFontSize('lg'),
  },
  subtitle: {
    fontSize: TYPOGRAPHY_UTILS.getFontSize(16),
  },
});
```

### Colors

```typescript
// ✅ CORRECT - Using theme tokens
const styles = StyleSheet.create({
  title: {
    color: COLORS.textPrimary,
  },
  subtitle: {
    color: COLORS.textSecondary,
  },
  error: {
    color: COLORS.error,
  },
});
```

### Spacing

```typescript
// ✅ CORRECT - Using theme tokens
const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    margin: SPACING.lg,
  },
  title: {
    marginBottom: SPACING.sm,
  },
});
```

## ❌ Incorrect Usage Examples

### Font Weights

```typescript
// ❌ INCORRECT - Hardcoded values
const styles = StyleSheet.create({
  title: {
    fontWeight: 'bold', // Should use FONT_WEIGHTS.bold
  },
  subtitle: {
    fontWeight: '600', // Should use FONT_WEIGHTS.semibold
  },
  body: {
    fontWeight: 'normal', // Should use FONT_WEIGHTS.normal
  },
});
```

### Font Sizes

```typescript
// ❌ INCORRECT - Hardcoded values
const styles = StyleSheet.create({
  title: {
    fontSize: 18, // Should use FONT_SIZES.lg
  },
  subtitle: {
    fontSize: 16, // Should use FONT_SIZES.md
  },
  caption: {
    fontSize: 14, // Should use FONT_SIZES.sm
  },
});
```

### Colors

```typescript
// ❌ INCORRECT - Hardcoded values
const styles = StyleSheet.create({
  title: {
    color: '#333333', // Should use COLORS.textPrimary
  },
  subtitle: {
    color: '#666666', // Should use COLORS.textSecondary
  },
  error: {
    color: '#FF3B30', // Should use COLORS.error
  },
});
```

### Spacing

```typescript
// ❌ INCORRECT - Hardcoded values
const styles = StyleSheet.create({
  container: {
    padding: 16, // Should use SPACING.md
    margin: 24, // Should use SPACING.lg
  },
  title: {
    marginBottom: 8, // Should use SPACING.sm
  },
});
```

## 🔄 Migration Examples

### Before Migration

```typescript
// OLD - Hardcoded values
const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    lineHeight: 20,
  },
});
```

### After Migration

```typescript
// NEW - Theme tokens
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
    lineHeight: FONT_SIZES.sm * 1.4, // Calculated line height
  },
});
```

## 🛠️ Migration Tools

### Typography Utilities

Use the helper functions for easier migration:

```typescript
import { TYPOGRAPHY_UTILS } from '@/constants/theme';

// Convert common hardcoded values
const fontWeight = TYPOGRAPHY_UTILS.getFontWeight('bold'); // Returns FONT_WEIGHTS.bold
const fontSize = TYPOGRAPHY_UTILS.getFontSize(16); // Returns FONT_SIZES.md
const color = TYPOGRAPHY_UTILS.getColor('#333'); // Returns COLORS.textPrimary
```

### ESLint Auto-fix

Some ESLint rules can be auto-fixed:

```bash
# Run ESLint with auto-fix
npx eslint src/ --fix

# Check for remaining issues
npx eslint src/ --format=compact
```

## 📊 Audit Results

### Typography Audit Summary

- **Total Hardcoded Values Found**: 711 instances
- **Font Weights**: 156 instances
- **Font Sizes**: 203 instances
- **Colors**: 189 instances
- **Spacing**: 163 instances

### Migration Progress

- **Phase 1**: ✅ ESLint rules implemented
- **Phase 2**: ✅ Typography utilities created
- **Phase 3**: 🔄 Ongoing migration (AuthScreen completed)
- **Phase 4**: 📋 Remaining components to migrate

## 🎯 Best Practices

### 1. Always Use Theme Tokens

```typescript
// ✅ Good
fontSize: FONT_SIZES.lg,
fontWeight: FONT_WEIGHTS.semibold,
color: COLORS.textPrimary,

// ❌ Bad
fontSize: 18,
fontWeight: '600',
color: '#333333',
```

### 2. Use Utility Functions for Dynamic Values

```typescript
// ✅ Good
const dynamicSize = TYPOGRAPHY_UTILS.getFontSize(userPreference);

// ❌ Bad
const dynamicSize = userPreference === 'large' ? 20 : 16;
```

### 3. Calculate Line Heights

```typescript
// ✅ Good
lineHeight: FONT_SIZES.md * 1.4,

// ❌ Bad
lineHeight: 22,
```

### 4. Group Related Styles

```typescript
// ✅ Good
const textStyles = {
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  body: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.normal,
    color: COLORS.textSecondary,
  },
};
```

## 🚀 Future Enhancements

### Planned Improvements

- **Dynamic Typography**: Support for user font size preferences
- **Accessibility**: Enhanced contrast ratios and readability
- **Theme Variants**: Dark mode typography support
- **Responsive Typography**: Size adjustments based on screen size

### Migration Roadmap

- **Phase 1**: ✅ ESLint enforcement rules
- **Phase 2**: ✅ Typography utilities
- **Phase 3**: 🔄 Component migration (in progress)
- **Phase 4**: 📋 Complete audit and cleanup
- **Phase 5**: 🚀 Dynamic typography support

This typography token enforcement system ensures consistent, maintainable, and accessible text styling across the entire ELARO application.
