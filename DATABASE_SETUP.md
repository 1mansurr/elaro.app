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

### Backup Production Data

```bash
# Backup production database
supabase db dump --data-only -f backup.sql

# Backup schema only
supabase db dump --schema-only -f schema_backup.sql
```

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

- `20251018113156_initial_schema.sql` - Initial database schema
- `20251020122813_add_user_creation_trigger.sql` - User creation trigger
- `20251020130000_fix_user_creation_trigger.sql` - Fix trigger permissions
- `20251020131000_update_handle_new_user.sql` - Update user creation function

---

**Last Updated:** October 20, 2025
**Schema Version:** 1.0.0
**Status:** ✅ Production Ready

