// NOTE: This app currently does not support dark mode. All colors are for light theme only.
// To add dark mode support, implement dynamic color selection using Appearance API or similar.
// theme.ts

import { Platform } from 'react-native';

/* ---------------------------------- 🎨 COLORS ---------------------------------- */

export const COLORS = {
  // 🌈 Brand
  primary: '#2C5EFF',
  primaryLight: '#5A7FFF',
  primaryDark: '#1E42CC',
  secondary: '#FF6B6B',
  accent: '#4ECDC4',

  // ⚪ Grayscale
  white: '#FFFFFF',
  black: '#000000',
  gray: '#F5F5F5',
  lightGray: '#E0E0E0',
  darkGray: '#666666',

  // ✅ Status
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  // 🔘 Text
  textPrimary: '#212121',
  textSecondary: '#757575',
  textLight: '#BDBDBD',
  text: '#212121',

  // 🔳 Background
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  surface: '#F8F9FA',
  card: '#FFFFFF',

  // ➖ Borders
  border: '#E0E0E0',
  divider: '#F0F0F0',

  // 🧊 Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  modalBackground: 'rgba(0, 0, 0, 0.3)',

  // 🗂️ Calendar & Session Tags
  green: '#8BC34A',
  blue: '#03A9F4',
  purple: '#9C27B0',
  orange: '#FF9800',
  yellow: '#FFEB3B',
  pink: '#E91E63',
  red: '#F44336',

  // 🌄 Gradients (raw)
  elaroGradientStart: '#667eea',
  elaroGradientEnd: '#764ba2',
  oddityGradientStart: '#f093fb',
  oddityGradientEnd: '#f5576c',
  oddityGold: '#FFD700',

  // 🔖 Design Tokens (Tailwind-style)
  ...{
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
  blue900: '#1e3a8a',
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
  },
};

/* ---------------------------------- 🔠 FONT ---------------------------------- */

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  title: 28,
  header: 24,
  body: 16,
  caption: 12,
};

export const FONT_WEIGHTS = {
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
};

export const FONT_FAMILIES = {
  monospace: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
};

/* ---------------------------------- 📏 SPACING ---------------------------------- */

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

/* ---------------------------------- 🟦 BORDER RADIUS ---------------------------------- */

export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 50,
  full: 9999,
};

/* ---------------------------------- 🖼️ SHADOWS ---------------------------------- */

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  // Legacy
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

/* ---------------------------------- 🎞️ ANIMATIONS ---------------------------------- */

export const ANIMATIONS = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
    verySlow: 800,
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },
  // React Native Animated easing functions
  animatedEasing: {
    ease: require('react-native').Easing.ease,
    easeIn: require('react-native').Easing.in(require('react-native').Easing.ease),
    easeOut: require('react-native').Easing.out(require('react-native').Easing.ease),
    easeInOut: require('react-native').Easing.inOut(require('react-native').Easing.ease),
    bounce: require('react-native').Easing.bounce,
    smooth: require('react-native').Easing.bezier(0.4, 0, 0.2, 1),
    sharp: require('react-native').Easing.bezier(0.4, 0, 0.6, 1),
  },
  spring: {
    tension: 100,
    friction: 8,
  },
  // Modal animation configurations
  modal: {
    sheet: {
      duration: 300,
      easing: require('react-native').Easing.out(require('react-native').Easing.ease),
    },
    dialog: {
      duration: 250,
      easing: require('react-native').Easing.out(require('react-native').Easing.ease),
    },
    simple: {
      duration: 200,
      easing: require('react-native').Easing.out(require('react-native').Easing.ease),
    },
    fullScreen: {
      duration: 350,
      easing: require('react-native').Easing.out(require('react-native').Easing.ease),
    },
  },
};

/* ---------------------------------- 🌅 GRADIENTS ---------------------------------- */

