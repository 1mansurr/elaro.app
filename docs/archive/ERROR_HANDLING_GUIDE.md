# Error Handling Guide

## Overview

This guide documents the error handling architecture, patterns, and best practices in the ELARO app. It covers error boundaries, recovery strategies, network error handling, and user-friendly error messages.

---

## Error Handling Architecture

### Error Boundaries

The app uses React Error Boundaries to catch JavaScript errors anywhere in the component tree:

1. **`ErrorBoundary`** - Top-level error boundary (catches all errors)
2. **`FeatureErrorBoundary`** - Feature-specific error boundary (isolates feature errors)
3. **`ErrorFallback`** - Reusable error fallback UI component

### Error Tracking

All errors are tracked using Sentry:

- Automatic error capture in error boundaries
- Manual error tracking via `errorTracking.captureError()`
- Breadcrumbs for debugging context

### Error Mapping

Backend error codes are mapped to user-friendly messages via `errorMapping.ts`:

- 100+ error codes mapped
- Pattern matching for generic errors
- Actionable error messages

---

## Error Boundaries

### Global Error Boundary

**Location:** `App.tsx`

**Purpose:** Catches all unhandled errors and prevents app crash

**Features:**

- Logs errors to Sentry
- Shows error fallback UI
- Allows app restart

**Usage:**

```typescript
<ErrorBoundary onReset={resetApp}>
  <AppProviders>
    {/* App content */}
  </AppProviders>
</ErrorBoundary>
```

### Feature Error Boundary

**Location:** Feature components

**Purpose:** Isolates feature errors without crashing entire app

**Usage:**

```typescript
<FeatureErrorBoundary featureName="Course Creation">
  <AddCourseFlow />
</FeatureErrorBoundary>
```

### ErrorFallback Component

**Reusable error UI component:**

```typescript
<ErrorFallback
  error={error}
  resetError={handleReset}
  retry={handleRetry}
  title="Custom Title"
  message="Custom message"
  showRetry={true}
  compact={false}
/>
```

**Props:**

- `error` - Error object
- `resetError` - Function to reset error state
- `retry` - Function to retry operation
- `title` - Error title (optional)
- `message` - Error message (optional)
- `showRetry` - Show retry button (default: true)
- `compact` - Compact mode for inline errors (default: false)

---

## Error Recovery Strategies

### Retry with Exponential Backoff

**Usage:**

```typescript
import { retryWithBackoff } from '@/utils/errorRecovery';

const result = await retryWithBackoff(async () => await fetchData(), {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  retryCondition: error => isRecoverableError(error),
});

if (result.success) {
  // Use result.result
} else {
  // Handle error
  console.error('Failed after', result.attempts, 'attempts');
}
```

### Circuit Breaker Pattern

**Prevents cascading failures:**

```typescript
import { createCircuitBreaker } from '@/utils/errorRecovery';

const circuitBreaker = createCircuitBreaker(5, 60000); // 5 failures, 1 min timeout

try {
  const result = await circuitBreaker.execute(() => apiCall());
} catch (error) {
  // Circuit is open - service temporarily unavailable
}
```

**States:**

- **Closed** - Normal operation
- **Open** - Too many failures, blocking requests
- **Half-Open** - Testing if service recovered

### Fallback Execution

**Try primary, fallback to secondary:**

```typescript
import { executeWithFallback } from '@/utils/errorRecovery';

const data = await executeWithFallback(
  async () => await fetchFromAPI(), // Primary
  async () => await loadFromCache(), // Fallback
  error => isNetworkError(error), // When to fallback
);
```

---

## Network Error Handling

### Network-Aware Operations

**Hook for network-aware error handling:**

```typescript
import { useNetworkErrorHandler } from '@/utils/networkErrorHandler';

const MyComponent = () => {
  const { handleNetworkError, isOnline, isOffline } = useNetworkErrorHandler();

  const loadData = async () => {
    try {
      const data = await handleNetworkError(async () => await fetchData(), {
        showOfflineMessage: true,
        retryOnReconnect: true,
        maxRetries: 3,
      });
    } catch (error) {
      // Handle error
    }
  };
};
```

### Network-Aware Fetch

**Fetch wrapper with timeout:**

```typescript
import { networkAwareFetch } from '@/utils/networkErrorHandler';

const response = await networkAwareFetch(
  'https://api.example.com/data',
  { method: 'GET' },
  isOnline,
);
```

### Internet Connectivity Check

**Check if device can reach internet:**

```typescript
import { checkInternetConnectivity } from '@/utils/networkErrorHandler';

const isConnected = await checkInternetConnectivity();
```

---

## User-Friendly Error Messages

### Error Message Mapping

**Automatic mapping from error codes:**

```typescript
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';

try {
  await createCourse();
} catch (error) {
  const title = getErrorTitle(error);
  const message = mapErrorCodeToMessage(error);

  Alert.alert(title, message);
}
```

### Error Message Categories

**Authentication Errors:**

- `UNAUTHORIZED` - "You need to be logged in..."
- `TOKEN_EXPIRED` - "Your session has expired..."
- `INVALID_CREDENTIALS` - "Invalid email or password..."

**Validation Errors:**

- `VALIDATION_ERROR` - "Please check your input..."
- `MISSING_REQUIRED_FIELD` - "Please fill in all required fields..."

**Network Errors:**

- `NETWORK_ERROR` - "Network error. Please check your internet connection..."
- `TIMEOUT` - "Request timed out. Please try again..."

