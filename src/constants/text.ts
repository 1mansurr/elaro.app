import { StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, FONT_FAMILIES } from './theme';

export const TEXT = StyleSheet.create({
  /* ---------------------------------- 🧠 HEADINGS ---------------------------------- */
  h1: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    lineHeight: FONT_SIZES.xxxl * 1.2,
  },
  h2: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    lineHeight: FONT_SIZES.xxl * 1.2,
  },
  h3: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    lineHeight: FONT_SIZES.xl * 1.25,
  },
  h4: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    lineHeight: FONT_SIZES.lg * 1.25,
  },

  /* ---------------------------------- 📄 BODY ---------------------------------- */
  body: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.normal,
    color: COLORS.textPrimary,
    lineHeight: FONT_SIZES.md * 1.5,
  },
  bodyLarge: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.normal,
    color: COLORS.textPrimary,
    lineHeight: FONT_SIZES.lg * 1.5,
  },
  bodySmall: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.normal,
    color: COLORS.textPrimary,
    lineHeight: FONT_SIZES.sm * 1.5,
  },

  /* ---------------------------------- 🏷️ LABELS / CAPTIONS ---------------------------------- */
  caption: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.normal,
    color: COLORS.textSecondary,
    lineHeight: FONT_SIZES.xs * 1.4,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textPrimary,
    lineHeight: FONT_SIZES.sm * 1.4,
  },

  /* ---------------------------------- 🔗 INTERACTIVE ---------------------------------- */
  link: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.primary,
    lineHeight: FONT_SIZES.md * 1.4,
  },
  button: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.white,
    lineHeight: FONT_SIZES.md * 1.2,
    textAlign: 'center',
  },

  /* ---------------------------------- 🚦 STATUS ---------------------------------- */
  success: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.success,
    lineHeight: FONT_SIZES.md * 1.4,
  },
  warning: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.warning,
    lineHeight: FONT_SIZES.md * 1.4,
  },
  error: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.error,
    lineHeight: FONT_SIZES.md * 1.4,
  },

  /* ---------------------------------- 😶 MUTED ---------------------------------- */
  muted: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.normal,
    color: COLORS.textSecondary,
    lineHeight: FONT_SIZES.md * 1.4,
  },
  mutedSmall: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.normal,
    color: COLORS.textSecondary,
    lineHeight: FONT_SIZES.sm * 1.4,
  },

  /* ---------------------------------- 👨‍💻 SPECIAL ---------------------------------- */
  code: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textPrimary,
    fontFamily: FONT_FAMILIES.monospace,
    lineHeight: FONT_SIZES.sm * 1.4,
  },
  quote: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.normal,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
    lineHeight: FONT_SIZES.md * 1.5,
  },

  /* ---------------------------------- 🔧 UTILITIES ---------------------------------- */
  centered: {
    textAlign: 'center',
  },
  rightAligned: {
    textAlign: 'right',
  },
  uppercase: {
    textTransform: 'uppercase',
  },
  underline: {
    textDecorationLine: 'underline',
  },
  highlight: {
    color: COLORS.accent,
    fontWeight: FONT_WEIGHTS.bold,
  },
  disabled: {
    color: COLORS.textLight,
  },
});
