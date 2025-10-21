# Per-User Rate Limiting - Quick Start Guide

## What Was Implemented

Your backend now has robust per-user rate limiting that prevents any single user from exhausting server resources.

## Files Created/Modified

### ✅ Created Files

1. **`supabase/migrations/20250102120000_create_rate_limits_table.sql`**
   - Creates the `rate_limits` table
   - Adds indexes for efficient queries
   - Sets up Row Level Security (RLS)

2. **`supabase/migrations/20250102120001_setup_rate_limits_cleanup_cron.sql`**
   - Sets up cron job to clean up old records
   - Runs every 5 minutes

3. **`supabase/functions/cleanup-rate-limits/index.ts`**
   - Edge Function to clean up old rate limit records
   - Prevents database bloat

4. **`PER_USER_RATE_LIMITING_IMPLEMENTATION.md`**
   - Comprehensive documentation
   - Testing examples
   - Troubleshooting guide

### ✅ Modified Files

1. **`supabase/functions/_shared/rate-limiter.ts`**
   - Increased rate limits (100 requests/minute for most actions)
   - Added retry time calculation
   - Improved error handling
   - Added cleanup function

2. **`supabase/functions/_shared/function-handler.ts`**
   - Added Retry-After header to 429 responses
   - Improved error messages

## Rate Limits

| Action | Limit | Window |
|--------|-------|--------|
| create-assignment | 100 | 60 seconds |
| create-lecture | 100 | 60 seconds |
| create-study-session | 100 | 60 seconds |
| create-course | 50 | 60 seconds |
| update-* | 200 | 60 seconds |
| delete-* | 50 | 60 seconds |
| Default | 100 | 60 seconds |

## How It Works

1. User makes a request
2. System checks their request count in the last 60 seconds
3. If under limit: Request proceeds
4. If over limit: Returns 429 with Retry-After header

## Example Response

### When Rate Limit is Exceeded:

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Maximum 100 requests per 60 seconds. Please try again in 45 seconds."
}
```

**Headers:**
```
HTTP/1.1 429 Too Many Requests
Retry-After: 45
Content-Type: application/json
```

## Deployment Steps

### 1. Apply Database Migrations

```bash
# Apply the migrations to create the rate_limits table
supabase db push
```

### 2. Deploy Edge Functions

```bash
# Deploy the cleanup function
supabase functions deploy cleanup-rate-limits

# Redeploy functions that use rate limiting
supabase functions deploy create-assignment
supabase functions deploy create-course
# ... etc
```

### 3. Set Up Cron Job (Optional)

```sql
-- Run in Supabase SQL Editor
SELECT cron.schedule(
  'cleanup-rate-limits',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/cleanup-rate-limits',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )
    ) AS request_id;
  $$
);
```

### 4. Set Environment Variable

Make sure `CRON_SECRET` is set in your Supabase project settings.

## Testing

### Quick Test

```bash
# Make 101 requests to trigger rate limit
for i in {1..101}; do
  curl -X POST https://your-project.supabase.co/functions/v1/create-assignment \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"course_id": "uuid", "title": "Test", "due_date": "2024-12-31T23:59:59Z"}'
done

# The 101st request should return 429
```

### Verify Per-User Isolation

```bash
# User A: 100 requests → Success
# User B: 100 requests → Success (separate counter)
# User A: 1 more request → 429 (rate limited)
```

## Monitoring

### Check Rate Limit Usage

```sql
-- See current rate limit usage for a user
SELECT 
  action,
  COUNT(*) as requests,
  MAX(created_at) as last_request
FROM public.rate_limits
WHERE user_id = 'user-uuid-here'
  AND created_at > NOW() - INTERVAL '1 minute'
GROUP BY action;
```

### Check System Health

```sql
-- See total rate limit records
SELECT COUNT(*) FROM public.rate_limits;

-- See oldest record
SELECT MIN(created_at) FROM public.rate_limits;
```

## Adjusting Limits

Edit `supabase/functions/_shared/rate-limiter.ts`:

```typescript
const RATE_LIMITS = {
  'create-assignment': { requests: 200, window: 60 }, // Increase to 200/minute
  // ... other limits
};
```

## Troubleshooting

### Rate Limits Not Working?

1. Check if table exists:
   ```sql
   SELECT * FROM public.rate_limits LIMIT 1;
   ```

2. Check function logs:
   ```bash
   supabase functions logs create-assignment
   ```

3. Verify RLS policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'rate_limits';
   ```

### Cleanup Not Running?

1. Check cron job:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'cleanup-rate-limits';
   ```

2. Run cleanup manually:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/cleanup-rate-limits \
     -H "Authorization: Bearer SERVICE_ROLE_KEY"
   ```

## Key Benefits

- ✅ **Prevents abuse**: No single user can exhaust resources
- ✅ **Fair usage**: Each user gets their own quota
- ✅ **Automatic**: Applied to all functions using createAuthenticatedHandler
- ✅ **Configurable**: Easy to adjust limits
- ✅ **User-friendly**: Clear error messages with retry times
- ✅ **Secure**: RLS policies protect user data

## Next Steps

1. ✅ Deploy the migrations
2. ✅ Deploy the cleanup function
3. ✅ Set up the cron job
4. ✅ Test with your app
5. ✅ Monitor usage and adjust limits as needed

Your backend is now protected against API abuse! 🛡️