**Resource Errors:**

- `NOT_FOUND` - "The requested item was not found..."
- `LIMIT_REACHED` - "You have reached your limit..."

### QueryStateWrapper

**Automatic error handling for React Query:**

```typescript
<QueryStateWrapper
  isLoading={isLoading}
  isError={isError}
  error={error}
  data={data}
  refetch={refetch}
  isRefetching={isRefetching}
>
  <FlatList data={data} renderItem={renderItem} />
</QueryStateWrapper>
```

**Features:**

- Shows loading state
- Shows error state with retry button
- Shows empty state
- Pull-to-refresh support

---

## Best Practices

### ✅ DO

1. **Use Error Boundaries**
   - Wrap feature components in `FeatureErrorBoundary`
   - Use global `ErrorBoundary` in App.tsx

2. **Map Errors to User Messages**
   - Always use `mapErrorCodeToMessage()` for user-facing errors
   - Use `getErrorTitle()` for Alert titles

3. **Check if Error is Recoverable**
   - Use `isRecoverableError()` before showing retry button
   - Only retry recoverable errors

4. **Handle Network Errors**
   - Check `isOnline` before API calls
   - Use `handleNetworkError()` hook for network-aware operations

5. **Provide Retry Options**
   - Show retry button for recoverable errors
   - Implement exponential backoff for retries

6. **Track Errors**
   - Use `errorTracking.captureError()` for important errors
   - Add context (component, feature, user action)

### ❌ DON'T

1. **Don't Show Technical Errors**
   - Never show raw error objects to users
   - Always map to user-friendly messages

2. **Don't Retry Non-Recoverable Errors**
   - Don't retry auth errors (user needs to sign in)
   - Don't retry validation errors (user needs to fix input)

3. **Don't Ignore Network Errors**
   - Always check network status
   - Provide offline-friendly error messages

4. **Don't Crash on Errors**
   - Always use error boundaries
   - Provide fallback UI

5. **Don't Retry Infinitely**
   - Set maximum retry attempts
   - Use exponential backoff

---

## Error Handling Patterns

### Pattern 1: API Call with Error Handling

```typescript
try {
  const result = await api.createCourse(courseData);
  showToast({ type: 'success', message: 'Course created!' });
} catch (error) {
  const title = getErrorTitle(error);
  const message = mapErrorCodeToMessage(error);
  Alert.alert(title, message);

  // Track error
  errorTracking.captureError(error, {
    feature: 'course_creation',
    action: 'create_course',
  });
}
```

### Pattern 2: Network-Aware Operation

```typescript
const { handleNetworkError, isOffline } = useNetworkErrorHandler();

if (isOffline) {
  Alert.alert(
    'Offline',
    'You are currently offline. This action will be queued for later.',
  );
  await queueAction(action);
  return;
}

try {
  await handleNetworkError(async () => await executeAction(action), {
    maxRetries: 3,
  });
} catch (error) {
  // Error already handled by handleNetworkError
}
```

### Pattern 3: Retry with Backoff

```typescript
const result = await retryWithBackoff(async () => await fetchData(), {
  maxRetries: 3,
  retryCondition: error => isNetworkError(error),
});

if (!result.success) {
  Alert.alert('Error', 'Failed to load data. Please try again.');
}
```

### Pattern 4: Query Error Handling

```typescript
const { data, isLoading, isError, error, refetch } = useQuery({
  queryKey: ['courses'],
  queryFn: fetchCourses,
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});

return (
  <QueryStateWrapper
    isLoading={isLoading}
    isError={isError}
    error={error}
    data={data}
    refetch={refetch}
  >
    <CoursesList data={data} />
  </QueryStateWrapper>
);
```

---

## Error Categories

### Recoverable Errors

Errors that can be retried:

- Network errors
- Timeout errors
- Server errors (5xx)
- Rate limit errors (429)

**Treatment:**

- Show retry button
- Automatically retry with backoff
- Provide clear error message

### Non-Recoverable Errors

Errors that cannot be retried:

- Authentication errors (401, 403)
- Validation errors (400)
- Not found errors (404)
- Limit reached errors
- Account locked errors

**Treatment:**

- Don't show retry button
- Provide actionable message
- Guide user to fix the issue

---

## Troubleshooting

### Issue: Errors not being caught

**Solution:**

1. Verify error boundary is wrapping component
2. Check if error is in async code (not caught by error boundary)
3. Use try-catch for async operations

### Issue: User sees technical error messages

**Solution:**

1. Use `mapErrorCodeToMessage()` instead of `error.message`
2. Check error mapping covers all error codes
3. Add fallback message for unmapped errors

### Issue: Retry not working

**Solution:**

1. Verify error is recoverable using `isRecoverableError()`
2. Check retry condition in retry options
3. Ensure network is online for network errors

### Issue: Too many retries

**Solution:**

1. Set appropriate `maxRetries` limit
2. Use exponential backoff
3. Implement circuit breaker for repeated failures

---

## Related Documentation

- [Error Mapping Source](../src/utils/errorMapping.ts)
- [Error Recovery Utilities](../src/utils/errorRecovery.ts)
- [Network Error Handler](../src/utils/networkErrorHandler.ts)
- [Error Fallback Component](../src/shared/components/ErrorFallback.tsx)

---

**Last Updated:** Phase 5 Implementation  
**Status:** Active Guide
