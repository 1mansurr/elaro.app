# Database Setup Guide

## 🎯 Overview

This guide explains how to set up the ELARO database for local development and production deployment.

---

## 📋 Prerequisites

- Node.js and npm installed
- Supabase CLI installed: `npm install -g supabase`
- Access to the ELARO Supabase project
- Docker Desktop (for local development)

---

## 🚀 Setup Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ELARO-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Link to Supabase Project

Get your project reference from the Supabase dashboard (Settings → General → Reference ID):

```bash
# Link to the project
supabase link --project-ref YOUR_PROJECT_REF
```

When prompted, enter your database password.

### 4. Start Local Supabase (Optional)

For local development with Docker:

```bash
# Start local Supabase instance
supabase start

# This will:
# - Start PostgreSQL database
# - Start Supabase Studio (UI)
# - Apply all migrations
# - Create local development environment
```

### 5. Apply Migrations

For production or linked projects:

```bash
# Pull latest migrations from production
supabase db pull

# Or apply migrations directly
supabase db reset
```

---

## 📊 Database Schema

### Current Schema Location

The complete database schema is defined in:
- **`supabase/schema.sql`** - Complete schema dump (auto-generated)
- **`supabase/migrations/`** - Individual migration files

### Key Tables

| Table | Description |
|-------|-------------|
| `users` | User profiles with subscription info |
| `courses` | User's courses |
| `lectures` | Scheduled lectures |
| `assignments` | User assignments |
| `study_sessions` | Study sessions |
| `reminders` | All types of reminders |
| `notification_preferences` | User notification settings |
| `srs_schedules` | Spaced Repetition System schedules |
| `user_devices` | Push notification tokens |
| `streaks` | User activity streaks |
| `admin_actions` | Admin action logs |

### Important Functions

- `handle_new_user()` - Auto-creates user profile on signup
- `can_create_task()` - Checks monthly task limits
- `can_create_srs_reminders()` - Checks SRS reminder limits
- `get_home_screen_data_for_user()` - Fetches home screen data
- `count_tasks_since()` - Counts tasks in date range

### Triggers

- `on_auth_user_created` - Triggers on new user signup

---

## 🔧 Common Tasks

### View Current Schema

```bash
# Generate fresh schema dump
supabase db dump --schema-only -f supabase/schema.sql

# View specific table
supabase db dump --schema-only | grep "CREATE TABLE public.users"
```

### Create New Migration

```bash
# Make changes to your local database
# Then generate a migration
supabase db diff -f descriptive_migration_name
```

### Apply Migrations to Production

```bash
# Push migrations to production
supabase db push

# Or apply specific migration
supabase db push --include-all
```

### Reset Local Database

```bash
# Reset to clean state and apply all migrations
supabase db reset
```

### Connection Pooling

Supabase provides automatic connection pooling via **Supavisor** (built-in PgBouncer alternative).

#### Connection Modes:

##### 1. **Direct Connection** (Port 5432)
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres
```
**Use for:**
- Database migrations
- Admin tasks
- Long-running transactions
- Operations requiring session-level features

**Limitations:**
- Limited concurrent connections (based on plan)
- No connection pooling
- Higher resource usage

##### 2. **Transaction Mode Pooler** (Port 6543)
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```
**Use for:**
- Most application queries (RECOMMENDED)
- High-concurrency applications
- Serverless functions
- API endpoints

**Benefits:**
- Connection pooling enabled
- Higher concurrent connection limit
- Better performance under load
- Lower resource usage

**Limitations:**
- No session-level features (temp tables, prepared statements, etc.)
- Transactions must complete quickly

##### 3. **Session Mode Pooler** (Port 6543 with parameter)
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```
**Use for:**
- Applications needing session-level features
- Long-running queries
- Prepared statements

**Benefits:**
- Session-level features available
- Connection pooling enabled

**Trade-offs:**
- Fewer concurrent connections than transaction mode
- Higher resource usage than transaction mode

#### Configuration in Code:

##### Using Environment Variables:
```typescript
// .env
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres

