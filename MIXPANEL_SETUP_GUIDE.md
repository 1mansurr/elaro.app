# Mixpanel Setup Guide

## Overview

Mixpanel has been successfully integrated into your ELARO React Native app. This guide explains how to use the tracking system throughout your application.

## What's Been Set Up

### 1. Package Installation
- ✅ Installed `react-native-mixpanel` package
- ✅ Installed iOS pods for Mixpanel integration

### 2. Core Service
- ✅ Created `src/services/mixpanel.ts` with comprehensive tracking methods
- ✅ Configured with your project token via `EXPO_PUBLIC_MIXPANEL_TOKEN` environment variable
- ✅ Set to use EU API host: `https://api-eu.mixpanel.com`

### 3. App Integration
- ✅ Initialized Mixpanel in `App.tsx` during app startup
- ✅ Added automatic screen tracking via `useScreenTracking` hook
- ✅ Integrated user authentication tracking in `AuthContext`

### 4. Example Tracking
- ✅ Added tracking examples to `HomeScreen.tsx` for common user actions

### 5. Centralized Event System
- ✅ Created `/src/utils/analyticsEvents.ts` with all event definitions
- ✅ Updated all tracking calls to use centralized event constants
- ✅ Added TypeScript support for event names and properties

## How to Use Mixpanel in Your App

### Using Centralized Event Definitions

**IMPORTANT**: Always use the centralized event definitions from `/src/utils/analyticsEvents.ts` instead of hardcoded strings. This ensures consistency and prevents typos.

```typescript
import { mixpanelService } from '@/services/mixpanel';
import { TASK_EVENTS, AUTH_EVENTS, FEATURE_EVENTS } from '@/utils/analyticsEvents';

// ✅ CORRECT: Using centralized event definitions
mixpanelService.trackEvent(TASK_EVENTS.TASK_CREATED, {
  task_id: '123',
  task_type: 'assignment',
  task_title: 'Math Homework',
  creation_method: 'manual',
  source: 'home_screen_fab',
});

// ❌ WRONG: Using hardcoded strings
mixpanelService.track('Task Created', { ... });
```

### Basic Event Tracking

```typescript
import { mixpanelService } from '@/services/mixpanel';
import { AUTH_EVENTS, FEATURE_EVENTS, ENGAGEMENT_EVENTS } from '@/utils/analyticsEvents';

// Track authentication events
mixpanelService.trackEvent(AUTH_EVENTS.USER_LOGGED_IN, {
  user_id: 'user123',
  email: 'user@example.com',
  subscription_tier: 'premium',
  login_method: 'email',
});

// Track feature usage
mixpanelService.trackEvent(FEATURE_EVENTS.FEATURE_USED, {
  feature_name: 'dark_mode_toggle',
  screen: 'settings',
  user_type: 'premium',
});

// Track engagement
mixpanelService.trackEvent(ENGAGEMENT_EVENTS.SIGN_UP_PROMPTED, {
  source: 'home_screen',
  user_type: 'guest',
  prompt_context: 'feature_gate',
});
```

### Task-Related Tracking

```typescript
import { TASK_EVENTS } from '@/utils/analyticsEvents';

// Track task creation
mixpanelService.trackEvent(TASK_EVENTS.TASK_CREATED, {
  task_id: task.id,
  task_type: task.type,
  task_title: task.title,
  creation_method: 'quick_add',
  estimated_duration: 30, // in minutes
  source: 'home_screen_fab',
});

// Track task completion
mixpanelService.trackEvent(TASK_EVENTS.TASK_COMPLETED, {
  task_id: task.id,
  task_type: task.type,
  task_title: task.title,
  completion_time: new Date().toISOString(),
  was_early: true,
  source: 'task_detail_sheet',
});

// Track task editing
mixpanelService.trackEvent(TASK_EVENTS.TASK_EDITED, {
  task_id: task.id,
  task_type: task.type,
  fields_changed: ['title', 'due_date'],
  source: 'task_detail_sheet',
});
```

### Subscription/Payment Tracking

