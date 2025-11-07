# Rate Limiting Strategy

## Overview

This document describes the rate limiting implementation for the ELARO app, covering both client-side and server-side rate limiting.

## Server-Side Rate Limiting ✅

### Implementation

Server-side rate limiting is implemented in `supabase/functions/_shared/rate-limiter.ts` and is automatically applied to all Edge Functions through the `createAuthenticatedHandler` wrapper.

### Features

1. **Dual Rate Limiting**:
   - **Per-User Limits**: Limits requests per authenticated user
   - **Per-IP Limits**: Limits requests per IP address (prevents abuse)
   - **Most Restrictive Applies**: The stricter limit is enforced

2. **Action-Based Limits**: Different rate limits for different operations:
   ```typescript
   'create-assignment': { perUser: 100/60s, perIP: 200/60s }
   'update-assignment': { perUser: 200/60s, perIP: 400/60s }
   'delete-assignment': { perUser: 50/60s, perIP: 100/60s }
   ```

3. **Fail-Secure**: If rate limit check fails, conservative limits are applied

4. **Automatic Cleanup**: Old rate limit records are cleaned up periodically

### Database Tables

- `rate_limits`: Tracks per-user rate limits
- `ip_rate_limits`: Tracks per-IP rate limits

### Configuration

Rate limits are configured in `supabase/functions/_shared/rate-limiter.ts`:

```typescript
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'create-assignment': {
    perUser: { requests: 100, window: 60 }, // 100 requests per 60 seconds
    perIP: { requests: 200, window: 60 },
  },
  // ... more limits
  default: {
    perUser: { requests: 100, window: 60 },
    perIP: { requests: 200, window: 60 },
  },
};
```

### Usage in Edge Functions

Rate limiting is automatically applied when using `createAuthenticatedHandler`:

```typescript
export default createAuthenticatedHandler(
  async (req) => {
    // Handler logic
  },
  {
    rateLimitName: 'create-assignment', // Uses configured limits
    // ... other options
  },
);
```

### Error Response

When rate limit is exceeded:

```json
{
  "error": "Rate limit exceeded. Maximum 100 requests per 60 seconds. Please try again in 45 seconds.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 45
}
```

### Cleanup

A cleanup function removes old rate limit records:

```typescript
await cleanupOldRateLimits(supabaseClient, olderThanMinutes: 5);
```

This is typically called by a scheduled Edge Function (`cleanup-rate-limits`).

## Client-Side Rate Limiting ✅

### Implementation

Client-side rate limiting is implemented in `src/utils/clientRateLimiter.ts` and prevents excessive API calls from the mobile app.

### Features

1. **Operation-Based Limits**:
   - Supabase queries: 60 requests/minute
   - Supabase mutations: 30 requests/minute
   - RevenueCat API: 20 requests/minute

2. **Automatic Cleanup**: Old request records are cleaned up to prevent memory leaks

3. **Retry-After Information**: Provides time until rate limit resets

### Usage

```typescript
import { withRateLimit, CLIENT_RATE_LIMITS } from '@/utils/clientRateLimiter';

const result = await withRateLimit(
  'supabase_query',
  CLIENT_RATE_LIMITS.supabase_query,
  async () => {
    return await supabase.from('users').select('*');
  },
);
```

### Error Handling

```typescript
import { RateLimitError } from '@/utils/clientRateLimiter';

try {
  await withRateLimit(/* ... */);
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Retry after ${error.retryAfter} seconds`);
  }
}
```

## Rate Limit Configuration

### Server-Side (Edge Functions)

| Action | Per-User | Per-IP | Window |
|--------|----------|--------|--------|
| Create Assignment | 100 | 200 | 60s |
| Update Assignment | 200 | 400 | 60s |
| Delete Assignment | 50 | 100 | 60s |
| Create Course | 50 | 100 | 60s |
| Update Course | 200 | 400 | 60s |
| Send Notification | 100 | 200 | 60s |
| Default | 100 | 200 | 60s |

### Client-Side (Mobile App)

| Operation | Limit | Window |
|-----------|-------|--------|
| Supabase Query | 60 | 60s |
| Supabase Mutation | 30 | 60s |
| RevenueCat API | 20 | 60s |
| General | 100 | 60s |

## Monitoring

### Server-Side

- Rate limit violations are logged in Edge Function logs
- Rate limit info is included in response headers (if configured)
- Database tables can be queried for usage patterns

### Client-Side

- Rate limit errors are logged to console
- Rate limit state can be queried for debugging:
  ```typescript
  import { clientRateLimiter } from '@/utils/clientRateLimiter';
  const state = clientRateLimiter.getState('supabase_query');
  ```

## Best Practices

1. **Adjust Limits Based on Usage**: Monitor actual usage and adjust limits as needed
2. **Set Appropriate Windows**: Balance between security and usability
3. **Provide Clear Error Messages**: Help users understand when they can retry
4. **Monitor Abuse**: Watch for patterns that might indicate abuse
5. **Clean Up Old Records**: Prevent database bloat with periodic cleanup

## Adjusting Rate Limits

### Server-Side

Edit `supabase/functions/_shared/rate-limiter.ts`:

```typescript
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'your-action': {
    perUser: { requests: 100, window: 60 },
    perIP: { requests: 200, window: 60 },
  },
};
```

### Client-Side

Edit `src/utils/clientRateLimiter.ts`:

```typescript
export const CLIENT_RATE_LIMITS = {
  your_operation: { maxRequests: 60, windowMs: 60000 },
};
```

## Troubleshooting

### "Rate limit exceeded" errors

1. **Check if limit is appropriate**: May need to increase limit
2. **Check for retry loops**: Client might be retrying too aggressively
3. **Check for abuse**: Monitor for suspicious patterns

### Rate limit not working

1. **Verify handler is using `createAuthenticatedHandler`**: Only applies to authenticated handlers
2. **Check database tables exist**: `rate_limits` and `ip_rate_limits` must exist
3. **Check cleanup function**: Ensure old records are being cleaned up

### Performance issues

1. **Check database indexes**: Ensure indexes exist on rate limit tables
2. **Reduce cleanup frequency**: If cleanup is too frequent, it may cause issues
3. **Optimize queries**: Rate limit checks should be fast

## Future Enhancements

1. **Dynamic Rate Limiting**: Adjust limits based on user tier/subscription
2. **Rate Limit Headers**: Add rate limit info to response headers
3. **Rate Limit Dashboard**: Admin dashboard to view rate limit usage
4. **Sliding Window**: Implement sliding window instead of fixed window
5. **Distributed Rate Limiting**: Support for multiple Edge Function instances

