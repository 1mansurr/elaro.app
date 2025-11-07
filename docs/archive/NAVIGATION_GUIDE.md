# Navigation Guide

## Overview

This guide documents the navigation architecture, state persistence, deep linking, route guards, and performance optimizations in the ELARO app.

---

## Navigation Architecture

### Navigation Structure

```
App.tsx
└── NavigationContainer
    └── AppNavigator (auth-aware routing)
        ├── AuthenticatedNavigator (logged-in users)
        │   ├── MainTabNavigator
        │   │   ├── Home (Dashboard)
        │   │   ├── Courses
        │   │   ├── Calendar
        │   │   └── Profile
        │   └── Modal Screens (TaskDetail, EditCourse, etc.)
        └── GuestNavigator (logged-out users)
            └── GuestHome
```

### Key Components

- **`AppNavigator`** - Top-level router (auth-aware)
- **`AuthenticatedNavigator`** - Main app navigation for logged-in users
- **`GuestNavigator`** - Navigation for guest users
- **`MainTabNavigator`** - Bottom tab navigation
- **`NavigationSyncService`** - State persistence service

---

## Navigation State Persistence

### How It Works

Navigation state is automatically persisted to AsyncStorage and restored on app restart. This provides a seamless user experience where users return to the same screen they were on.

**Service:** `src/services/navigationSync.ts`

### Features

1. **Automatic Persistence**
   - State saved on every navigation change
   - Persisted to AsyncStorage with versioning
   - User-specific state (cleared on user change)

2. **Auth-Aware Restoration**
   - Validates routes against auth state
   - Clears state if logged-out user tries to access authenticated routes
   - Clears state if logged-in user tries to access guest routes

3. **State Validation**
   - Validates route names against `RootStackParamList`
   - Checks for version compatibility
   - Handles corrupted state gracefully

4. **Age-Based Expiration**
   - State older than 7 days is automatically cleared
   - Prevents stale navigation state

### Configuration

```typescript
// Storage keys
const NAVIGATION_STATE_KEY = '@elaro_navigation_state_v1';
const NAVIGATION_VERSION_KEY = '@elaro_navigation_version';
const NAVIGATION_VERSION = 'v1'; // Increment on breaking changes
```

### Usage

State persistence is handled automatically in `App.tsx`:

```typescript
// State is loaded on app startup
const savedState = await navigationSyncService.loadState();

// State is saved on every navigation change
onStateChange={async (state) => {
  await navigationSyncService.saveState(state);
}}
```

### Manual Control

```typescript
import { navigationSyncService } from '@/services/navigationSync';

// Clear navigation state
await navigationSyncService.clearState();

// Get state stats (for debugging)
const stats = await navigationSyncService.getStats();
```

---

## Deep Linking

### URL Scheme

The app uses the `elaro://` URL scheme for deep linking.

**Examples:**

- `elaro://assignment/:id` - Open assignment detail
- `elaro://lecture/:id` - Open lecture detail
- `elaro://study-session/:id` - Open study session
- `elaro://home` - Navigate to home
- `elaro://courses` - Navigate to courses

### Deep Link Patterns

| Screen               | URL Pattern                 | Example                         |
| -------------------- | --------------------------- | ------------------------------- |
| Assignment Detail    | `elaro://assignment/:id`    | `elaro://assignment/abc-123`    |
| Lecture Detail       | `elaro://lecture/:id`       | `elaro://lecture/def-456`       |
| Study Session Detail | `elaro://study-session/:id` | `elaro://study-session/ghi-789` |
| Home                 | `elaro://home`              | `elaro://home`                  |
| Courses              | `elaro://courses`           | `elaro://courses`               |
| Calendar             | `elaro://calendar`          | `elaro://calendar`              |
| Profile              | `elaro://profile`           | `elaro://profile`               |

### Notification Deep Links

Push notifications include deep link URLs in their payload:

```typescript
{
  url: 'elaro://assignment/abc-123',
  itemId: 'abc-123',
  taskType: 'assignment'
}
```

When a notification is tapped, the app navigates using the deep link URL.

### Testing Deep Links

#### iOS Simulator

```bash
xcrun simctl openurl booted "elaro://assignment/test-id-123"
xcrun simctl openurl booted "elaro://home"
```

#### Android Emulator

```bash
adb shell am start -W -a android.intent.action.VIEW -d "elaro://assignment/test-id-123"
adb shell am start -W -a android.intent.action.VIEW -d "elaro://home"
```

### Configuration

Deep linking is configured in `app.config.js`:

```javascript
scheme: 'elaro',
ios: {
  bundleIdentifier: 'com.elaro.app',
},
android: {
  package: 'com.elaro.app',
  intentFilters: [
    {
      action: 'VIEW',
      data: [
        { scheme: 'elaro' }
      ],
    },
  ],
},
```

---

## Route Guards

### Authenticated Routes

Routes that require authentication:

```typescript
export const AUTHENTICATED_ROUTES = [
  'Main',
  'Courses',
  'Profile',
  'Settings',
  'Calendar',
] as const;
```

**Behavior:**

- If logged-out user tries to access → Redirected to `Auth` screen
- If state contains authenticated routes when logged out → State is cleared

### Guest Routes

Routes accessible only to non-authenticated users:

```typescript
export const GUEST_ROUTES = ['GuestHome'] as const;
```

**Behavior:**

- If logged-in user tries to access → Redirected to `Main` screen
- If state contains guest routes when logged in → State is cleared

### Implementation

Route guards are enforced in:

