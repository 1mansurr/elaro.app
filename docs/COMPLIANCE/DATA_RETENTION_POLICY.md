# Data Retention Policy Documentation

## 🎯 Overview

The ELARO application implements a two-tier data retention system for soft-deleted records, ensuring efficient database storage while providing appropriate data recovery windows based on user subscription tiers.

---

## 📋 Primary System: Edge Function (Tier-Based Retention)

### **Function**: `cleanup-deleted-items`

**Location**: `supabase/functions/cleanup-deleted-items/index.ts`

### **Retention Periods**

| User Tier            | Retention Period   | When Items Are Permanently Deleted |
| -------------------- | ------------------ | ---------------------------------- |
| **Free**             | 48 hours (2 days)  | Items soft-deleted > 48 hours ago  |
| **Premium (Oddity)** | 120 hours (5 days) | Items soft-deleted > 120 hours ago |

### **How It Works**

1. **Runs Daily** at 2:00 AM UTC (via cron job)
2. **Fetches All Users** with their subscription tier information
3. **Calculates Retention** based on each user's tier
4. **Permanently Deletes** soft-deleted items older than retention period
5. **Processes Tables**: `courses`, `assignments`, `lectures`, `study_sessions`

### **Scheduling**

The cleanup function is scheduled via PostgreSQL cron (`pg_cron`):

```sql
-- Migration: 20251102000001_schedule_cleanup_deleted_items.sql
SELECT cron.schedule(
  'cleanup-deleted-items',
  '0 2 * * *', -- Daily at 2:00 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://oqwyoucchbjiyddnznwf.supabase.co/functions/v1/cleanup-deleted-items',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key', true)
    )
  );
  $$
);
```

### **Verification**

Check if the cron job is scheduled:

```sql
SELECT * FROM cron.job WHERE jobname = 'cleanup-deleted-items';
```

### **Safety Features**

✅ **User Isolation**: Only processes items belonging to each specific user  
✅ **Soft Delete Only**: Only removes items that are already soft-deleted (`deleted_at IS NOT NULL`)  
✅ **Fault Tolerance**: Continues processing even if individual operations fail  
✅ **Tier-Based**: Respects user subscription for appropriate retention periods

---

## 🔧 Secondary System: Database Function (Utility)

### **Function**: `cleanup_old_soft_deleted_records()`

**Location**: Migration `20251022000009_centralized_soft_delete_strategy.sql`

### **Usage**

```sql
-- Clean up old soft-deleted records from any table
SELECT cleanup_old_soft_deleted_records('assignments', 30); -- 30 days retention
SELECT cleanup_old_soft_deleted_records('lectures', 30);
SELECT cleanup_old_soft_deleted_records('study_sessions', 30);
SELECT cleanup_old_soft_deleted_records('courses', 30);
```

### **Default Retention**

- **Default**: 30 days
- **Configurable**: Can specify custom retention period per call
- **Purpose**: Manual cleanup utility, backup cleanup method, or for admin operations

### **When to Use**

- **Manual Cleanup**: Admin-initiated cleanup operations
- **Emergency Cleanup**: Need to clean specific tables immediately
- **Backup Method**: If Edge Function cron job fails
- **One-off Operations**: Custom retention periods for specific use cases

---

## 📊 Retention Policy Summary

### **Current Active System**

✅ **Primary**: Edge Function `cleanup-deleted-items`

- **Schedule**: Daily at 2 AM UTC
- **Retention**: 48h (free) / 120h (premium)
- **Automated**: Yes

⚠️ **Secondary**: Database Function `cleanup_old_soft_deleted_records()`

- **Schedule**: Manual/Admin-triggered
- **Retention**: 30 days default (configurable)
- **Automated**: No

### **Tables Covered**

Both systems handle these tables:

- `courses`
- `assignments`
- `lectures`
- `study_sessions`

### **Important Notes**

1. **Edge Function is Primary**: The daily cron job (Edge Function) is the main automated cleanup system
2. **Database Function is Utility**: Use for manual operations or as a backup method
3. **Retention Periods Differ**: Edge Function uses tier-based retention (48h/120h), Database Function uses 30 days default
4. **Both Are Safe**: Both only delete items already soft-deleted (safe to run both if needed)

---

## 🔍 Monitoring & Verification

### **Check Cron Job Status**

```sql
-- Verify cleanup cron job is scheduled
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname = 'cleanup-deleted-items';
```

### **Check Edge Function Logs**

```bash
supabase functions logs cleanup-deleted-items
```

### **Manual Testing**

```bash
# Test the cleanup function manually
supabase functions invoke cleanup-deleted-items
```

### **Check Soft-Deleted Records**

```sql
-- Count soft-deleted records by table
SELECT
  'assignments' as table_name,
  COUNT(*) as soft_deleted_count,
  MIN(deleted_at) as oldest_deletion,
  MAX(deleted_at) as newest_deletion
FROM assignments
WHERE deleted_at IS NOT NULL

UNION ALL

SELECT
  'courses' as table_name,
  COUNT(*) as soft_deleted_count,
  MIN(deleted_at) as oldest_deletion,
  MAX(deleted_at) as newest_deletion
FROM courses
WHERE deleted_at IS NOT NULL

UNION ALL

SELECT
  'lectures' as table_name,
  COUNT(*) as soft_deleted_count,
  MIN(deleted_at) as oldest_deletion,
  MAX(deleted_at) as newest_deletion
FROM lectures
WHERE deleted_at IS NOT NULL

UNION ALL

SELECT
  'study_sessions' as table_name,
  COUNT(*) as soft_deleted_count,
  MIN(deleted_at) as oldest_deletion,
  MAX(deleted_at) as newest_deletion
FROM study_sessions
WHERE deleted_at IS NOT NULL;
```

---

## 🛠️ Maintenance

### **If Cron Job Fails**

1. **Check Logs**: `supabase functions logs cleanup-deleted-items`
2. **Verify Schedule**: Run verification SQL above
3. **Manual Cleanup**: Use database function as backup
4. **Re-schedule**: If cron job missing, re-run migration `20251102000001_schedule_cleanup_deleted_items.sql`

### **Adjusting Retention Periods**

To change retention periods, edit `supabase/functions/cleanup-deleted-items/index.ts`:

```typescript
const RETENTION_PERIOD_FREE_HOURS = 48; // Change as needed
const RETENTION_PERIOD_PREMIUM_HOURS = 120; // Change as needed
```

Then redeploy the function:

```bash
supabase functions deploy cleanup-deleted-items
```

---

## 📚 Related Documentation

- `TRASH_CAN_CLEANUP_DEPLOYMENT.md` - Original deployment guide
- `supabase/functions/cleanup-deleted-items/index.ts` - Edge Function source
- `supabase/migrations/20251022000009_centralized_soft_delete_strategy.sql` - Database function
- `supabase/migrations/20251102000001_schedule_cleanup_deleted_items.sql` - Cron scheduling

---

**Last Updated**: November 2, 2025  
**Status**: ✅ Active  
**Primary System**: Edge Function (Automated)  
**Secondary System**: Database Function (Manual)