// In your code
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
```

##### Direct PostgreSQL Connection:
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

#### Best Practices:

✅ **DO:**
- Use transaction mode pooler for application queries
- Use direct connection for migrations
- Set appropriate pool size limits
- Close connections when done
- Monitor connection usage
- Use connection timeouts

❌ **DON'T:**
- Use direct connections for high-concurrency apps
- Keep connections open indefinitely
- Exceed your plan's connection limits
- Use session mode when transaction mode suffices

#### Monitoring Connection Pool:

```sql
-- Check current connections
SELECT 
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity;

-- Connection pool settings
SHOW max_connections;
SHOW shared_buffers;
```

#### Troubleshooting:

**Issue: "Too many connections"**
- Switch to pooler connection string
- Reduce application pool size
- Upgrade Supabase plan

**Issue: "Connection timeout"**
- Check network connectivity
- Verify connection string
- Check if database is accessible

**Issue: "Prepared statement already exists"**
- Use transaction mode instead of session mode
- Clear prepared statements between queries

---

## 💾 Database Backup Strategy

### Supabase Automatic Backups

Supabase provides automatic backups based on your plan:

| Plan | Frequency | Retention | Point-in-Time Recovery |
|------|-----------|-----------|------------------------|
| Free | None | N/A | No |
| Pro | Daily | 7 days | No |
| Team | Hourly | 30 days | Yes (24 hours) |
| Enterprise | Custom | Custom | Yes (custom) |

**Access Backups:** Dashboard > Database > Backups

### Manual Backup Commands

#### Full Database Backup
```bash
# Backup everything (schema + data)
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# With compression
supabase db dump | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

#### Schema-Only Backup
```bash
# Before major migrations
supabase db dump --schema-only -f schema_backup_$(date +%Y%m%d).sql
```

#### Data-Only Backup
```bash
# For data migration testing
supabase db dump --data-only -f data_backup_$(date +%Y%m%d).sql
```

#### Specific Table Backup
```bash
# Backup specific tables
supabase db dump --table public.users --table public.courses -f partial_backup.sql
```

### Backup Schedule

#### Required Backups:
- ✅ **Before Production Deployment**: Full backup
- ✅ **Before Major Migrations**: Schema backup
- ✅ **Before Bulk Data Operations**: Data backup
- ✅ **Weekly**: Manual full backup to external storage

#### Backup Checklist:
```bash
# Pre-deployment backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"

mkdir -p $BACKUP_DIR

echo "Creating pre-deployment backup..."
supabase db dump -f "$BACKUP_DIR/pre_deploy_$DATE.sql"
gzip "$BACKUP_DIR/pre_deploy_$DATE.sql"

echo "Backup created: $BACKUP_DIR/pre_deploy_$DATE.sql.gz"
echo "Upload to secure storage before proceeding with deployment"
```

### Restore from Backup

#### Restore Full Backup:
```bash
# Stop application traffic first!

# Restore from backup file
supabase db reset
psql $DATABASE_URL < backup_file.sql

# Or using Supabase CLI
supabase db push --include-all < backup_file.sql
```

#### Restore Specific Tables:
```bash
# Extract specific table from backup
pg_restore -t users backup_file.sql | psql $DATABASE_URL
```

### Backup Best Practices

#### ✅ DO:
- Store backups in multiple locations (local + cloud)
- Test restore procedures regularly (quarterly)
- Encrypt sensitive backups
- Document backup locations
- Keep backups for at least 30 days
- Verify backup integrity after creation

#### ❌ DON'T:
- Store backups only on the same server
- Commit backups to version control
- Share backup files insecurely
- Skip backup verification
- Delete backups without retention policy

---

## 📊 Database Monitoring

### Supabase Dashboard Monitoring

#### Access Monitoring:
1. **Database Health**: Dashboard > Database > Health
   - Connection count
   - Database size
   - Active queries
   - Cache hit ratio

