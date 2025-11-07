# 🧭 ELARO Navigation System - Documentation & Best Practices

## Overview

The ELARO navigation system is built with React Navigation v6 and follows a modular, type-safe architecture designed for performance, maintainability, and user experience.

## 🏗️ Architecture

### Navigator Structure

```
AppNavigator
├── AuthenticatedNavigator (for authenticated users)
│   ├── OnboardingNavigator (if onboarding not completed)
│   └── Main App Screens (if onboarding completed)
│       ├── MainTabNavigator (Home, Account)
│       ├── Main Screens (Courses, Calendar, Profile, Settings, etc.)
│       └── Modal Flows (Add Course, Add Lecture, Add Assignment, etc.)
└── GuestNavigator (for non-authenticated users)
    ├── LaunchScreen
    ├── GuestHomeScreen
    └── Auth Modal
```

### Key Components

- **AuthenticatedNavigator**: Main navigator for authenticated users (handles onboarding and main app screens)
- **AuthNavigator**: Dedicated auth flows (sign up, sign in, MFA)
- **OnboardingNavigator**: User onboarding flow
- **GuestNavigator**: Guest user experience

## 📱 Navigation Types

### RootStackParamList

All navigation routes are defined in `src/types/navigation.ts`:

```typescript
export type RootStackParamList = {
  Launch: undefined;
  Auth: {
    onClose?: () => void;
    onAuthSuccess?: () => void;
    mode?: 'signup' | 'signin';
  };
  Main: undefined;
  GuestHome: undefined;
  OnboardingFlow: undefined;
  Courses: undefined;
  Drafts: undefined;
  Templates: undefined;
  CourseDetail: { courseId: string };
  Calendar: undefined;
  RecycleBin: undefined;
  Profile: undefined;
  Settings: undefined;
  DeleteAccountScreen: undefined;
  DeviceManagement: undefined;
  LoginHistory: undefined;
  AddCourseFlow: { initialData?: FlowInitialData } | undefined;
  AddLectureFlow: { initialData?: FlowInitialData } | undefined;
  AddAssignmentFlow: { initialData?: FlowInitialData } | undefined;
  AddStudySessionFlow: { initialData?: FlowInitialData } | undefined;
  EditCourseModal: { courseId: string };
  MFAEnrollmentScreen: undefined;
  MFAVerificationScreen: { factorId: string };
  InAppBrowserScreen: { url: string; title?: string };
  AnalyticsAdmin: undefined;
  PaywallScreen: undefined;
  OddityWelcomeScreen: {
    variant:
      | 'trial-early'
      | 'trial-expired'
      | 'direct'
      | 'renewal'
      | 'restore'
      | 'promo'
      | 'granted'
      | 'plan-change';
  };
  StudyResult: { sessionId: string };
};
```

## 🛠️ Usage Patterns

### 1. Type-Safe Navigation

Use the `SafeNavigation` utility for type-safe navigation:

```typescript
import {
  useSafeNavigation,
  NavigationPatterns,
} from '@/navigation/utils/SafeNavigation';

const MyComponent = () => {
  const safeNav = useSafeNavigation();

  const handleNavigate = () => {
    // Type-safe navigation
    safeNav.navigate('Profile');

    // Or use predefined patterns
    NavigationPatterns.navigateToProfile(safeNav.navigation);
  };
};
```

### 2. Screen Configuration

Use navigation constants for consistent screen options:

```typescript
import {
  SCREEN_CONFIGS,
  SCREEN_OPTIONS,
} from '@/navigation/constants/NavigationConstants';

const screenConfig = {
  component: MyScreen,
  options: SCREEN_CONFIGS.Profile, // Pre-configured options
};

// Or customize
const customConfig = {
  component: MyScreen,
  options: {
    ...SCREEN_OPTIONS.standard,
    headerTitle: 'Custom Title',
  },
};
```

### 3. Performance Optimization

Use the performance hook for better navigation performance:

```typescript
import { useNavigationPerformance } from '@/navigation/hooks/useNavigationPerformance';

const MyScreen = () => {
  const { preloadScreen, batchNavigation } = useNavigationPerformance({
    preloadScreens: ['Profile', 'Settings'],
    enableMemoryOptimization: true,
    enableInteractionBatching: true,
  });

  // Preload screens
  useEffect(() => {
    preloadScreen('CourseDetail');
  }, [preloadScreen]);

  // Batch navigation actions
  const handleMultipleActions = () => {
    batchNavigation([
      () => navigation.navigate('Profile'),
      () => navigation.navigate('Settings'),
    ]);
  };
};
```

## 🎨 Transition Styles

### Available Transitions

- **slideFromRight**: Standard horizontal slide
- **modalSlideUp**: Vertical modal slide
- **fadeIn**: Fade transition
- **scaleIn**: Scale transition

### Gesture Options

- **horizontal**: Standard horizontal gestures
- **vertical**: Vertical gestures for modals
- **disabled**: No gestures
- **custom**: Custom gesture configuration

## 📋 Best Practices

### 1. Navigation Calls

✅ **Do:**

```typescript
// Use type-safe navigation
const safeNav = useSafeNavigation();
safeNav.navigate('Profile');

// Use predefined patterns
NavigationPatterns.navigateToProfile(navigation);

// Handle errors gracefully
try {
  navigation.navigate('Profile');
} catch (error) {
  console.error('Navigation failed:', error);
}
```

❌ **Don't:**

```typescript
// Avoid unsafe navigation
(navigation as any).navigate('NonExistentRoute');

// Avoid hardcoded route names
navigation.navigate('Profile' as any);
```

### 2. Screen Configuration

✅ **Do:**