1. **`navigationSync.ts`** - Validates state on restoration
2. **`AppNavigator.tsx`** - Routes based on auth state
3. **`SafeNavigation.ts`** - Runtime route validation

---

## Type-Safe Navigation

### SafeNavigation Utility

Use `SafeNavigation` for type-safe navigation throughout the app:

```typescript
import { useSafeNavigation } from '@/navigation/utils/SafeNavigation';

const MyComponent = () => {
  const safeNav = useSafeNavigation();

  // Type-safe navigation
  safeNav.navigate('CourseDetail', { courseId: '123' });

  // Type-safe replace
  safeNav.replace('Main');

  // Type-safe push
  safeNav.push('Settings');

  // Safe go back
  safeNav.goBack();
};
```

### Navigation Patterns

Common navigation patterns are available:

```typescript
import { NavigationPatterns } from '@/navigation/utils/SafeNavigation';

NavigationPatterns.navigateToMainApp(navigation);
NavigationPatterns.navigateToGuestHome(navigation);
NavigationPatterns.navigateToCourseDetail(navigation, courseId);
NavigationPatterns.navigateToProfile(navigation);
```

---

## Performance Optimizations

### Lazy Loading

Screens are lazy-loaded using React's `lazy()` and `Suspense`:

```typescript
const CalendarScreen = lazy(
  () => import('@/navigation/bundles/CalendarBundle'),
);
```

**Benefits:**

- Faster initial load time
- Smaller bundle size
- Better code splitting

### Screen Preloading

Use `useNavigationPerformance` hook for screen preloading:

```typescript
import { useNavigationPerformance } from '@/navigation/hooks/useNavigationPerformance';

const MyScreen = () => {
  const { preloadScreen } = useNavigationPerformance({
    preloadScreens: ['CourseDetail', 'Settings'],
  });

  // Preload screens during idle time
};
```

### Memory Optimization

Navigation memory is optimized automatically:

- Screens unmount when not focused (if configured)
- Memory cleared when app goes to background
- Garbage collection triggered during idle time

### Transition Optimization

Use `useScreenTransitionOptimization` for transition monitoring:

```typescript
import { useScreenTransitionOptimization } from '@/navigation/hooks/useNavigationPerformance';

const MyScreen = () => {
  const { startTransition, endTransition } = useScreenTransitionOptimization();

  useEffect(() => {
    startTransition();
    // ... navigation logic
    endTransition('DestinationScreen');
  }, []);
};
```

---

## Navigation Constants

### Screen Configurations

Screen-specific configurations are defined in `NavigationConstants.ts`:

```typescript
export const SCREEN_CONFIGS = {
  Home: { ... },
  Courses: { ... },
  Calendar: { ... },
};
```

### Transitions

Transition presets available:

```typescript
TRANSITIONS.slideFromRight;
TRANSITIONS.fade;
TRANSITIONS.scale;
```

### Gestures

Gesture configurations:

```typescript
GESTURES.horizontal;
GESTURES.vertical;
GESTURES.disabled;
```

---

## Error Handling

### Navigation Errors

Navigation errors are handled gracefully:

1. **Invalid Routes** - Logged and prevented
2. **Navigation Failures** - Fallback to safe route
3. **State Corruption** - State is cleared automatically

### Error Recovery

```typescript
try {
  navigation.navigate('SomeScreen');
} catch (error) {
  // NavigationErrorHandler handles it automatically
  // Falls back to safe navigation
}
```

---

## Best Practices

### ✅ DO

- Use `SafeNavigation` for all navigation
- Use navigation patterns for common flows
- Lazy load screens when possible
- Handle navigation errors gracefully
- Use type-safe navigation (TypeScript)

### ❌ DON'T

- Navigate to invalid routes
- Create navigation objects inline
- Forget to handle navigation errors
- Use string literals instead of typed routes
- Skip route validation

---

## Troubleshooting

### Issue: Navigation state not persisting

**Solution:**

1. Check AsyncStorage permissions
2. Verify `navigationSyncService` is called
3. Check console for error messages
4. Verify state version compatibility

### Issue: Deep links not working

**Solution:**

1. Verify URL scheme in `app.config.js`
2. Check `linking` configuration
3. Test with `xcrun simctl` or `adb`
4. Check console logs for navigation errors

### Issue: Wrong screen after app restart

**Solution:**

1. Check auth state on startup
2. Verify route guards are working
3. Check state validation logs
4. Clear state manually if needed

---

## Migration Guide

### Adding a New Route

1. Add to `RootStackParamList`:

```typescript
export type RootStackParamList = {
  NewScreen: { param1: string };
  // ... other routes
};
```

2. Add to `VALID_ROUTES` in `navigationSync.ts`:

```typescript
const VALID_ROUTES: Set<keyof RootStackParamList> = new Set([
  // ... existing routes
  'NewScreen',
]);
```

3. Add screen to navigator:

```typescript
<Stack.Screen name="NewScreen" component={NewScreen} />
```

4. Add to `NavigationValidation.isValidRoute()` if using `SafeNavigation`

### Updating Navigation Version

If you make breaking changes to navigation structure:

1. Increment `NAVIGATION_VERSION` in `navigationSync.ts`
2. Old state will be automatically cleared
3. Users will start from default screen

---

## Related Documentation

- [React Navigation Docs](https://reactnavigation.org/)
- [Deep Linking Guide](./DEEP_LINKING_IMPLEMENTATION.md)
- [State Management Guide](./STATE_MANAGEMENT_GUIDELINES.md)

---

**Last Updated:** Phase 4 Implementation  
**Status:** Active Guide