2. **Query Performance**: Dashboard > Database > Logs
   - Slow queries
   - Query execution time
   - Error logs
   - Connection logs

3. **Connection Pooler**: Dashboard > Database > Pooler
   - Active connections
   - Pool size
   - Wait time
   - Connection errors

### Key Metrics to Monitor

#### 1. Connection Metrics
```sql
-- Current active connections
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';

-- Connections by database
SELECT datname, count(*) as connections 
FROM pg_stat_activity 
GROUP BY datname;

-- Long-running queries (> 5 minutes)
SELECT 
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query,
  state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
AND state = 'active';
```

#### 2. Performance Metrics
```sql
-- Enable pg_stat_statements extension first
-- Dashboard > Database > Extensions > pg_stat_statements

-- Top 10 slowest queries
SELECT 
  substring(query, 1, 100) as short_query,
  round(mean_exec_time::numeric, 2) as avg_ms,
  calls,
  round(total_exec_time::numeric, 2) as total_ms
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Most frequently called queries
SELECT 
  substring(query, 1, 100) as short_query,
  calls,
  round(mean_exec_time::numeric, 2) as avg_ms
FROM pg_stat_statements 
ORDER BY calls DESC 
LIMIT 10;
```

#### 3. Storage Metrics
```sql
-- Database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - 
                 pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage statistics
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

#### 4. Cache Performance
```sql
-- Cache hit ratio (should be > 99%)
SELECT 
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit) as heap_hit,
  round(sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)), 4) * 100 as cache_hit_ratio
FROM pg_statio_user_tables;

-- Index cache hit ratio
SELECT 
  sum(idx_blks_read) as idx_read,
  sum(idx_blks_hit) as idx_hit,
  round(sum(idx_blks_hit) / (sum(idx_blks_hit) + sum(idx_blks_read)), 4) * 100 as idx_cache_hit_ratio
FROM pg_statio_user_indexes;
```

### Monitoring Alerts

#### Set Up Alerts for:

1. **High Connection Count** (> 80% of max)
2. **Slow Queries** (> 1 second average)
3. **Low Cache Hit Ratio** (< 95%)
4. **Database Size** (approaching limit)
5. **Failed Connections** (sudden spike)
6. **Long-running Transactions** (> 10 minutes)

### Monitoring Tools Integration

#### 1. Supabase Built-in Monitoring
- Real-time dashboard metrics
- Query logs
- Error tracking
- Resource usage

#### 2. External Tools (Optional)
- **Datadog**: APM and database monitoring
- **New Relic**: Performance monitoring
- **Sentry**: Error tracking
- **pgAnalyze**: PostgreSQL-specific monitoring

### Regular Monitoring Checklist

#### Daily:
- [ ] Check active connections
- [ ] Review slow query log
- [ ] Monitor error logs
- [ ] Verify backup completion

#### Weekly:
- [ ] Analyze query performance trends
- [ ] Review index usage
- [ ] Check database size growth
- [ ] Review cache hit ratios

#### Monthly:
- [ ] Optimize slow queries
- [ ] Clean up unused indexes
- [ ] Archive old data
- [ ] Review and update monitoring thresholds

---

## 🐛 Troubleshooting

### Issue: "No migrations found"

**Solution:**
- Ensure you're in the project root directory
- Verify the `supabase/migrations/` folder exists
- Check that migration files have the correct naming format: `YYYYMMDDHHMMSS_description.sql`

### Issue: "Connection refused"

**Solution:**
1. Verify your project reference is correct
2. Check your Supabase dashboard for the correct database URL
3. Ensure you have the correct database password
4. Check if Supabase local instance is running: `supabase status`

### Issue: "Permission denied"

**Solution:**
- Contact the project admin to get access to the Supabase project
- Verify your Supabase CLI is logged in: `supabase login`

### Issue: "Docker daemon not running"

**Solution:**
- Install Docker Desktop
- Start Docker Desktop
- Try `supabase start` again

### Issue: "Migration conflicts"

**Solution:**
```bash
# Check for conflicts
supabase db diff

