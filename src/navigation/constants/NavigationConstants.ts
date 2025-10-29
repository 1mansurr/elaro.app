import { TransitionSpecs, CardStyleInterpolators } from '@react-navigation/stack';
import { COLORS } from '@/constants/theme';

/**
 * Navigation Constants for ELARO App
 * 
 * This module provides consistent navigation configurations including:
 * - Transition animations
 * - Gesture options
 * - Screen options
 * - Performance optimizations
 */

// Transition specifications
export const TRANSITIONS = {
  // Standard slide transition
  slideFromRight: {
    gestureDirection: 'horizontal' as const,
    transitionSpec: {
      open: {
        animation: 'timing' as const,
        config: {
          duration: 300,
          useNativeDriver: true,
        },
      },
      close: {
        animation: 'timing' as const,
        config: {
          duration: 250,
          useNativeDriver: true,
        },
      },
    },
    cardStyleInterpolator: ({ current, layouts }: any) => {
      return {
        cardStyle: {
          transform: [
            {
              translateX: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [layouts.screen.width, 0],
              }),
            },
          ],
        },
      };
    },
  },

  // Modal transition
  modalSlideUp: {
    gestureDirection: 'vertical' as const,
    transitionSpec: {
      open: {
        animation: 'timing' as const,
        config: {
          duration: 350,
          useNativeDriver: true,
        },
      },
      close: {
        animation: 'timing' as const,
        config: {
          duration: 300,
          useNativeDriver: true,
        },
      },
    },
    cardStyleInterpolator: ({ current, layouts }: any) => {
      return {
        cardStyle: {
          transform: [
            {
              translateY: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [layouts.screen.height, 0],
              }),
            },
          ],
        },
      };
    },
  },

  // Fade transition
  fadeIn: {
    gestureDirection: 'horizontal' as const,
    transitionSpec: {
      open: {
        animation: 'timing' as const,
        config: {
          duration: 300,
          useNativeDriver: true,
        },
      },
      close: {
        animation: 'timing' as const,
        config: {
          duration: 250,
          useNativeDriver: true,
        },
      },
    },
    cardStyleInterpolator: ({ current }: any) => {
      return {
        cardStyle: {
          opacity: current.progress,
        },
      };
    },
  },

  // Scale transition
  scaleIn: {
    gestureDirection: 'horizontal' as const,
    transitionSpec: {
      open: {
        animation: 'timing' as const,
        config: {
          duration: 300,
          useNativeDriver: true,
        },
      },
      close: {
        animation: 'timing' as const,
        config: {
          duration: 250,
          useNativeDriver: true,
        },
      },
    },
    cardStyleInterpolator: ({ current }: any) => {
      return {
        cardStyle: {
          transform: [
            {
              scale: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            },
          ],
          opacity: current.progress,
        },
      };
    },
  },
};

// Gesture configurations
export const GESTURES = {
  // Standard horizontal gesture
  horizontal: {
    gestureEnabled: true,
    gestureDirection: 'horizontal' as const,
    gestureResponseDistance: 50,
    gestureVelocityImpact: 0.3,
  },

  // Vertical gesture for modals
  vertical: {
    gestureEnabled: true,
    gestureDirection: 'vertical' as const,
    gestureResponseDistance: 100,
    gestureVelocityImpact: 0.3,
  },

  // Disabled gestures
  disabled: {
    gestureEnabled: false,
  },

  // Custom gesture for specific screens
  custom: {
    gestureEnabled: true,
    gestureDirection: 'horizontal' as const,
    gestureResponseDistance: 75,
    gestureVelocityImpact: 0.4,
  },
};

// Screen options templates
export const SCREEN_OPTIONS = {
  // Standard screen options
  standard: {
    headerShown: true,
    headerShadowVisible: false,
    headerBackTitleVisible: false,
    headerTitleAlign: 'center' as const,
    headerTintColor: 'COLORS.textPrimary',
    headerStyle: {
      backgroundColor: COLORS.white,
    },
    headerTitleStyle: {
      fontWeight: '600' as const,
      fontSize: 18,
    },
  },

  // Modal screen options
  modal: {
    presentation: 'modal' as const,
    headerShown: false,
    gestureEnabled: true,
    gestureDirection: 'vertical' as const,
  },

  // Transparent modal options
  transparentModal: {
    presentation: 'transparentModal' as const,
    headerShown: false,
    cardStyle: {
      backgroundColor: 'transparent',
    },
  },

  // Full screen options
  fullScreen: {
    headerShown: false,
    gestureEnabled: false,
  },

  // Tab screen options
  tab: {
    headerShown: false,
    gestureEnabled: false,
  },

  // Auth screen options
  auth: {
    presentation: 'modal' as const,
    headerShown: false,
    gestureEnabled: false,
  },
};

// Performance optimizations
export const PERFORMANCE_OPTIONS = {
  // Lazy loading options
  lazy: {
    lazy: true,
    unmountOnBlur: false,
  },

  // Memory optimization
  memoryOptimized: {
    lazy: true,
    unmountOnBlur: true,
  },

  // High performance screens
  highPerformance: {
    lazy: false,
    unmountOnBlur: false,
  },
};

// Navigation themes
export const NAVIGATION_THEMES = {
  light: {
    dark: false,
    colors: {
      primary: 'COLORS.primary',
      background: 'COLORS.white',
      card: 'COLORS.white',
      text: 'COLORS.textPrimary',
      border: 'COLORS.border',
      notification: 'COLORS.accent',
    },
  },
};

