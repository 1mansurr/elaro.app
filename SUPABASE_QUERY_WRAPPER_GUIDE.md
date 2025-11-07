# Supabase Query Wrapper Guide

## Overview

This guide explains when and how to use the Supabase Query Wrapper for consistent error handling, retry logic, and circuit breaker protection.

## What is the Query Wrapper?

The query wrapper (`src/utils/supabaseQueryWrapper.ts`) provides:
- **Circuit Breaker Protection**: Prevents cascading failures during Supabase outages
- **Automatic Retry**: Retries failed requests with exponential backoff
- **Error Handling**: Consistent error handling across all operations
- **Monitoring**: Circuit breaker state tracking and alerting

## When to Use the Wrapper

### ✅ Always Use For:

1. **User-Facing Operations**:
   - Authentication (sign in, sign up, sign out)
   - User profile operations (get, update)
   - Critical data fetching (user data, subscriptions)

2. **Operations That Should Retry**:
   - Queries that might fail due to network issues
   - Operations that are idempotent (safe to retry)
   - Read operations (queries, not mutations)

3. **Critical Business Logic**:
   - Subscription status checks
   - Payment operations
   - Data synchronization

### ⚠️ Use With Caution For:

1. **Mutations** (Create, Update, Delete):
   - Use `executeSupabaseMutation()` which defaults to **no retry**
   - Mutations should not retry automatically (idempotency concerns)
   - Only use retry if the operation is truly idempotent

2. **Time-Sensitive Operations**:
   - Real-time updates
   - Operations where latency matters more than reliability

### ❌ Don't Use For:

1. **Analytics/Logging**:
   - Non-critical operations like tracking events
   - Analytics inserts (failures are acceptable)

2. **Batch Operations**:
   - Operations that handle their own retry logic
   - Background jobs with separate error handling

## How to Use

### Basic Query (Returns Data)

```typescript
import { executeSupabaseQuery } from '@/utils/supabaseQueryWrapper';
import { supabase } from '@/services/supabase';

const data = await executeSupabaseQuery(
  async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },
  {
    operationName: 'getUser',
    retryOnFailure: true,
    maxRetries: 3,
  },
);
```

### Query That May Return Null

```typescript
import { executeSupabaseQueryNullable } from '@/utils/supabaseQueryWrapper';

const data = await executeSupabaseQueryNullable(
  async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },
  {
    operationName: 'getUserProfile',
    retryOnFailure: true,
  },
);
// data can be null (not an error)
```

### Mutation (No Retry by Default)

```typescript
import { executeSupabaseMutation } from '@/utils/supabaseQueryWrapper';

await executeSupabaseMutation(
  async () => {
    const { error } = await supabase
      .from('users')
      .update({ name: newName })
      .eq('id', userId);
    return { data: null, error };
  },
  {
    operationName: 'updateUser',
    retryOnFailure: false, // Explicitly no retry for mutations
  },
);
```

## Current Implementation Status

### ✅ Already Using Wrapper:

- `src/services/supabase.ts`:
  - `authService.signUp()` ✅
  - `authService.signIn()` ✅
  - `authService.signOut()` ✅
  - `authService.getUserProfile()` ✅
  - `authService.updateUserProfile()` ✅
  - `authService.createUserProfile()` ✅

### ⚠️ Not Using Wrapper (Lower Priority):

These files use direct Supabase queries but are less critical:
- `src/utils/reminderUtils.ts` - Analytics/utility functions
- `src/utils/notificationQueue.ts` - Background queue operations
- `src/utils/notificationActions.ts` - Analytics tracking
- `src/utils/authLockout.ts` - Security utility (may need wrapper)
- `src/services/notificationService.ts` - Service operations
- Various feature services (tasks, courses, etc.)

### Recommendation

For files not using the wrapper:
1. **High Priority**: Wrap operations in user-facing code paths
2. **Medium Priority**: Wrap operations in critical business logic
3. **Low Priority**: Analytics, logging, and background jobs can remain unwrapped

## Migration Example

### Before:
```typescript
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

if (error) throw error;
return data;
```

### After:
```typescript
import { executeSupabaseQueryNullable } from '@/utils/supabaseQueryWrapper';

const data = await executeSupabaseQueryNullable(
  async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },
  {
    operationName: 'getUser',
    retryOnFailure: true,
  },
);

return data; // Can be null
```

## Best Practices

1. **Always Provide `operationName`**: Helps with debugging and monitoring
2. **Use Appropriate Function**: Choose `executeSupabaseQuery`, `executeSupabaseQueryNullable`, or `executeSupabaseMutation`
3. **Set Retry Appropriately**: 
   - Queries: `retryOnFailure: true` (default)
   - Mutations: `retryOnFailure: false` (default)
4. **Handle Null Results**: Use `executeSupabaseQueryNullable` if null is a valid result
5. **Monitor Circuit Breakers**: Check circuit breaker state in error logs

## Circuit Breaker Monitoring

Circuit breaker state is automatically monitored and logged. You can also check manually:

```typescript
import { getSupabaseCircuitBreakerStats } from '@/utils/supabaseQueryWrapper';

const stats = getSupabaseCircuitBreakerStats();
console.log('Circuit breaker state:', stats.state); // 'closed' | 'open' | 'half-open'
```

## Error Handling

The wrapper automatically:
- Retries on network errors (5xx, timeouts)
- Does NOT retry on client errors (4xx except 429)
- Opens circuit breaker after 5 consecutive failures
- Provides clear error messages

You still need to handle errors in your code:

```typescript
try {
  const data = await executeSupabaseQuery(/* ... */);
  // Use data
} catch (error) {
  // Handle error (circuit breaker errors, retry exhaustion, etc.)
  if (error.message.includes('Circuit breaker')) {
    // Service temporarily unavailable
  } else {
    // Other error
  }
}
```

