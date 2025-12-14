# Migration Application Guide

## 🎯 Overview

This guide provides step-by-step instructions for applying pending database migrations when connectivity is restored.

---

## ⚠️ Prerequisites

- Database connectivity to Supabase restored
- Supabase CLI installed and configured
- Appropriate access permissions

---

## 📋 Phase 1: Apply Pending Migrations

### Step 1: Verify Migration Status

```bash
# Check which migrations are pending
supabase migration list

# Expected output should show:
# - 20251102000001_schedule_cleanup_deleted_items.sql (Local only)
# - 20251102000002_fix_deprecated_function_permissions.sql (Local only)
```

### Step 2: Apply Migrations

```bash
# Apply all pending migrations
supabase db push

# Alternative: Apply specific migration
supabase migration up 20251102000001
supabase migration up 20251102000002
```

### Step 3: Verify Application Success

```bash
# Check migration list again
supabase migration list

# All migrations should now show as "Local | Remote"
```

---

## ✅ Phase 2: Verify Cleanup Cron Job

### Step 1: Check if Cron Job Exists

Run in Supabase SQL Editor:

```sql
SELECT
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname = 'cleanup-deleted-items';
```

**Expected Result:**

- 1 row returned
- `jobname` = 'cleanup-deleted-items'
- `schedule` = '0 2 \* \* \*' (daily at 2 AM UTC)
- `active` = true

### Step 2: Verify pg_cron Extension

```sql
-- Check if pg_cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- If missing, enable it:
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;
```

### Step 3: Manual Schedule (If Needed)

If the cron job doesn't exist after migration, manually schedule it:

```sql
-- Ensure CRON_SECRET is set in Supabase Vault
SELECT cron.schedule(
  'cleanup-deleted-items',
  '0 2 * * *', -- Daily at 2:00 AM UTC
  $$
  SELECT
    net.http_post(
      url := 'https://oqwyoucchbjiyddnznwf.supabase.co/functions/v1/cleanup-deleted-items',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
      )
    ) AS request_id;
  $$
);
```

---

## ✅ Phase 3: Verify Function Permissions

### Step 1: Check Function Permissions

Run in Supabase SQL Editor:

```sql
SELECT
  has_function_privilege('service_role', 'public.check_and_send_reminders()', 'EXECUTE') as can_execute,
  has_function_privilege('service_role', 'public.check_and_send_reminders()', 'ALTER') as can_alter,
  has_function_privilege('service_role', 'public.check_and_send_reminders()', 'DROP') as can_drop;
```

**Expected Result:**

- `can_execute` = **true**
- `can_alter` = **false**
- `can_drop` = **false**

### Step 2: Verify Function Comment

```sql
SELECT
  obj_description(oid, 'pg_proc') as comment
FROM pg_proc
WHERE proname = 'check_and_send_reminders';
```

**Expected Result:**
Comment should mention "GRANT EXECUTE only" and security best practices.

---

## ✅ Phase 4: Run Migration Status Check

### Step 1: Execute Diagnostic Script

1. Open Supabase SQL Editor
2. Copy contents of `scripts/check-migration-status.sql`
3. Paste and execute
4. Review results for each migration

### Step 2: Interpret Results

- **✅ Applied**: Migration is active
- **❌ Missing**: Migration needs to be applied
- **⚠️**: Review manually

### Step 3: Apply Missing Migrations

For any migrations showing as "Missing":

```bash
# Identify the migration version from the script output
# Then apply:
supabase migration up <migration_version>
```

---

## 🔧 Troubleshooting

### Issue: "duplicate key value violates unique constraint"

**Cause**: Migration already applied on remote, but local status is out of sync.

**Solution**:

```bash
# Repair migration history
supabase migration repair --status applied <migration_version>
```

### Issue: "Remote migration versions not found in local migrations"

**Cause**: Local git repo out of sync with remote database.

**Solution**:

```bash
# Option 1: Pull remote migrations
supabase db pull

# Option 2: Repair specific migration
supabase migration repair --status applied <migration_version>
```

### Issue: Connection timeout

**Cause**: Network connectivity issue or Supabase service issue.

**Solution**:

1. Check Supabase dashboard for service status
2. Verify network connection
3. Wait and retry
4. Check firewall/VPN settings

### Issue: Cron job doesn't appear after migration

**Cause**: pg_cron extension not enabled or migration didn't execute fully.

**Solution**:

1. Verify pg_cron extension: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
2. If missing: `CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;`
3. Re-run migration or manually schedule (see Phase 2, Step 3)

### Issue: Function permissions not updated

**Cause**: Migration didn't execute or permissions were manually changed.

**Solution**:

1. Verify migration was applied: `supabase migration list`
2. Manually fix permissions:
   ```sql
   REVOKE ALL ON FUNCTION "public"."check_and_send_reminders"() FROM "service_role";
   GRANT EXECUTE ON FUNCTION "public"."check_and_send_reminders"() TO "service_role";
   ```

---

## 📊 Verification Checklist

After applying migrations, verify:

- [ ] All migrations show as "Local | Remote" in `supabase migration list`
- [ ] Cleanup cron job exists and is active
- [ ] Function permissions are correct (EXECUTE only, no ALTER/DROP)
- [ ] Migration status check script passes all checks
- [ ] No errors in Supabase logs

---

## 📚 Related Documentation

- `FINAL_ISSUES_FIX_IMPLEMENTATION.md` - Implementation summary
- `scripts/check-migration-status.sql` - Migration verification script
- `docs/COMPLIANCE/DATA_RETENTION_POLICY.md` - Data retention policy
- `supabase/migrations/20251102000001_schedule_cleanup_deleted_items.sql` - Cleanup cron migration
- `supabase/migrations/20251102000002_fix_deprecated_function_permissions.sql` - Permissions fix migration

---

## 🎯 Next Steps

After migrations are applied:

1. Monitor cleanup job execution (check logs after 2 AM UTC)
2. Run template count monitoring monthly: `scripts/monitor-template-count.sql`
3. Review retention policy effectiveness quarterly
4. Continue with Phase 2-4 of implementation plan

---

**Last Updated**: November 2, 2025  
**Status**: Ready for execution when connectivity restored