```typescript
// Use constants for consistency
const config = {
  component: MyScreen,
  options: SCREEN_CONFIGS.Profile,
};

// Extend base options
const customConfig = {
  component: MyScreen,
  options: {
    ...SCREEN_OPTIONS.standard,
    headerTitle: 'Custom Title',
  },
};
```

❌ **Don't:**

```typescript
// Avoid inline configurations
const config = {
  component: MyScreen,
  options: {
    headerShown: true,
    headerTitle: 'Profile',
    headerStyle: { backgroundColor: 'white' },
    // ... many more inline options
  },
};
```

### 3. Performance

✅ **Do:**

```typescript
// Use lazy loading
const MyScreen = lazy(() => import('./MyScreen'));

// Use performance hooks
const { preloadScreen } = useNavigationPerformance({
  preloadScreens: ['Profile', 'Settings'],
});

// Batch navigation actions
batchNavigation([
  () => navigation.navigate('Profile'),
  () => navigation.navigate('Settings'),
]);
```

❌ **Don't:**

```typescript
// Avoid loading all screens immediately
import MyScreen from './MyScreen';

// Avoid multiple navigation calls in quick succession
navigation.navigate('Profile');
navigation.navigate('Settings');
navigation.navigate('Courses');
```

### 4. Error Handling

✅ **Do:**

```typescript
// Use SafeNavigation for error handling
const safeNav = useSafeNavigation();
safeNav.navigate('Profile'); // Built-in error handling

// Handle navigation errors
try {
  navigation.navigate('Profile');
} catch (error) {
  console.error('Navigation failed:', error);
  // Fallback navigation
  navigation.navigate('Main');
}
```

❌ **Don't:**

```typescript
// Avoid ignoring navigation errors
navigation.navigate('Profile'); // No error handling
```

## 🔧 Configuration

### Screen Options

```typescript
// Standard screen
SCREEN_OPTIONS.standard;

// Modal screen
SCREEN_OPTIONS.modal;

// Transparent modal
SCREEN_OPTIONS.transparentModal;

// Full screen
SCREEN_OPTIONS.fullScreen;

// Tab screen
SCREEN_OPTIONS.tab;

// Auth screen
SCREEN_OPTIONS.auth;
```

### Performance Options

```typescript
// Lazy loading
PERFORMANCE_OPTIONS.lazy;

// Memory optimization
PERFORMANCE_OPTIONS.memoryOptimized;

// High performance
PERFORMANCE_OPTIONS.highPerformance;
```

## 🐛 Debugging

### Navigation State

```typescript
import { useNavigation } from '@react-navigation/native';

const MyComponent = () => {
  const navigation = useNavigation();

  // Get current route
  const currentRoute =
    navigation.getState().routes[navigation.getState().index];
  console.log('Current route:', currentRoute?.name);

  // Check if can go back
  console.log('Can go back:', navigation.canGoBack());
};
```

### Performance Monitoring

```typescript
import { useNavigationPerformance } from '@/navigation/hooks/useNavigationPerformance';

const MyComponent = () => {
  const { logPerformanceMetrics } = useNavigationPerformance();

  // Log performance metrics
  logPerformanceMetrics();
};
```

## 📚 Common Patterns

### 1. Authentication Flow

```typescript
// Navigate to auth modal
NavigationPatterns.navigateToAuth(navigation, 'signup');

// Navigate to main app after auth
NavigationPatterns.navigateToMainApp(navigation); // Navigates to 'Main' (tab navigator)
```

### 2. Course Management

```typescript
// Navigate to course detail
NavigationPatterns.navigateToCourseDetail(navigation, courseId);

// Navigate to add course flow
NavigationPatterns.navigateToAddCourse(navigation);
```

### 3. Profile Management

```typescript
// Navigate to profile
NavigationPatterns.navigateToProfile(navigation);

// Navigate to settings
NavigationPatterns.navigateToSettings(navigation);
```

### 4. Modal Flows

```typescript
// Navigate to modal flows
NavigationPatterns.navigateToAddLecture(navigation);
NavigationPatterns.navigateToAddAssignment(navigation);
NavigationPatterns.navigateToAddStudySession(navigation);
```

## 🚀 Migration Guide

### From Old Navigation System

1. **Replace unsafe navigation calls:**

   ```typescript
   // Old
   (navigation as any).navigate('Profile');

   // New
   const safeNav = useSafeNavigation();
   safeNav.navigate('Profile');
   ```

2. **Use navigation constants:**

   ```typescript
   // Old
   options: { headerShown: true, headerTitle: 'Profile' }

   // New
   options: SCREEN_CONFIGS.Profile
   ```

3. **Add performance optimizations:**

   ```typescript
   // Old
   const MyScreen = () => {
     /* component */
   };

   // New
   const MyScreen = lazy(() => import('./MyScreen'));
   ```

## 📖 Additional Resources

- [React Navigation Documentation](https://reactnavigation.org/)
- [TypeScript Navigation Guide](https://reactnavigation.org/docs/typescript/)
- [Performance Optimization](https://reactnavigation.org/docs/performance/)
- [Deep Linking](https://reactnavigation.org/docs/deep-linking/)

---

## 🎯 Summary

The ELARO navigation system provides:

- ✅ **Type Safety**: All navigation calls are type-checked
- ✅ **Performance**: Optimized with lazy loading and preloading
- ✅ **Consistency**: Standardized transitions and gestures
- ✅ **Maintainability**: Modular architecture with clear separation
- ✅ **Error Handling**: Built-in error handling and fallbacks
- ✅ **Documentation**: Comprehensive guides and best practices

Follow these patterns and practices to ensure optimal navigation performance and maintainability in the ELARO app.
