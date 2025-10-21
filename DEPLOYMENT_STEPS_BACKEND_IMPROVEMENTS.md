# Deployment Steps for Backend Improvements

## 🚀 Quick Deployment Guide

All backend improvements have been implemented. Follow these steps to deploy them to production.

---

## Step 1: Update Cron Job Configuration

**File:** `supabase/migrations/20251021000002_setup_idempotency_cleanup_cron.sql`

**Action Required:**
Replace `your-project-ref` with your actual Supabase project reference.

**Example:**
```sql
-- Before
url:='https://your-project-ref.supabase.co/functions/v1/cleanup-idempotency-keys',

-- After (replace with your actual project ref)
url:='https://abcdefghijklmnop.supabase.co/functions/v1/cleanup-idempotency-keys',
```

---

## Step 2: Run Database Migrations

Run these commands to create the idempotency_keys table and setup the cleanup cron job:

```bash
cd /Users/new/Desktop/Biz/ELARO/ELARO-app

# Push migrations to Supabase
supabase db push
```

**Migrations that will be applied:**
1. `20251021000001_add_idempotency_keys.sql` - Creates idempotency_keys table
2. `20251021000002_setup_idempotency_cleanup_cron.sql` - Sets up hourly cleanup cron

---

## Step 3: Deploy Edge Functions

All existing Edge Functions now use the new shared utilities. Deploy them:

```bash
# Deploy all functions at once
supabase functions deploy

# Or deploy individually
supabase functions deploy create-assignment
supabase functions deploy create-course
supabase functions deploy check-grace-period
# ... etc for all functions
```

**New function to deploy:**
```bash
supabase functions deploy cleanup-idempotency-keys
```

---

## Step 4: Verify Deployment

### Check Rate Limit Headers

Use curl to test any endpoint:
```bash
curl -i https://your-project.supabase.co/functions/v1/create-assignment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test"}'
```

**Look for these headers in the response:**
```
X-API-Version: v1
X-Supported-Versions: v1
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1697891234
```

### Test Idempotency

Make the same request twice with an idempotency key:
```bash
# First request - creates resource
curl https://your-project.supabase.co/functions/v1/create-assignment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Idempotency-Key: test-12345" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Assignment"}'

# Second request - returns cached response
curl https://your-project.supabase.co/functions/v1/create-assignment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Idempotency-Key: test-12345" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Assignment"}'
```

**Second response should include:**
```
X-Idempotency-Cached: true
```

### Check Structured Logs

View function logs in Supabase Dashboard:
```
Dashboard > Functions > [function-name] > Logs
```

**You should see JSON logs like:**
```json
{"type":"request","function":"create-assignment","user_id":"...","method":"POST","timestamp":"..."}
{"type":"response","function":"create-assignment","user_id":"...","status":200,"rate_limit_remaining":99}
```

### Verify Cron Job

Check that the cleanup cron job is running:
```sql
-- In Supabase SQL Editor
SELECT * FROM cron.job WHERE jobname = 'cleanup-expired-idempotency-keys';
```

---

## Step 5: Monitor in Production

### Key Metrics to Watch

1. **Rate Limit Usage**
   - Check `X-RateLimit-Remaining` headers
   - Monitor for 429 responses

2. **Circuit Breaker Status**
   - Look for circuit breaker logs in function logs
   - "Circuit breaker [name]: OPENING" = external service is failing

3. **Idempotency Cache Hit Rate**
   - Look for "♻️ Idempotency key hit" logs
   - High hit rate = clients are properly retrying

4. **Retry Attempts**
   - Look for "⏳ Retry attempt" logs
   - Frequent retries = external service instability

5. **Error Codes**
   - Monitor for new error codes:
     - `UNSUPPORTED_VERSION`
     - `RATE_LIMIT_EXCEEDED`

---

## Step 6: Update Client (Optional)

For best results, update your frontend to send idempotency keys on mutations:

**Example in React Query mutation:**
```typescript
import { v4 as uuidv4 } from 'uuid';

const mutation = useMutation({
  mutationFn: async (data) => {
    const idempotencyKey = uuidv4();
    
    return await supabase.functions.invoke('create-assignment', {
      body: data,
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
  },
});
```

---

## 🎯 Rollback Plan (If Needed)

If you encounter issues after deployment:

### Rollback Migrations
```bash
# Revert idempotency migrations
supabase db reset --local
# Then manually remove the migration files and push again
```

### Rollback Functions
```bash
# Deploy previous version of functions
git checkout <previous-commit>
supabase functions deploy
```

### Disable Cron Job
```sql
SELECT cron.unschedule('cleanup-expired-idempotency-keys');
```

---

## ✅ Post-Deployment Checklist

- [ ] Database migrations applied successfully
- [ ] All Edge Functions deployed without errors
- [ ] Cleanup cron job is scheduled
- [ ] Rate limit headers appear in responses
- [ ] Idempotency works (test with duplicate requests)
- [ ] Structured logs visible in Supabase Dashboard
- [ ] Circuit breaker logs appear for external API calls
- [ ] No increase in error rate after deployment
- [ ] Frontend handles new error codes gracefully

---

## 📞 Support

If you encounter issues:
1. Check Supabase function logs
2. Check database logs for migration errors
3. Verify environment variables are set correctly
4. Check the `BACKEND_IMPROVEMENTS_COMPLETE.md` for detailed documentation

---

## 🎉 Success!

Once all steps are complete, your backend will have:
- ✅ API versioning with deprecation support
- ✅ Rate limiting transparency
- ✅ Duplicate operation prevention
- ✅ Resilient external API calls
- ✅ Better error handling and monitoring
- ✅ Production-ready reliability features

