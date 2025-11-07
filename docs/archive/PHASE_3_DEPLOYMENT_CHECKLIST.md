# Phase 3 Deployment Checklist

## Pre-Deployment Verification

### ✅ Code Validation

- [x] All files created and syntax validated
- [x] No linting errors in new code
- [x] TypeScript compilation successful (except test files - expected)
- [x] Security audit passed (`npm run audit-secrets`)

### ✅ Environment Validation

- [x] Environment variables validated (`npm run validate-env`)
- [x] .env.example template created
- [x] All required variables documented

---

## Database Migration Steps

### Step 1: Backup Database

```sql
-- Run in Supabase SQL Editor
-- Create backup point
SELECT pg_create_restore_point('before_phase3_quota_monitoring');
```

### Step 2: Apply Migrations

**Method A: Supabase Dashboard (Recommended)**

1. Open SQL Editor in Supabase Dashboard
2. Apply `20250103000001_create_api_quota_monitoring.sql`
3. Verify success
4. Apply `20250103000002_create_cost_tracking.sql`
5. Verify success

**Method B: Supabase CLI**

```bash
supabase db push
```

### Step 3: Verify Migrations

Run validation queries from `scripts/validate-migrations.sql`:

- All tables created
- All functions exist
- Indexes created
- Budget configs initialized
- RLS policies enabled

---

## Edge Function Deployment

### Step 1: Fix Import Map (if needed)

The `check-budget-alerts` function may need an import map. Check if it requires one:

```bash
cd supabase/functions
```

If deployment fails due to Sentry import, the function doesn't directly use Sentry, so it should work. The error may be from indirect dependencies.

### Step 2: Deploy Functions

```bash
# From project root
cd supabase

# Deploy check-budget-alerts
npx supabase functions deploy check-budget-alerts --no-verify-jwt

# Deploy process-notification-queue
npx supabase functions deploy process-notification-queue --no-verify-jwt
```

### Step 3: Verify Deployment

Check functions are deployed:

```bash
npx supabase functions list
```

---

## Configuration Steps

### Step 1: Update Quota Limits

Edit `supabase/functions/_shared/quota-monitor.ts`:

```typescript
const QUOTA_CONFIGS: QuotaConfig[] = [
  { serviceName: 'supabase', quotaType: 'daily', limit: YOUR_ACTUAL_LIMIT },
  { serviceName: 'expo_push', quotaType: 'daily', limit: YOUR_ACTUAL_LIMIT },
  { serviceName: 'revenuecat', quotaType: 'monthly', limit: YOUR_ACTUAL_LIMIT },
];
```

### Step 2: Update Budget Configs

Run in SQL Editor:

```sql
-- Update budgets based on your actual spending
UPDATE budget_configs
SET
  monthly_budget_usd = YOUR_BUDGET,
  alert_threshold_70 = YOUR_BUDGET * 0.70,
  alert_threshold_90 = YOUR_BUDGET * 0.90
WHERE service_name = 'supabase';

-- Repeat for expo_push and revenuecat
```

### Step 3: Schedule Edge Functions

See "Step 10: Schedule Edge Functions" in TESTING_PHASE_3_IMPLEMENTATION.md

---

## Post-Deployment Verification

### Immediate Checks (First 24 Hours)

1. **Monitor Error Logs**
   - Check Supabase Dashboard → Logs → Edge Functions
   - Look for errors in quota-monitor, fallback-handler

2. **Check Quota Tracking**

   ```sql
   SELECT * FROM api_quota_usage
   ORDER BY updated_at DESC
   LIMIT 10;
   ```

3. **Check for Alerts**

   ```sql
   SELECT * FROM quota_alerts
   WHERE resolved_at IS NULL
   ORDER BY sent_at DESC;

   SELECT * FROM budget_alerts
   WHERE resolved_at IS NULL
   ORDER BY sent_at DESC;
   ```

4. **Test Notification Queue**
   - Send a notification via app
   - Check if it's processed correctly
   - Verify quota is tracked

### Weekly Checks

1. Review quota usage trends
2. Review budget alerts
3. Adjust quotas/budgets if needed
4. Check notification queue size (should be small if quota healthy)

---

## Rollback Plan

If issues occur:

### Rollback Database Changes

```sql
-- Drop tables (CAUTION: This will delete all data)
DROP TABLE IF EXISTS budget_alerts CASCADE;
DROP TABLE IF EXISTS budget_configs CASCADE;
DROP TABLE IF EXISTS api_cost_tracking CASCADE;
DROP TABLE IF EXISTS notification_queue CASCADE;
DROP TABLE IF EXISTS quota_alerts CASCADE;
DROP TABLE IF EXISTS api_quota_usage CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS check_budget_alerts(text);
DROP FUNCTION IF EXISTS get_current_month_spend(text);
DROP FUNCTION IF EXISTS record_api_cost(text, numeric, text, integer, date);
DROP FUNCTION IF EXISTS get_quota_status(text, text);
DROP FUNCTION IF EXISTS track_quota_usage(text, text, integer, integer);
```

### Rollback Code Changes

1. Revert changes to `send-push-notification.ts`
2. Revert changes to `revenueCat.ts`
3. Remove new files:
   - `quota-monitor.ts`
   - `fallback-handler.ts`
   - `clientRateLimiter.ts`

---

## Success Criteria

✅ **Quota Monitoring**

- Usage tracked correctly
- Alerts created at thresholds
- Status queries return accurate data

✅ **Fallback System**

- Notifications queued when quota low
- Queue processed when quota available
- Priority ordering works

✅ **Cost Tracking**

- Costs recorded accurately
- Monthly spend calculated correctly
- Budget alerts triggered

✅ **Client Rate Limiting**

- Prevents excessive requests
- User-friendly error messages
- No memory leaks

---

## Support and Troubleshooting

For issues:

1. Check error logs in Supabase Dashboard
2. Review TESTING_PHASE_3_IMPLEMENTATION.md
3. Run validation queries from `scripts/validate-migrations.sql`
4. Check Edge Function logs

---

**Ready for Deployment** ✅