// Screen-specific configurations
export const SCREEN_CONFIGS = {
  // Main app screens
  Main: {
    ...SCREEN_OPTIONS.tab,
    ...PERFORMANCE_OPTIONS.highPerformance,
  },

  // Course-related screens
  Courses: {
    ...SCREEN_OPTIONS.standard,
    ...TRANSITIONS.slideFromRight,
    ...GESTURES.horizontal,
  },

  CourseDetail: {
    ...SCREEN_OPTIONS.standard,
    ...TRANSITIONS.slideFromRight,
    ...GESTURES.horizontal,
  },

  // Profile screens
  Profile: {
    ...SCREEN_OPTIONS.standard,
    ...TRANSITIONS.slideFromRight,
    ...GESTURES.horizontal,
  },

  Settings: {
    ...SCREEN_OPTIONS.standard,
    ...TRANSITIONS.slideFromRight,
    ...GESTURES.horizontal,
  },

  // Modal flows
  AddCourseFlow: {
    ...SCREEN_OPTIONS.modal,
    ...TRANSITIONS.modalSlideUp,
    ...GESTURES.vertical,
  },

  AddLectureFlow: {
    ...SCREEN_OPTIONS.modal,
    ...TRANSITIONS.modalSlideUp,
    ...GESTURES.vertical,
  },

  AddAssignmentFlow: {
    ...SCREEN_OPTIONS.modal,
    ...TRANSITIONS.modalSlideUp,
    ...GESTURES.vertical,
  },

  AddStudySessionFlow: {
    ...SCREEN_OPTIONS.modal,
    ...TRANSITIONS.modalSlideUp,
    ...GESTURES.vertical,
  },

  // Auth screens
  Auth: {
    ...SCREEN_OPTIONS.auth,
    ...TRANSITIONS.scaleIn,
    ...GESTURES.disabled,
  },

  MFAEnrollmentScreen: {
    ...SCREEN_OPTIONS.standard,
    ...TRANSITIONS.slideFromRight,
    ...GESTURES.horizontal,
  },

  MFAVerificationScreen: {
    ...SCREEN_OPTIONS.standard,
    ...TRANSITIONS.slideFromRight,
    ...GESTURES.horizontal,
  },

  // Special screens
  PaywallScreen: {
    ...SCREEN_OPTIONS.modal,
    ...TRANSITIONS.modalSlideUp,
    ...GESTURES.vertical,
  },

  OddityWelcomeScreen: {
    ...SCREEN_OPTIONS.transparentModal,
    ...TRANSITIONS.fadeIn,
    ...GESTURES.disabled,
  },

  InAppBrowserScreen: {
    ...SCREEN_OPTIONS.modal,
    ...TRANSITIONS.slideFromRight,
    ...GESTURES.horizontal,
  },

  // Dashboard and data management screens
  Drafts: {
    ...SCREEN_OPTIONS.standard,
    ...TRANSITIONS.slideFromRight,
    ...GESTURES.horizontal,
  },

  Templates: {
    ...SCREEN_OPTIONS.standard,
    ...TRANSITIONS.slideFromRight,
    ...GESTURES.horizontal,
  },

  Calendar: {
    ...SCREEN_OPTIONS.standard,
    ...TRANSITIONS.slideFromRight,
    ...GESTURES.horizontal,
  },

  RecycleBin: {
    ...SCREEN_OPTIONS.standard,
    ...TRANSITIONS.slideFromRight,
    ...GESTURES.horizontal,
  },

  // Account management screens
  DeleteAccountScreen: {
    ...SCREEN_OPTIONS.standard,
    ...TRANSITIONS.slideFromRight,
    ...GESTURES.horizontal,
  },

  DeviceManagement: {
    ...SCREEN_OPTIONS.standard,
    ...TRANSITIONS.slideFromRight,
    ...GESTURES.horizontal,
  },

  LoginHistory: {
    ...SCREEN_OPTIONS.standard,
    ...TRANSITIONS.slideFromRight,
    ...GESTURES.horizontal,
  },

  // Study and analytics screens
  StudyResult: {
    ...SCREEN_OPTIONS.standard,
    ...TRANSITIONS.slideFromRight,
    ...GESTURES.horizontal,
  },

  StudySessionReview: {
    ...SCREEN_OPTIONS.standard,
    ...TRANSITIONS.slideFromRight,
    ...GESTURES.horizontal,
  },

  AnalyticsAdmin: {
    ...SCREEN_OPTIONS.standard,
    ...TRANSITIONS.slideFromRight,
    ...GESTURES.horizontal,
  },

  // Modal screens
  TaskDetailModal: {
    ...SCREEN_OPTIONS.modal,
    ...TRANSITIONS.modalSlideUp,
    ...GESTURES.vertical,
  },

  EditCourseModal: {
    ...SCREEN_OPTIONS.modal,
    ...TRANSITIONS.modalSlideUp,
    ...GESTURES.vertical,
  },

  // Launch screen
  Launch: {
    ...SCREEN_OPTIONS.fullScreen,
    ...GESTURES.disabled,
  },
};

// Navigation constants
export const NAVIGATION_CONSTANTS = {
  // Animation durations
  ANIMATION_DURATION: {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500,
  },

  // Gesture distances
  GESTURE_DISTANCE: {
    SMALL: 50,
    MEDIUM: 100,
    LARGE: 150,
  },

  // Header heights
  HEADER_HEIGHT: {
    STANDARD: 56,
    LARGE: 80,
  },

  // Tab bar height
  TAB_BAR_HEIGHT: 60,

  // Safe area insets
  SAFE_AREA: {
    TOP: 44,
    BOTTOM: 34,
  },
};

export default {
  TRANSITIONS,
  GESTURES,
  SCREEN_OPTIONS,
  PERFORMANCE_OPTIONS,
  NAVIGATION_THEMES,
  SCREEN_CONFIGS,
  NAVIGATION_CONSTANTS,
};
