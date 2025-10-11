# Notification Service Migration Guide

## Overview

We've created a new, centralized notification service (`notificationService.ts`) and a React hook (`usePushNotifications`) to replace the scattered notification logic throughout the app. This provides a cleaner, more maintainable architecture for handling push notifications.

## New Files Created

### 1. `src/services/notificationService.ts`
Centralized service that handles all expo-notifications interactions:
- Permission management
- Push token retrieval
- Token saving to backend
- Notification listeners
- Local notification scheduling
- Badge management

### 2. `src/hooks/usePushNotifications.ts`
React hook that provides an easy interface for components:
- `usePushNotifications()` - Full-featured hook with state management
- `useSimplePushNotifications()` - Simplified hook for basic registration

### 3. `src/hooks/index.ts`
Export file for easy importing of all hooks.

## Migration Guide

### Before (Old Way)
```typescript
// In App.tsx or components
import * as Notifications from 'expo-notifications';
import { notificationService } from '../services/notifications';

// Scattered permission logic
const { status } = await Notifications.getPermissionsAsync();
// Manual token handling
const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
// Manual saving logic
await savePushTokenToSupabase(user.id, tokenData.data);
```

### After (New Way)
```typescript
// In App.tsx or components
import { usePushNotifications } from '../hooks/usePushNotifications';

function App() {
  const { registerForPushNotifications, isLoading, isRegistered } = usePushNotifications();
  
  useEffect(() => {
    // Simple one-line registration
    registerForPushNotifications();
  }, []);
  
  return (
    // Your app JSX
  );
}
```

## Usage Examples

### 1. Basic Registration (Recommended)
```typescript
import { useSimplePushNotifications } from '../hooks/usePushNotifications';

function App() {
  const { registerForPushNotifications, isLoading } = useSimplePushNotifications();
  
  useEffect(() => {
    registerForPushNotifications();
  }, []);
  
  return (
    // Your app JSX
  );
}
```

### 2. Full-Featured Registration with State Management
```typescript
import { usePushNotifications } from '../hooks/usePushNotifications';

function NotificationSettings() {
  const { 
    registerForPushNotifications, 
    isLoading, 
    isRegistered, 
    error, 
    hasPermission 
  } = usePushNotifications();
  
  return (
    <View>
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      
      <Button
        title={isRegistered ? "Notifications Enabled" : "Enable Notifications"}
        onPress={registerForPushNotifications}
        disabled={isLoading || !hasPermission}
        loading={isLoading}
      />
    </View>
  );
}
```

### 3. Direct Service Usage (Advanced)
```typescript
import notificationService from '../services/notificationService';

// Check permissions
const hasPermission = await notificationService.getPermissions();

// Get push token
const token = await notificationService.getPushToken();

// Save token (requires user ID)
await notificationService.savePushToken(userId, token);

// Schedule local notification
const notificationId = await notificationService.scheduleLocalNotification({
  title: "Reminder",
  body: "Don't forget your study session!",
  trigger: { seconds: 3600 } // 1 hour from now
});

// Cancel notification
await notificationService.cancelScheduledNotification(notificationId);
```

## Key Features

### 1. Automatic Permission Handling
- Checks existing permissions
- Requests permissions if needed
- Sets up Android notification channels
- Handles permission errors gracefully

### 2. Push Token Management
- Retrieves Expo push token with proper project ID handling
- Saves token to backend with user association
- Handles token retrieval errors
- Supports both new and legacy Expo config structures

### 3. Notification Listeners
- Automatic setup of notification response listeners
- Handles notification taps and navigation
- Supports foreground notification handling
- Proper cleanup on component unmount

### 4. Local Notification Scheduling
- Schedule notifications with custom triggers
- Cancel specific or all notifications
- Get list of scheduled notifications
- Badge count management

### 5. Error Handling
- Comprehensive error catching and logging
- User-friendly error messages
- Graceful fallbacks for failed operations

## Migration Steps for Existing Code

### Step 1: Update App.tsx
Replace the existing notification setup with:
```typescript
import { useSimplePushNotifications } from './hooks/usePushNotifications';

export default function App() {
  const { registerForPushNotifications } = useSimplePushNotifications();
  
  useEffect(() => {
    registerForPushNotifications();
  }, []);
  
  // Rest of your app...
}
```

### Step 2: Update Components Using Notifications
Replace direct expo-notifications imports with the new hook:
```typescript
// Old
import * as Notifications from 'expo-notifications';

// New
import { usePushNotifications } from '../hooks/usePushNotifications';
```

### Step 3: Remove Old Notification Logic
The old `src/services/notifications.ts` file can be gradually phased out as components are migrated to use the new service.

## Benefits

1. **Centralized Logic**: All notification logic in one place
2. **Type Safety**: Full TypeScript support
3. **Error Handling**: Comprehensive error handling and logging
4. **React Integration**: Hooks provide easy component integration
5. **Maintainability**: Single source of truth for notification logic
6. **Testing**: Easier to test and mock
7. **Consistency**: Uniform API across the entire app

## Environment Requirements

Make sure your `app.config.js` includes the EAS project ID:
```javascript
extra: {
  eas: {
    projectId: '1dd584f5-6522-4df5-ad51-076b07b3d09c'
  }
}
```

## Troubleshooting

### Common Issues

1. **"EAS project ID not found"**
   - Ensure your app.config.js includes the eas.projectId
   - Check that you're using the correct Expo SDK version

2. **"Failed to get push token"**
   - Verify device has internet connection
   - Check that Expo push notification service is accessible
   - Ensure app is properly configured for push notifications

3. **"Notification permissions not granted"**
   - User needs to manually enable notifications in device settings
   - Check that your app has notification permissions in app.json

### Debug Mode
Enable debug logging by setting:
```typescript
console.log('Debug mode enabled for notifications');
```

## Next Steps

1. **Update App.tsx** to use the new notification hook
2. **Migrate existing components** to use the new service
3. **Test notification flow** on both iOS and Android
4. **Remove old notification logic** once migration is complete
5. **Update documentation** for team members

The new notification service provides a solid foundation for all push notification functionality while maintaining backward compatibility during the migration period.
