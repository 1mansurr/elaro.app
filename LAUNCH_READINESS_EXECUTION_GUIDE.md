# Launch Readiness - Execution Guide

## Overview

This guide provides step-by-step instructions to fix the 3 critical gaps blocking launch. **Estimated time: 25-30 minutes.**

---

## ✅ Step 1: Apply Database Migrations (5 minutes)

### Action Required

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com
   - Select your project: `oqwyoucchbjiyddnznwf`
   - Navigate to: **SQL Editor** (left sidebar)

2. **Apply Complete Migrations**
   - Open file: `apply_audit_migrations_complete.sql`
   - Copy the **entire** file contents
   - Paste into SQL Editor
   - Click **Run** (or press `Cmd+Enter` / `Ctrl+Enter`)

3. **Verify Migrations**
   - Open file: `verify_migrations.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click **Run**
   - Check results: All checks should show ✅ PASS

### Expected Results

- ✅ 7 tables created
- ✅ 8 functions created
- ✅ RLS policies enabled on all tables
- ✅ No errors in SQL Editor

### Troubleshooting

If you see errors:
- **"relation already exists"**: Some tables may already exist. Check which ones and skip those sections.
- **"permission denied"**: Ensure you're using the service role key or have admin access.
- **"function already exists"**: Some functions may already exist. That's okay - the migration uses `CREATE OR REPLACE`.

---

## ✅ Step 2: Verify Quota Limits (15-20 minutes)

### 2.1 Verify Supabase Limits

1. **Go to Supabase Dashboard**
   - URL: https://app.supabase.com/project/oqwyoucchbjiyddnznwf
   - Navigate to: **Settings** → **Billing** → **Plan**
   - Note your plan name (Free, Pro, Team, Enterprise)

2. **Find API Call Limits**
   - Navigate to: **Settings** → **Billing** → **Usage**
   - Look for "API Requests" or "Database API Calls"
   - Note the **daily limit**

3. **Common Limits** (for reference):
   - **Free**: 50,000 API calls/day
   - **Pro**: 500,000 API calls/day
   - **Team**: 5,000,000 API calls/day

### 2.2 Verify Expo Push Limits

1. **Go to Expo Dashboard**
   - URL: https://expo.dev
   - Navigate to: **Account Settings** → **Billing**
   - Note your plan name

2. **Find Push Notification Limits**
   - Navigate to: **Account Settings** → **Usage**
   - Look for "Push Notifications" or "Expo Push Notification Service"
   - Note the **daily limit**

3. **Common Limits** (for reference):
   - **Free**: 10,000 notifications/day
   - **Production**: 1,000,000 notifications/day

### 2.3 Verify RevenueCat Limits

1. **Go to RevenueCat Dashboard**
   - URL: https://app.revenuecat.com
   - Select your project
   - Navigate to: **Project Settings** → **Billing**
   - Note your plan name (Free, Pro, Enterprise)

2. **Find API Call Limits**
   - Navigate to: **Project Settings** → **Usage**
   - Look for "API Calls" or "Requests"
   - Note the **monthly limit**

3. **Common Limits** (for reference):
   - **Free**: 10,000 API calls/month
   - **Pro**: 100,000 API calls/month

### 2.4 Update Configuration Files

After verifying limits, update these files:

#### File 1: `supabase/functions/_shared/quota-monitor.ts`

Update lines 32-59 with your verified values:

```typescript
const QUOTA_CONFIGS: QuotaConfig[] = [
  { 
    serviceName: 'supabase', 
    quotaType: 'daily', 
    limit: YOUR_VERIFIED_LIMIT, // Replace with actual limit from dashboard
    // Plan: [YOUR PLAN NAME - e.g., "Free", "Pro"]
    // Source: https://app.supabase.com/project/oqwyoucchbjiyddnznwf/settings/billing
    // Last verified: 2025-01-31
    // Verified by: [YOUR NAME]
  },
  { 
    serviceName: 'expo_push', 
    quotaType: 'daily', 
    limit: YOUR_VERIFIED_LIMIT, // Replace with actual limit from dashboard
    // Plan: [YOUR PLAN NAME - e.g., "Free", "Production"]
    // Source: [LINK TO YOUR EXPO DASHBOARD]
    // Last verified: 2025-01-31
    // Verified by: [YOUR NAME]
  },
  { 
    serviceName: 'revenuecat', 
    quotaType: 'monthly', 
    limit: YOUR_VERIFIED_LIMIT, // Replace with actual limit from dashboard
    // Plan: [YOUR PLAN NAME - e.g., "Free", "Pro"]
    // Source: [LINK TO YOUR REVENUECAT DASHBOARD]
    // Last verified: 2025-01-31
    // Verified by: [YOUR NAME]
  },
];
```

**Important**: 
- Remove all `TODO` comments
- Replace `YOUR_VERIFIED_LIMIT` with actual numbers
- Fill in all placeholders (`[YOUR PLAN NAME]`, `[YOUR NAME]`, etc.)
- Add verification dates

#### File 2: `QUOTA_LIMITS.md`

Update the "Current Configuration" section with your verified values:

```markdown
### Supabase
- **Plan**: [YOUR ACTUAL PLAN NAME]
- **Daily API Calls**: [YOUR VERIFIED LIMIT]
- **Last Verified**: 2025-01-31
- **Verified By**: [YOUR NAME]
- **Source**: https://app.supabase.com/project/oqwyoucchbjiyddnznwf/settings/billing
- **Configuration File**: `supabase/functions/_shared/quota-monitor.ts` (line 35)

### Expo Push Notifications
- **Plan**: [YOUR ACTUAL PLAN NAME]
- **Daily Notifications**: [YOUR VERIFIED LIMIT]
- **Last Verified**: 2025-01-31
- **Verified By**: [YOUR NAME]
- **Source**: [LINK TO YOUR EXPO DASHBOARD]