```typescript
import { SUBSCRIPTION_EVENTS } from '@/utils/analyticsEvents';

// Track subscription events
mixpanelService.trackEvent(SUBSCRIPTION_EVENTS.SUBSCRIPTION_UPGRADED, {
  from_tier: 'free',
  to_tier: 'premium',
  price: 9.99,
  currency: 'USD',
  payment_method: 'apple_pay',
  billing_period: 'monthly',
});

// Track payment events
mixpanelService.trackEvent(SUBSCRIPTION_EVENTS.PAYMENT_COMPLETED, {
  amount: 9.99,
  currency: 'USD',
  payment_method: 'apple_pay',
  subscription_tier: 'premium',
  transaction_id: 'txn_123',
  platform: 'ios',
});
```

### Screen View Tracking

Screen views are automatically tracked when you use the `useScreenTracking` hook in your navigator. The hook is already integrated in `AppNavigator.tsx`.

For manual screen tracking:

```typescript
import { SCREEN_EVENTS } from '@/utils/analyticsEvents';

mixpanelService.trackEvent(SCREEN_EVENTS.SCREEN_VIEWED, {
  screen_name: 'Profile Settings',
  route_name: 'Profile',
  user_type: 'premium',
  onboarding_completed: true,
});
```

## Centralized Event System

### Event Categories

All events are organized into logical categories in `/src/utils/analyticsEvents.ts`:

- **`AUTH_EVENTS`** - Authentication (login, signup, logout, MFA)
- **`APP_EVENTS`** - App lifecycle (launch, background, foreground)
- **`SCREEN_EVENTS`** - Screen navigation and views
- **`TASK_EVENTS`** - Task management (create, complete, edit, delete)
- **`SUBSCRIPTION_EVENTS`** - Subscription and payment events
- **`ONBOARDING_EVENTS`** - User onboarding flow
- **`FEATURE_EVENTS`** - Feature usage and interactions
- **`ERROR_EVENTS`** - Error tracking and debugging
- **`PERFORMANCE_EVENTS`** - Performance metrics
- **`ENGAGEMENT_EVENTS`** - User engagement and conversion

### Adding New Events

1. **Add to the appropriate category** in `analyticsEvents.ts`:
```typescript
export const NEW_EVENTS = {
  NEW_EVENT_NAME: {
    name: 'New Event Name',
    properties: {
      property1: 'string',
      property2: 'number',
      property3: 'boolean',
    },
  },
} as const;
```

2. **Update the TypeScript union type**:
```typescript
export type AnalyticsEventName = 
  | typeof AUTH_EVENTS[keyof typeof AUTH_EVENTS]['name']
  | typeof NEW_EVENTS[keyof typeof NEW_EVENTS]['name'] // Add this line
  // ... other categories
```

3. **Use the event** in your code:
```typescript
import { NEW_EVENTS } from '@/utils/analyticsEvents';

mixpanelService.trackEvent(NEW_EVENTS.NEW_EVENT_NAME, {
  property1: 'value',
  property2: 123,
  property3: true,
});
```

### Event Property Validation

In development mode, event properties are validated against the schema defined in `analyticsEvents.ts`. This helps catch property mismatches early.

## Available Tracking Methods

### Core Methods
- `track(eventName, properties)` - Track any custom event (use sparingly)
- `trackEvent(eventConfig, properties)` - **PREFERRED**: Track using centralized definitions
- `identify(userId)` - Identify a user (automatically called on login)
- `setUserProperties(properties)` - Set user properties (automatically called on login)
- `reset()` - Clear user data (automatically called on logout)

### Specialized Methods (Legacy - Use trackEvent instead)
- `trackScreenView(screenName, properties)` - Track screen views
- `trackUserAction(action, properties)` - Track user actions
- `trackAppEvent(event, properties)` - Track app-level events
- `trackTaskEvent(eventConfig, task, additionalProperties)` - Track task-related events
- `trackSubscriptionEvent(eventConfig, properties)` - Track subscription events
- `trackPaymentEvent(action, properties)` - Track payment events

### Utility Methods
- `flush()` - Force send pending events to Mixpanel
- `isReady()` - Check if Mixpanel is initialized

## Automatic Tracking

The following events are automatically tracked:

### Authentication
- ✅ `User Signed Up` - When a user creates an account
- ✅ `User Sign Up Failed` - When sign up fails
- ✅ `User Logged In` - When a user logs in
- ✅ `User Logged Out` - When a user logs out
- ✅ User identification and properties are set on login