export const GRADIENTS = {
  elaro: {
    start: COLORS.elaroGradientStart,
    end: COLORS.elaroGradientEnd,
  },
  oddity: {
    start: COLORS.oddityGradientStart,
    end: COLORS.oddityGradientEnd,
  },
  yellow: {
    start: COLORS.yellow400,
    end: COLORS.orange400,
  },
  purple: {
    start: COLORS.purple400,
    end: COLORS.pink,
  },
  sunset: {
    start: '#ff6b6b',
    end: '#feca57',
  },
  ocean: {
    start: '#667eea',
    end: '#764ba2',
  },
  forest: {
    start: '#4facfe',
    end: '#00f2fe',
  },
  lavender: {
    start: '#a8edea',
    end: '#fed6e3',
  },
  fire: {
    start: '#ff9a9e',
    end: '#fecfef',
  },
  sky: {
    start: '#a8caba',
    end: '#5d4e75',
  },
};

/* ---------------------------------- 🧩 TOKENS: TYPE / PLAN / COMPONENTS ---------------------------------- */

export const TYPE_COLORS = {
  study_session: COLORS.blue,
  assignment: COLORS.green,
  exam: COLORS.red,
  lecture: COLORS.orange,
  program: COLORS.purple,
  lab: COLORS.orange,
  other: COLORS.gray,
};

export const PLAN_COLORS = {
  origin: {
    background: COLORS.gray100,
    border: COLORS.gray300,
    text: COLORS.gray700,
    accent: COLORS.blue500,
  },
  oddity: {
    background: GRADIENTS.oddity.start,
    border: GRADIENTS.oddity.end,
    text: COLORS.white,
    accent: COLORS.oddityGold,
  },
};

export const LAYOUT = {
  screenPadding: SPACING.lg,
  cardPadding: SPACING.md,
  sectionSpacing: SPACING.xl,
  itemSpacing: SPACING.sm,
  buttonHeight: 48,
  inputHeight: 44,
  iconSize: 24,
  avatarSize: 40,
  badgeSize: 20,
};

export const ACCESSIBILITY = {
  minTouchTarget: 44,
  contrastRatio: 4.5,
  focusRing: {
    color: COLORS.primary,
    width: 2,
  },
};

export const COMPONENTS = {
  card: {
    borderRadius: BORDER_RADIUS.lg,
    shadow: SHADOWS.md,
    padding: SPACING.md,
  },
  button: {
    borderRadius: BORDER_RADIUS.md,
    height: LAYOUT.buttonHeight,
    paddingHorizontal: SPACING.lg,
  },
  input: {
    borderRadius: BORDER_RADIUS.md,
    height: LAYOUT.inputHeight,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  modal: {
    borderRadius: BORDER_RADIUS.xl,
    shadow: SHADOWS.xl,
  },
};

// Component-specific design tokens
export const COMPONENT_TOKENS = {
  input: {
    height: 48,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    borderColor: COLORS.gray300,
    textColor: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  button: {
    height: 48,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    shadow: SHADOWS.sm,
  },
  courseSelector: {
    height: 48,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    borderColor: COLORS.gray300,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    textColor: COLORS.textPrimary,
    selectedTextColor: COLORS.primary,
  },
  dateTimePicker: {
    height: 48,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    borderColor: COLORS.gray300,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    textColor: COLORS.textPrimary,
  },
  templateSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    textColor: COLORS.textPrimary,
  },
  typeSelector: {
    padding: SPACING.sm,
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS.sm,
    activeBorderColor: COLORS.primary,
    activeBackgroundColor: COLORS.primaryLight,
    inactiveTextColor: COLORS.textSecondary,
    activeTextColor: COLORS.white,
  },
};

// Modal-specific design tokens
export const MODAL_TOKENS = {
  sheet: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
  },
  dialog: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    margin: SPACING.lg,
    padding: SPACING.lg,
  },
  simple: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    margin: SPACING.md,
    padding: SPACING.md,
  },
  fullScreen: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
  },
};
