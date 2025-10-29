// Icon System Constants
// Standardized icon sizes, colors, and usage patterns

import { Ionicons } from '@expo/vector-icons';

// Standard icon sizes
export const ICON_SIZES = {
  xs: 12,
  small: 16,
  medium: 20,
  large: 24,
  xlarge: 28,
  xxlarge: 32,
} as const;

// Standard icon color keys (to be used with theme)
export const ICON_COLORS = {
  primary: 'accent',
  secondary: 'textSecondary',
  success: 'success',
  warning: 'warning',
  error: 'error',
  white: 'white',
  black: 'black',
  text: 'text',
  textSecondary: 'textSecondary',
  background: 'background',
  surface: 'surface',
} as const;

// Common icon names used throughout the app
export const ICON_NAMES = {
  // Navigation
  home: 'home',
  homeOutline: 'home-outline',
  calendar: 'calendar',
  calendarOutline: 'calendar-outline',
  person: 'person',
  personOutline: 'person-outline',
  
  // Actions
  add: 'add',
  close: 'close',
  checkmark: 'checkmark',
  checkmarkCircle: 'checkmark-circle',
  trash: 'trash',
  trashOutline: 'trash-outline',
  edit: 'create',
  editOutline: 'create-outline',
  save: 'save',
  saveOutline: 'save-outline',
  
  // Navigation arrows
  chevronDown: 'chevron-down',
  chevronUp: 'chevron-up',
  chevronLeft: 'chevron-back',
  chevronRight: 'chevron-forward',
  arrowBack: 'arrow-back',
  arrowForward: 'arrow-forward',
  
  // Task types
  school: 'school',
  schoolOutline: 'school-outline',
  time: 'time',
  timeOutline: 'time-outline',
  play: 'play',
  playOutline: 'play-outline',
  book: 'book',
  bookOutline: 'book-outline',
  
  // UI elements
  search: 'search',
  filter: 'filter',
  settings: 'settings',
  settingsOutline: 'settings-outline',
  menu: 'menu',
  more: 'ellipsis-horizontal',
  moreVertical: 'ellipsis-vertical',
  
  // Status indicators
  warning: 'warning',
  warningOutline: 'warning-outline',
  information: 'information-circle',
  informationOutline: 'information-circle-outline',
  checkmarkCircleOutline: 'checkmark-circle-outline',
  
  // Media
  image: 'image',
  imageOutline: 'image-outline',
  document: 'document',
  documentOutline: 'document-outline',
  link: 'link',
  linkOutline: 'link-outline',
} as const;

// Icon size presets for common use cases
export const ICON_PRESETS = {
  // Tab bar icons
  tabBar: ICON_SIZES.large,
  
  // Button icons
  button: ICON_SIZES.medium,
  buttonSmall: ICON_SIZES.small,
  buttonLarge: ICON_SIZES.large,
  
  // List item icons
  listItem: ICON_SIZES.medium,
  listItemSmall: ICON_SIZES.small,
  
  // Input icons
  input: ICON_SIZES.medium,
  
  // Header icons
  header: ICON_SIZES.large,
  
  // Floating action button
  fab: ICON_SIZES.xlarge,
  
  // Status indicators
  status: ICON_SIZES.small,
  statusLarge: ICON_SIZES.medium,
} as const;

// Type definitions
export type IconSize = keyof typeof ICON_SIZES;
export type IconColor = keyof typeof ICON_COLORS;
export type IconName = keyof typeof Ionicons.glyphMap;
export type IconPreset = keyof typeof ICON_PRESETS;

// Helper functions
export const getIconSize = (size: IconSize | IconPreset): number => {
  if (size in ICON_SIZES) {
    return ICON_SIZES[size as IconSize];
  }
  if (size in ICON_PRESETS) {
    return ICON_PRESETS[size as IconPreset];
  }
  return ICON_SIZES.medium; // Default fallback
};

export const getIconColorKey = (color: IconColor): string => {
  return ICON_COLORS[color];
};

// Icon usage guidelines
export const ICON_GUIDELINES = {
  // Size guidelines
  sizes: {
    xs: 'Extra small - Status dots, badges',
    small: 'Small - List items, form labels',
    medium: 'Medium - Buttons, inputs (default)',
    large: 'Large - Headers, tab bars',
    xlarge: 'Extra large - FABs, prominent actions',
    xxlarge: 'XX large - Hero sections, splash screens',
  },
  
  // Color guidelines
  colors: {
    primary: 'Main brand color - Primary actions',
    secondary: 'Secondary text - Supporting elements',
    success: 'Success states - Confirmations',
    warning: 'Warning states - Cautions',
    error: 'Error states - Destructive actions',
    white: 'White backgrounds - Dark themes',
    black: 'Black backgrounds - Light themes',
    text: 'Primary text color',
    textSecondary: 'Secondary text color',
    background: 'Background color',
    surface: 'Surface color - Cards, modals',
  },
  
  // Usage patterns
  patterns: {
    navigation: 'Use outline variants for inactive states',
    actions: 'Use filled variants for active/selected states',
    status: 'Use appropriate semantic colors',
    consistency: 'Maintain consistent sizing within components',
  },
} as const;