### App Lifecycle
- ✅ `App Launched` - When the app starts
- ✅ Screen views for all screens (automatic)

### Trial Management
- ✅ `Subscription Trial Started` - When a free trial begins

## Environment Configuration

Mixpanel is configured differently for development vs production:

- **Development**: Autocapture disabled, 10% session recording
- **Production**: Autocapture enabled, 100% session recording

## Best Practices

### 1. Consistent Event Naming
Use clear, consistent event names:
- ✅ `Task Completed`
- ✅ `Subscription Upgraded`
- ❌ `task_completed` (use title case)
- ❌ `userDidThing` (use descriptive names)

### 2. Meaningful Properties
Always include relevant context:
```typescript
mixpanelService.track('Course Created', {
  course_title: course.title,
  course_type: course.type,
  estimated_duration: course.duration,
  creation_method: 'manual', // vs 'import'
});
```

### 3. Error Tracking
Track both successes and failures:
```typescript
try {
  await createTask(task);
  mixpanelService.track('Task Created Successfully', taskData);
} catch (error) {
  mixpanelService.track('Task Creation Failed', {
    error: error.message,
    task_type: task.type,
  });
}
```

### 4. User Segmentation
Use user properties for segmentation:
```typescript
mixpanelService.setUserProperties({
  subscription_tier: 'premium',
  onboarding_completed: true,
  feature_flags: ['beta_feature_1', 'beta_feature_2'],
});
```

## Common Tracking Patterns

### Feature Usage
```typescript
const handleFeatureUse = () => {
  mixpanelService.track('Feature Used', {
    feature_name: 'dark_mode_toggle',
    screen: 'settings',
    user_type: user.subscription_tier,
  });
};
```

### Conversion Funnels
```typescript
// Track funnel steps
mixpanelService.track('Onboarding Step Completed', {
  step: 'profile_setup',
  step_number: 2,
  total_steps: 5,
});

mixpanelService.track('Onboarding Completed', {
  completion_time: Date.now() - onboardingStartTime,
  skipped_steps: ['tutorial'],
});
```

### Performance Metrics
```typescript
const startTime = Date.now();
// ... perform action
const duration = Date.now() - startTime;

mixpanelService.track('Action Performance', {
  action: 'task_creation',
  duration_ms: duration,
  success: true,
});
```

## Testing Mixpanel Integration

### 1. Check Console Logs
Look for these log messages:
- `Mixpanel initialized successfully`
- `Mixpanel user identified: [user_id]`
- `Mixpanel event tracked: [event_name]`

### 2. Verify in Mixpanel Dashboard
- Go to your Mixpanel project dashboard
- Check "Live View" to see real-time events
- Verify user properties are being set correctly

### 3. Development vs Production
- In development, only 10% of sessions are recorded
- In production, 100% of sessions are recorded
- Autocapture is disabled in development to reduce noise

## Troubleshooting

### Events Not Appearing
1. Check console for error messages
2. Verify Mixpanel is initialized: `mixpanelService.isReady()`
3. Ensure you're looking at the correct project in Mixpanel dashboard
4. Check if you're in development mode (only 10% of events recorded)

### User Identification Issues
1. Verify `mixpanelService.identify()` is called after login
2. Check that user properties are being set correctly
3. Ensure `mixpanelService.reset()` is called on logout

### Performance Considerations
1. Events are batched and sent automatically
2. Use `mixpanelService.flush()` only when necessary (e.g., before app close)
3. Avoid tracking too frequently (e.g., on every scroll)

## Next Steps

1. **Add tracking to key user flows**: Add tracking to your most important user journeys
2. **Set up funnels**: Create conversion funnels in Mixpanel dashboard
3. **Create cohorts**: Segment users based on behavior
4. **Set up alerts**: Create alerts for important metrics
5. **A/B testing**: Use Mixpanel for feature flagging and A/B tests

## Support

For issues with the Mixpanel integration:
1. Check the console logs for error messages
2. Verify your Mixpanel project token is correct
3. Ensure you're using the latest version of the React Native Mixpanel SDK
4. Check Mixpanel's documentation for React Native specific issues

The integration is now ready to use! Start adding tracking calls to your key user actions and monitor the results in your Mixpanel dashboard.
