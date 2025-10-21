# Session Timeout Implementation

## Overview
Implemented an automatic session timeout feature that logs users out after 30 days of inactivity to enhance security and protect user accounts from unauthorized access.

## Changes Made

### 1. Created `src/utils/sessionTimeout.ts`
A utility module that manages session timeout functionality with the following functions:

- **`updateLastActiveTimestamp()`**: Updates the last active timestamp to the current time
- **`getLastActiveTimestamp()`**: Retrieves the last active timestamp from AsyncStorage
- **`isSessionExpired()`**: Checks if the session has expired (30 days of inactivity)
- **`clearLastActiveTimestamp()`**: Clears the timestamp when user logs out

**Key Features:**
- Uses AsyncStorage for persistent storage
- 30-day inactivity timeout
- Automatic timestamp initialization for new sessions
- Comprehensive logging for debugging

### 2. Updated `src/features/auth/contexts/AuthContext.tsx`

**Added Imports:**
```typescript
import { isSessionExpired, clearLastActiveTimestamp, updateLastActiveTimestamp } from '@/utils/sessionTimeout';
```

**Added Session Timeout Check:**
- New `useEffect` hook that runs when the session changes
- Checks if the session has expired on app load
- Automatically logs out users with expired sessions
- Shows user-friendly alert explaining the timeout
- Tracks session timeout events in Mixpanel with `logout_reason: 'session_timeout'`

**Updated `signIn` Function:**
- Sets the initial last active timestamp on successful login
- Ensures the timestamp is tracked from the moment of login

**Updated `signOut` Function:**
- Clears the last active timestamp on logout
- Ensures clean state when user manually logs out

### 3. Updated `App.tsx`

**Added Import:**
```typescript
import { updateLastActiveTimestamp } from './src/utils/sessionTimeout';
```

**Updated `NavigationContainer`:**
- Added `onStateChange` prop to track user navigation
- Updates the last active timestamp whenever the user navigates between screens
- Efficient activity tracking without being too aggressive

## How It Works

### Activity Tracking Flow
1. **On Login**: Initial timestamp is set when user successfully logs in
2. **During Usage**: Timestamp is updated every time user navigates to a new screen
3. **On Logout**: Timestamp is cleared to ensure clean state

### Session Expiration Flow
1. **App Load**: When the app starts, AuthContext checks if the session has expired
2. **Timeout Detection**: Compares last active timestamp with current time
3. **Auto-Logout**: If more than 30 days have passed, automatically logs out the user
4. **User Notification**: Shows alert explaining why they were logged out
5. **Analytics**: Tracks the timeout event in Mixpanel

## Security Benefits

✅ **Prevents Unauthorized Access**: Accounts are automatically logged out after 30 days of inactivity
✅ **Protects Lost Devices**: If a user loses their phone, the account will automatically expire
✅ **Shared Device Safety**: Prevents unauthorized access on shared or borrowed devices
✅ **Privacy Protection**: Ensures user data is not accessible after extended inactivity

## User Experience

- **Seamless Tracking**: Activity is tracked automatically without user intervention
- **Clear Communication**: Users receive a clear alert explaining why they were logged out
- **Easy Recovery**: Users can simply log in again to continue using the app
- **No Disruption**: Active users are not affected; only inactive sessions expire

## Configuration

The session timeout duration can be easily adjusted by changing the `SESSION_TIMEOUT_DAYS` constant in `src/utils/sessionTimeout.ts`:

```typescript
const SESSION_TIMEOUT_DAYS = 30; // Change this value to adjust timeout
```

## Testing

### Test Session Timeout
To test the session timeout feature, you can temporarily modify the timeout duration:

```typescript
// In src/utils/sessionTimeout.ts
const SESSION_TIMEOUT_DAYS = 0.01; // 14.4 minutes for testing
```

### Test Activity Tracking
1. Log in to the app
2. Navigate between screens
3. Check console logs for "✅ Last active timestamp updated" messages
4. Verify timestamp is being tracked

### Test Session Expiration
1. Set a short timeout (e.g., 1 minute)
2. Log in to the app
3. Wait for the timeout period
4. Restart the app
5. Verify you are automatically logged out with an alert

## Analytics Tracking

The implementation tracks session timeout events in Mixpanel:

```typescript
mixpanelService.track(AnalyticsEvents.USER_LOGGED_OUT, {
  logout_reason: 'session_timeout',
  timeout_days: 30,
});
```

This allows you to:
- Monitor how many users are affected by session timeouts
- Analyze user activity patterns
- Make data-driven decisions about timeout duration

## Files Modified

1. `src/utils/sessionTimeout.ts` (new file)
2. `src/features/auth/contexts/AuthContext.tsx` (updated)
3. `App.tsx` (updated)

## Future Enhancements

Consider these potential improvements:

1. **Configurable Timeout**: Allow users to set their preferred timeout duration in settings
2. **Warning Before Timeout**: Show a warning 7 days before session expires
3. **Session Extension**: Allow users to extend their session without logging out
4. **Multiple Timeout Tiers**: Different timeout durations for different user types
5. **Background Activity Tracking**: Track app background/foreground state changes
6. **Biometric Re-authentication**: Require biometric verification after extended inactivity

## Notes

- The session timeout only checks on app load, not continuously
- Activity is tracked via navigation state changes, which is efficient and non-intrusive
- The timestamp is stored locally in AsyncStorage, not on the server
- The feature works independently of Supabase session management