# Resolve conflicts manually
# Then create a new migration
supabase db diff -f resolve_conflicts
```

---

## 🔐 Security Considerations

### Row Level Security (RLS)

All tables have RLS enabled with policies that:
- Restrict access to user's own data
- Allow admins to view all data
- Prevent unauthorized access

### Secrets Management

Never commit secrets to version control:
- Database passwords
- Service role keys
- API keys

Use Supabase secrets:
```bash
# Set secrets in Supabase dashboard
# Or use CLI
supabase secrets set SECRET_NAME=secret_value
```

---

## 📈 Schema Management Best Practices

### ✅ DO:

- **Always create migrations** for schema changes
- **Test migrations locally** before pushing to production
- **Use descriptive migration names** (e.g., `add_user_avatar_column`)
- **Review migrations** before applying to production
- **Backup production** before major schema changes
- **Document breaking changes** in migration comments

### ❌ DON'T:

- **Never modify** `supabase/schema.sql` directly (it's auto-generated)
- **Never skip migrations** - always apply them in order
- **Never delete migration files** from the migrations folder
- **Never apply untested migrations** to production
- **Never hardcode** database credentials in code

---

## 🔄 Migration Workflow

### Standard Workflow:

1. **Make changes locally**
   ```bash
   # Make changes to your local database via Supabase Studio or CLI
   ```

2. **Generate migration**
   ```bash
   supabase db diff -f add_new_feature
   ```

3. **Review migration**
   ```bash
   # Open the generated migration file
   # Verify the SQL is correct
   ```

4. **Test migration**
   ```bash
   # Reset local database and apply migration
   supabase db reset
   ```

5. **Commit migration**
   ```bash
   git add supabase/migrations/
   git commit -m "Add new feature migration"
   ```

6. **Apply to production**
   ```bash
   supabase db push
   ```

---

## 📚 Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)

---

## 🆘 Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review Supabase logs: `supabase logs`
3. Check Supabase documentation
4. Contact the development team

---

## 📝 Migration History

### Current Migrations:

- `20250102120000_create_rate_limits_table.sql` - Rate limiting table
- `20250102120001_setup_rate_limits_cleanup_cron.sql` - Rate limits cleanup cron
- `20251018113156_initial_schema.sql` - Initial database schema
- `20251020122813_add_user_creation_trigger.sql` - User creation trigger
- `20251020130000_fix_user_creation_trigger.sql` - Fix trigger permissions
- `20251020131000_update_handle_new_user.sql` - Update user creation function
- `20251021000000_add_subscription_status.sql` - Subscription status column
- `20251021000001_add_idempotency_keys.sql` - Idempotency keys table
- `20251021000002_setup_idempotency_cleanup_cron.sql` - Idempotency cleanup cron
- `20251022000000_add_courses_soft_delete.sql` - Courses soft delete support
- `20251022000001_add_account_lockout.sql` - Account lockout system
- `20251022000002_add_login_history.sql` - Login history tracking
- `20251022000003_add_reminder_enhancements.sql` - Timezone, quiet hours, priority, analytics
- `20251022000004_add_adaptive_srs.sql` - Adaptive SRS with SM-2 algorithm
- `20251022000005_add_notification_analytics.sql` - Notification delivery tracking & queue

---

## 🔐 Security Configuration

### Email Verification (CRITICAL - Manual Setup Required)

To enable email verification, configure in Supabase Dashboard:

1. **Navigate to:** Dashboard > Authentication > Providers > Email
2. **Scroll to:** "Email Confirmation" section
3. **Enable:** "Confirm email"
4. **Save changes**

This prevents users from signing up with fake emails and reduces spam accounts.

### Password Requirements

Password strength is already configured with:
- Minimum 8 characters
- Uppercase letter required
- Lowercase letter required
- Number required
- Special character required

---

---

## 🔔 Reminder & Scheduling Features

### Timezone Support
All reminders are now scheduled in the user's local timezone:
- User timezone is auto-detected on signup
- Reminders converted to user's local time
- Smart scheduling based on user engagement patterns

### Quiet Hours
Users can set do-not-disturb times:
- Configure start and end times
- Weekend notifications toggle
- Reminders automatically postponed during quiet hours

### Adaptive SRS (Spaced Repetition)
Implements SM-2 algorithm for optimal learning:
- Intervals adjust based on review quality (0-5 rating)
- Easier topics get longer intervals
- Difficult topics reviewed more frequently
- Tracks ease factor and performance over time

### Features Available
- ✅ Reminder cancellation
- ✅ Priority system (low, medium, high, urgent)
- ✅ Conflict detection
- ✅ Smart scheduling optimization
- ✅ Reminder history & analytics
- ✅ SRS performance tracking
- ✅ Progress visualization

---

## 🧪 Testing & Quality Assurance

### Integration Testing
Comprehensive test suite for 3rd party services:

```bash
# Run all integration tests
npm run test:integration

