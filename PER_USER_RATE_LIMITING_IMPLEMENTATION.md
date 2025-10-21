# Per-User Rate Limiting Implementation

## Overview
Implemented robust per-user rate limiting for Supabase Edge Functions to prevent abuse and ensure fair resource allocation. Each user now has their own rate limit quota, preventing a single user from exhausting server resources.

## Security Benefits

### ✅ **Prevents API Abuse**
- No single user can make unlimited requests
- Protects server resources from exhaustion
- Prevents malicious actors from overwhelming the system

### ✅ **Fair Usage Policy**
- Each user gets their own rate limit quota
- User A's requests don't affect User B's quota
- Isolated rate limiting per user and action

### ✅ **Resource Protection**
- Prevents database overload
- Protects against DDoS attacks
- Ensures system stability for all users

## Implementation Details

### Architecture

The rate limiting system consists of three key components:

1. **Rate Limits Table** (`rate_limits`)
   - Stores request timestamps per user and action
   - Enables efficient rate limit checking
   - Automatically cleaned up to prevent bloat

2. **Rate Limiter Module** (`_shared/rate-limiter.ts`)
   - Configurable per-user limits
   - Checks request history against limits
   - Provides detailed error messages with retry times

3. **Generic Handler** (`_shared/function-handler.ts`)
   - Automatically applies rate limiting to all functions
   - Returns 429 status with Retry-After header
   - Centralized error handling

### Rate Limit Configuration

```typescript
const RATE_LIMITS = {
  'create-assignment': { requests: 100, window: 60 }, // 100 requests/minute/user
  'create-lecture': { requests: 100, window: 60 },
  'create-study-session': { requests: 100, window: 60 },
  'create-course': { requests: 50, window: 60 },
  'update-assignment': { requests: 200, window: 60 },
  'update-course': { requests: 200, window: 60 },
  'update-lecture': { requests: 200, window: 60 },
  'update-study-session': { requests: 200, window: 60 },
  'delete-assignment': { requests: 50, window: 60 },
  'delete-course': { requests: 50, window: 60 },
  'delete-lecture': { requests: 50, window: 60 },
  'delete-study-session': { requests: 50, window: 60 },
  'send-notification': { requests: 100, window: 60 },
  'default': { requests: 100, window: 60 },
};
```

### How It Works

```
1. Request arrives → createAuthenticatedHandler receives it
2. Authentication → Verifies user is logged in
3. Rate Limiting → Checks user's request count for this action
   ↓
   If under limit:
   - Record request in rate_limits table
   - Proceed to business logic
   
   If over limit:
   - Calculate retry time
   - Return 429 with Retry-After header
   - Stop processing
4. Business Logic → Execute function logic
5. Response → Return success or error
```

## Files Modified

### 1. Database Migration
**File:** `supabase/migrations/20250102120000_create_rate_limits_table.sql`

**Changes:**
- Created `rate_limits` table with user_id, action, and created_at columns
- Added indexes for efficient lookups
- Enabled Row Level Security (RLS)
- Added policies for user isolation

**Key Features:**
- Composite index on (user_id, action, created_at) for fast queries
- Separate index on created_at for cleanup operations
- RLS policies ensure users can only see their own records

### 2. Rate Limiter Module
**File:** `supabase/functions/_shared/rate-limiter.ts`

**Changes:**
- Increased rate limits (100 requests/minute for most actions)
- Added retryAfter calculation to RateLimitError
- Improved error handling with try-catch blocks
- Added cleanupOldRateLimits function
- Better logging for debugging

**Key Features:**
- Per-user rate limiting using user.id as key
- Calculates exact retry time based on oldest request
- Graceful degradation if rate limit check fails
- Non-blocking record insertion

### 3. Function Handler
**File:** `supabase/functions/_shared/function-handler.ts`

**Changes:**
- Updated RateLimitError handling to include Retry-After header
- Improved error response format
- Better error messages for clients

**Response Format:**
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Maximum 100 requests per 60 seconds. Please try again in 45 seconds."
}
```

**Headers:**
```
Retry-After: 45
```

### 4. Cleanup Function
**File:** `supabase/functions/cleanup-rate-limits/index.ts`

**Purpose:**
- Removes old rate limit records (> 5 minutes)
- Prevents database bloat
- Runs as scheduled cron job

### 5. Cron Job Setup
**File:** `supabase/migrations/20250102120001_setup_rate_limits_cleanup_cron.sql`

**Purpose:**
- Schedules cleanup function to run every 5 minutes
- Alternative stored procedure for cleanup
- Configurable cleanup interval

## Database Schema

### rate_limits Table

```sql
CREATE TABLE public.rate_limits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Indexes:**
- `idx_rate_limits_user_action_time` - Composite index for lookups
- `idx_rate_limits_created_at` - Index for cleanup operations

**RLS Policies:**
- Users can insert their own records
- Users can read their own records
- System can delete old records

## Testing

### Test Per-User Isolation

```bash
# User A makes 100 requests - should succeed
for i in {1..100}; do
  curl -X POST https://your-project.supabase.co/functions/v1/create-assignment \
    -H "Authorization: Bearer USER_A_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"course_id": "uuid", "title": "Test", "due_date": "2024-12-31T23:59:59Z"}'
done

# User B makes 100 requests - should succeed (separate counter)
for i in {1..100}; do
  curl -X POST https://your-project.supabase.co/functions/v1/create-assignment \
    -H "Authorization: Bearer USER_B_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"course_id": "uuid", "title": "Test", "due_date": "2024-12-31T23:59:59Z"}'
done

# User A makes 1 more request - should fail (rate limited)
curl -X POST https://your-project.supabase.co/functions/v1/create-assignment \
  -H "Authorization: Bearer USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"course_id": "uuid", "title": "Test", "due_date": "2024-12-31T23:59:59Z"}'

# Expected response:
# HTTP 429 Too Many Requests
# {
#   "error": "Too Many Requests",
#   "message": "Rate limit exceeded. Maximum 100 requests per 60 seconds. Please try again in X seconds."
# }
# Headers:
# Retry-After: X
```

