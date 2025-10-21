# Deployment Guide: Schema Fix

## 🎯 Quick Start

This guide walks you through deploying the subscription_status column fix to your database.

## 📋 Prerequisites

- [ ] Supabase CLI installed
- [ ] Linked to your Supabase project
- [ ] Database credentials available
- [ ] Backup of production database (recommended)

---

## 🚀 Deployment Steps

### Step 1: Verify Your Setup

```bash
cd /Users/new/Desktop/Biz/ELARO/ELARO-app

# Check if linked to Supabase project
supabase status

# Should show your project details
```

### Step 2: Review the Migration

The migration file is located at:
```
supabase/migrations/20251021000000_add_subscription_status.sql
```

**What it does:**
- ✅ Adds `subscription_status` column to `users` table
- ✅ Backfills data for existing users
- ✅ Creates index for performance
- ✅ Adds check constraints for data integrity

**Review the file** to ensure it looks correct before applying.

### Step 3: Apply the Migration

#### Option A: Push to Remote Database (Recommended)

```bash
# This applies only new migrations
supabase db push
```

**Expected output:**
```
Applying migration 20251021000000_add_subscription_status.sql...
✓ Migration applied successfully
```

#### Option B: Reset Database (Development Only)

```bash
# WARNING: This resets the entire database
# Only use in development/staging
supabase db reset
```

### Step 4: Verify the Migration

```bash
# Check that the column exists
supabase db diff

# Should show no differences if migration applied correctly
```

Or query directly:

```sql
-- Run in Supabase SQL Editor
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'subscription_status';

-- Should return:
-- column_name: subscription_status
-- data_type: text
-- is_nullable: YES
```

### Step 5: Verify Data Backfill

```sql
-- Check that existing users have correct status
SELECT 
  email,
  subscription_tier,
  subscription_status,
  subscription_expires_at
FROM users
WHERE subscription_status IS NOT NULL;
```

**Expected results:**
- Users with active oddity tier: `subscription_status = 'active'`
- Users on free trial: `subscription_status = 'trialing'`
- Users with expired subscription: `subscription_status = 'expired'`

### Step 6: Deploy Updated Edge Functions

```bash
# Deploy the RevenueCat webhook with subscription_status updates
supabase functions deploy revenuecat-webhook

# Deploy the trial function with subscription_status
supabase functions deploy start-user-trial

# Verify deployments
supabase functions list
```

**Expected output:**
```
✓ revenuecat-webhook deployed
✓ start-user-trial deployed
```

### Step 7: Test the Fix

#### Test 1: Trial Banner

```bash
# Run the app
npx expo start

# As a user with active trial:
# 1. Open HomeScreen
# 2. Trial banner should appear if < 3 days remaining
# 3. Check console for: "📱 Using cached user profile"
```

#### Test 2: Start New Trial

```bash
# In the app, as a free user:
# 1. Navigate to a screen that triggers trial start
# 2. Check console for: "Trial started successfully"
# 3. Query database to verify subscription_status = 'trialing'
```

```sql
-- Check the user's new status
SELECT subscription_tier, subscription_status, subscription_expires_at
FROM users
WHERE id = 'YOUR_USER_ID';
```

#### Test 3: RevenueCat Webhook

```bash
# Trigger a test webhook from RevenueCat dashboard
# Or use curl:

curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/revenuecat-webhook \
  -H "Authorization: YOUR_REVENUECAT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "api_version": "1.0",
    "event": {
      "type": "INITIAL_PURCHASE",
      "app_user_id": "test-user-id",
      "product_id": "oddity_monthly",
      ...
    }
  }'

# Check logs
supabase functions logs revenuecat-webhook
```

---

## 🔍 Verification Queries

### Check Column Exists

```sql
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.columns 
  WHERE table_name = 'users' 
  AND column_name = 'subscription_status'
) as column_exists;
```

Should return: `true`

### Check Constraints

```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
AND conname LIKE '%subscription_status%';
```

Should show the CHECK constraint with allowed values.

### Check Index

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users'
AND indexname = 'idx_users_subscription_status';
```

Should show the index definition.

### Check Data Integrity

```sql
-- Should return 0 (no invalid values)
SELECT COUNT(*) 
FROM users 
WHERE subscription_status NOT IN ('trialing', 'active', 'past_due', 'canceled', 'expired')
AND subscription_status IS NOT NULL;
```

---

## 🚨 Rollback Plan

If something goes wrong, you can rollback:

### Rollback Migration

```sql
-- Remove the column
ALTER TABLE users DROP COLUMN IF EXISTS subscription_status;

-- Drop the index
DROP INDEX IF EXISTS idx_users_subscription_status;
```

### Revert Edge Functions

```bash
# Re-deploy previous versions from git
git checkout HEAD~1 supabase/functions/revenuecat-webhook/index.ts
git checkout HEAD~1 supabase/functions/start-user-trial/index.ts

# Deploy previous versions
supabase functions deploy revenuecat-webhook
supabase functions deploy start-user-trial
```

---

## 📊 Success Criteria

All of these should be true after deployment:

- [ ] Migration applied without errors
- [ ] `subscription_status` column exists in `users` table
- [ ] Existing users have correct status values
- [ ] Index created successfully
- [ ] Edge functions deployed successfully
- [ ] Trial banner shows for trialing users
- [ ] No TypeScript errors in app
- [ ] No database constraint violations
- [ ] RevenueCat webhook updates status correctly
- [ ] Sentry receives unhandled promise rejections

---

## 🐛 Common Issues

### Migration Error: Column already exists

**Cause:** Migration already partially applied

**Solution:**
```sql
-- The migration uses IF NOT EXISTS, so this shouldn't happen
-- But if it does, you can skip this migration
```

### Edge Function Deploy Fails

**Cause:** Syntax error or missing dependencies

**Solution:**
```bash
# Check function logs
supabase functions logs FUNCTION_NAME --tail

# Fix errors and redeploy
supabase functions deploy FUNCTION_NAME
```

### Users Have NULL status

**Cause:** Backfill logic didn't run or users don't match conditions

**Solution:**
```sql
-- Manually set status for specific users
UPDATE users 
SET subscription_status = 'active'
WHERE subscription_tier = 'oddity' 
AND subscription_expires_at > NOW()
AND subscription_status IS NULL;
```

---

## 📞 Support

If you encounter issues:

1. Check Supabase logs: `supabase functions logs`
2. Check app console for errors
3. Verify database connection
4. Review migration file for syntax errors
5. Check Sentry for production errors

---

**Created:** October 21, 2025  
**Migration File:** `20251021000000_add_subscription_status.sql`  
**Estimated Deployment Time:** 5-10 minutes  
**Downtime Required:** None  
**Risk Level:** Low (non-breaking change)