# Run unit tests
npm run test:unit

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

**Tests Cover:**
- ✅ Supabase connectivity and configuration
- ✅ Health check system functionality
- ✅ Mixpanel integration and fallbacks
- ✅ RevenueCat error handling
- ✅ API version compatibility
- ✅ Timeout protection
- ✅ Environment variable configuration

### API Version Checking
Automatic compatibility verification on app startup:
- ✅ Checks backend API version on launch
- ✅ Alerts users if update required
- ✅ Recommends updates for new features
- ✅ Prevents breaking change issues
- ✅ Graceful fallback if check fails

**Version Policy:**
- Minimum API Version: 1.0.0
- Maximum API Version: 2.0.0 (breaking)
- App auto-checks on every launch
- Users prompted to update if incompatible

---

## 🔔 Notification System Features

### Delivery Tracking & Analytics
Comprehensive tracking of notification performance:
- ✅ Delivery confirmation (via Expo receipts)
- ✅ Open/click tracking
- ✅ Engagement metrics by type
- ✅ Best time to send analysis
- ✅ Invalid token cleanup

### Notification Queue & Batching
Smart queueing system for reliable delivery:
- ✅ Priority-based processing (1-10 scale)
- ✅ Automatic retry with exponential backoff
- ✅ Batch processing for efficiency
- ✅ Scheduled delivery support
- ✅ Failed notification recovery

### Interactive Notifications
Action buttons for quick responses:
- ✅ Assignment: Complete, Snooze
- ✅ SRS Review: Review Now, Later
- ✅ Lecture: View Details, Dismiss
- ✅ Daily Summary: View Tasks

### Notification Channels (Android)
Organized notification groups:
- ✅ Tasks & Assignments (high priority)
- ✅ Learning & Reviews (normal priority)
- ✅ Daily Summaries (low priority)
- ✅ Custom vibration patterns per type

---

---

## 🔧 Supabase Dashboard Configuration

### Required Manual Steps

#### 1. Enable Email Verification (CRITICAL)
```
Dashboard > Authentication > Providers > Email
☑ Enable "Confirm email"
☑ Require email verification
```

#### 2. Configure Alerts (Recommended)
```
Dashboard > Settings > Notifications
☑ Database usage > 80%
☑ Auth error spikes
☑ Edge Function failures  
☑ Long-running queries
☑ Connection pool exhaustion
```

#### 3. Enable pg_stat_statements (Performance Monitoring)
```
Dashboard > Database > Extensions
☑ Enable pg_stat_statements
```

#### 4. Configure Automatic Backups
```
Dashboard > Database > Backups
☑ Enable automatic backups (based on plan tier)
☑ Set retention period
☑ Test restore procedure
```

---

**Last Updated:** October 22, 2025  
**Schema Version:** 1.5.0  
**Status:** ✅ Production Ready  
**Migrations:** 15 (all synced)  
**Features:** Enterprise-grade security, monitoring, and analytics