### Test Different Actions

```bash
# Create assignment - 100 requests/minute
# Create course - 50 requests/minute
# Update assignment - 200 requests/minute
# Delete assignment - 50 requests/minute
```

### Test Retry-After Header

```bash
# Make request that exceeds rate limit
curl -i -X POST https://your-project.supabase.co/functions/v1/create-assignment \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"course_id": "uuid", "title": "Test", "due_date": "2024-12-31T23:59:59Z"}'

# Check for Retry-After header in response
# Retry-After: 45
```

## Configuration

### Adjusting Rate Limits

Edit `supabase/functions/_shared/rate-limiter.ts`:

```typescript
const RATE_LIMITS = {
  'create-assignment': { requests: 200, window: 60 }, // Increase to 200/minute
  'create-course': { requests: 100, window: 60 }, // Increase to 100/minute
  'default': { requests: 150, window: 60 }, // Increase default
};
```

### Changing Cleanup Interval

Edit `supabase/functions/cleanup-rate-limits/index.ts`:

```typescript
// Clean up records older than 10 minutes instead of 5
await cleanupOldRateLimits(supabaseAdminClient, 10);
```

### Changing Cron Schedule

Edit `supabase/migrations/20250102120001_setup_rate_limits_cleanup_cron.sql`:

```sql
-- Run every 10 minutes instead of 5
SELECT cron.schedule(
  'cleanup-rate-limits',
  '*/10 * * * *', -- Every 10 minutes
  ...
);
```

## Monitoring

### Check Rate Limit Usage

```sql
-- See rate limit usage for a specific user
SELECT 
  action,
  COUNT(*) as request_count,
  MIN(created_at) as first_request,
  MAX(created_at) as last_request
FROM public.rate_limits
WHERE user_id = 'user-uuid-here'
  AND created_at > NOW() - INTERVAL '1 minute'
GROUP BY action
ORDER BY request_count DESC;
```

### Check System-Wide Rate Limit Usage

```sql
-- See rate limit usage across all users
SELECT 
  action,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_requests
FROM public.rate_limits
WHERE created_at > NOW() - INTERVAL '1 minute'
GROUP BY action
ORDER BY total_requests DESC;
```

### Check for Rate Limit Violations

```sql
-- Find users who are approaching their rate limits
SELECT 
  user_id,
  action,
  COUNT(*) as request_count,
  MAX(created_at) as last_request
FROM public.rate_limits
WHERE created_at > NOW() - INTERVAL '1 minute'
GROUP BY user_id, action
HAVING COUNT(*) > 80  -- 80% of limit
ORDER BY request_count DESC;
```

## Troubleshooting

### Rate Limits Not Working

1. **Check if table exists:**
   ```sql
   SELECT * FROM public.rate_limits LIMIT 1;
   ```

2. **Check RLS policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'rate_limits';
   ```

3. **Check function logs:**
   ```bash
   supabase functions logs create-assignment
   ```

### Cleanup Not Running

1. **Check cron job:**
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'cleanup-rate-limits';
   ```

2. **Check function logs:**
   ```bash
   supabase functions logs cleanup-rate-limits
   ```

3. **Run cleanup manually:**
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/cleanup-rate-limits \
     -H "Authorization: Bearer SERVICE_ROLE_KEY"
   ```

## Best Practices

### 1. **Set Reasonable Limits**
- Don't set limits too low (frustrates users)
- Don't set limits too high (defeats the purpose)
- Consider user behavior patterns

### 2. **Monitor Usage**
- Regularly check rate limit usage
- Adjust limits based on actual usage
- Watch for abuse patterns

### 3. **Provide Clear Errors**
- Include retry time in error messages
- Use Retry-After header
- Explain why the limit exists

### 4. **Graceful Degradation**
- Allow requests if rate limit check fails
- Log errors for debugging
- Don't block legitimate users

### 5. **Regular Cleanup**
- Schedule cleanup to run frequently
- Monitor cleanup job performance
- Adjust cleanup interval as needed

## Future Enhancements

Consider these improvements:

1. **Dynamic Limits**: Adjust limits based on subscription tier
2. **Burst Allowance**: Allow short bursts above limit
3. **Rate Limit Headers**: Return X-RateLimit-* headers
4. **Analytics**: Track rate limit usage for insights
5. **Whitelist**: Allow certain users/IPs to bypass limits
6. **Sliding Window**: Use more sophisticated rate limiting algorithms

## Summary

Your backend now has robust per-user rate limiting that:

- ✅ **Prevents abuse**: No single user can exhaust server resources
- ✅ **Fair usage**: Each user gets their own quota
- ✅ **Configurable**: Easy to adjust limits per action
- ✅ **Secure**: RLS policies protect user data
- ✅ **Maintainable**: Automatic cleanup prevents bloat
- ✅ **User-friendly**: Clear error messages with retry times

The rate limiting is automatically applied to all Edge Functions using `createAuthenticatedHandler`, including:
- `create-assignment`
- `create-course`
- `create-lecture`
- `create-study-session`
- `update-*` functions
- `delete-*` functions
- All other authenticated functions

Your backend is now protected against API abuse! 🛡️