### RevenueCat
- **Plan**: [YOUR ACTUAL PLAN NAME]
- **Monthly API Calls**: [YOUR VERIFIED LIMIT]
- **Last Verified**: 2025-01-31
- **Verified By**: [YOUR NAME]
- **Source**: [LINK TO YOUR REVENUECAT DASHBOARD]
```

### 2.5 Test Quota Monitoring

After updating, verify in Supabase SQL Editor:

```sql
-- Check current quota usage
SELECT 
  service_name,
  quota_type,
  usage_count,
  quota_limit,
  ROUND((usage_count::NUMERIC / quota_limit::NUMERIC) * 100, 2) as percentage
FROM api_quota_usage
WHERE date = CURRENT_DATE
ORDER BY percentage DESC;
```

Expected: You should see rows for all 3 services with correct limits

---

## ✅ Step 3: Schedule Monitoring Functions (5 minutes)

### Action Required

You have two options:

### Option A: Using SQL (Recommended)

1. **Open Supabase Dashboard → SQL Editor**

2. **Apply Scheduling Migration**
   - Open file: `supabase/migrations/20250131000005_schedule_monitoring_functions.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click **Run**

3. **Verify Schedules**
   - Run this query:

```sql
SELECT 
  jobname,
  schedule,
  active,
  CASE 
    WHEN jobname = 'check-policy-accessibility-daily' THEN 'Check Privacy Policy and Terms URLs accessibility'
    WHEN jobname = 'monitor-storage-daily' THEN 'Monitor storage usage against Free Plan limits'
    WHEN jobname = 'monitor-edge-functions-daily' THEN 'Check for high-frequency and high-error-rate functions'
    ELSE 'Unknown'
  END as description
FROM cron.job
WHERE jobname IN (
  'check-policy-accessibility-daily',
  'monitor-storage-daily',
  'monitor-edge-functions-daily'
)
ORDER BY jobname;
```

Expected: 3 rows, all with `active = true`

### Option B: Using Dashboard UI

1. **Go to Supabase Dashboard**
   - Navigate to: **Database** → **Cron Jobs** (or **Edge Functions** → **Scheduled Functions**)

2. **Schedule Function 1: check-policy-accessibility**
   - Click: **Add Schedule** / **New Cron Job**
   - **Function**: `check-policy-accessibility`
   - **Schedule**: `0 2 * * *` (Daily at 2 AM UTC)
   - **Description**: "Check Privacy Policy and Terms URLs accessibility"
   - **Save**

3. **Schedule Function 2: monitor-storage**
   - Click: **Add Schedule**
   - **Function**: `monitor-storage`
   - **Schedule**: `0 3 * * *` (Daily at 3 AM UTC)
   - **Description**: "Monitor storage usage against Free Plan limits"
   - **Save**

4. **Schedule Function 3: monitor-edge-functions**
   - Click: **Add Schedule**
   - **Function**: `monitor-edge-functions`
   - **Schedule**: `0 4 * * *` (Daily at 4 AM UTC)
   - **Description**: "Check for high-frequency and high-error-rate functions"
   - **Save**

### Test Manual Execution

Test each function to ensure they work:

1. Go to: **Edge Functions** → `check-policy-accessibility`
2. Click: **Invoke Function**
3. Check logs: Should show success
4. Repeat for `monitor-storage` and `monitor-edge-functions`

---

## ✅ Verification Checklist

After completing all steps, verify:

### Database Migrations
- [ ] All 7 tables exist (run `verify_migrations.sql`)
- [ ] All 8 functions exist
- [ ] RLS policies enabled on all tables
- [ ] No errors in SQL Editor

### Quota Limits
- [ ] `quota-monitor.ts` updated with verified limits
- [ ] All `TODO` comments removed
- [ ] `QUOTA_LIMITS.md` updated with verification dates
- [ ] Quota usage query returns correct limits

### Monitoring Schedules
- [ ] All 3 functions scheduled (check with verification query)
- [ ] Schedules set to correct times (2 AM, 3 AM, 4 AM UTC)
- [ ] Functions can be invoked manually
- [ ] No errors in function logs

---

## 🎯 Final Status

Once all 3 steps are complete:

- ✅ **Launch Readiness**: 100%
- ✅ **All Monitoring Systems**: Active
- ✅ **All Alerts**: Configured
- ✅ **Ready for Production Launch**

---

## 📁 Files Reference

### SQL Files to Run
1. `apply_audit_migrations_complete.sql` - Apply all database migrations
2. `verify_migrations.sql` - Verify migrations were applied correctly
3. `supabase/migrations/20250131000005_schedule_monitoring_functions.sql` - Schedule monitoring functions

### Files to Update
1. `supabase/functions/_shared/quota-monitor.ts` - Update quota limits (lines 32-59)
2. `QUOTA_LIMITS.md` - Update documentation with verified limits

### Dashboards to Check
1. Supabase: https://app.supabase.com/project/oqwyoucchbjiyddnznwf/settings/billing
2. Expo: https://expo.dev → Account Settings → Usage
3. RevenueCat: https://app.revenuecat.com → Project Settings → Usage

---

## 🆘 Need Help?

If you encounter errors:
1. Check the error message in SQL Editor
2. Verify your Supabase project has the required permissions
3. Ensure you're using the correct project reference (`oqwyoucchbjiyddnznwf`)
4. Check that `pg_cron` extension is enabled

For quota limits verification:
- See `QUOTA_VERIFICATION_GUIDE.md` for detailed instructions
- Check service documentation if limits aren't clear
- Contact service support if unsure

