# Database Migrations Guide

## Overview

This guide covers database migration procedures, best practices, and troubleshooting for the ELARO application.

## Migration Workflow

### Standard Workflow

1. **Make changes locally**
   ```bash
   # Make changes to your local database via Supabase Studio or CLI
   ```

2. **Generate migration**
   ```bash
   supabase db diff -f descriptive_migration_name
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

## Applying Migrations

### Quick Apply

```bash
# Push all migrations to production
supabase db push
```

### Verify Migrations Applied

```sql
-- Check migration history
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC LIMIT 10;

-- Verify specific migration
SELECT * FROM supabase_migrations.schema_migrations 
WHERE version = '20250131000005';
```

## Migration Best Practices

### ✅ DO

- **Always create migrations** for schema changes
- **Test migrations locally** before pushing to production
- **Use descriptive migration names** (e.g., `add_user_avatar_column`)
- **Review migrations** before applying to production
- **Backup production** before major schema changes
- **Document breaking changes** in migration comments

### ❌ DON'T

- **Never modify** `supabase/schema.sql` directly (it's auto-generated)
- **Never skip migrations** - always apply them in order
- **Never delete migration files** from the migrations folder
- **Never apply untested migrations** to production
- **Never hardcode** database credentials in code

## Troubleshooting

### Migration Conflicts

**Issue: Migration conflicts**

```bash
# Check for conflicts
supabase db diff

# Resolve conflicts manually
# Then create new migration
supabase db diff -f resolve_conflicts
```

### Migration Fails

**Issue: Migration fails to apply**

1. Check migration SQL for syntax errors
2. Verify database permissions
3. Review Supabase logs
4. Check if migration was already applied

**Solution:**

```bash
# Check migration status
supabase migration list

# If migration is marked as applied but changes aren't visible:
supabase migration repair --status applied --version 20250131000005

# Or manually apply via SQL Editor
```

### Rollback

If a migration causes issues:

1. **Stop application traffic** (if possible)
2. **Create backup** of current state
3. **Review migration** to understand changes
4. **Create rollback migration** if needed
5. **Apply rollback** via SQL Editor or new migration

See [Rollback Procedure](../ROLLBACK_PROCEDURE.md) for detailed steps.

## Pre-Migration Checklist

- [ ] Migration tested locally
- [ ] Backup created
- [ ] Migration SQL reviewed
- [ ] Breaking changes documented
- [ ] Rollback plan prepared
- [ ] Team notified (if major change)

## Post-Migration Verification

```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check functions exist
SELECT proname FROM pg_proc 
WHERE proname LIKE '%your_function%';

-- Verify indexes
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public';

-- Check constraints
SELECT conname, contype FROM pg_constraint 
WHERE connamespace = 'public'::regnamespace;
```

## Migration Naming Convention

Migrations should follow this format:

```
YYYYMMDDHHMMSS_descriptive_name.sql
```

**Examples:**
- `20250131000005_schedule_monitoring_functions.sql`
- `20251022000004_add_adaptive_srs.sql`
- `20251021000001_add_idempotency_keys.sql`

## Common Migration Patterns

### Adding a Column

```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```

### Creating a Table

```sql
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  preference_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, preference_key)
);
```

### Adding an Index

```sql
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
ON user_preferences(user_id);
```

### Creating a Function

```sql
CREATE OR REPLACE FUNCTION get_user_preferences(p_user_id UUID)
RETURNS TABLE (
  preference_key TEXT,
  preference_value JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT up.preference_key, up.preference_value
  FROM user_preferences up
  WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Schema Validation

Before and after migrations, validate schema:

```bash
# Run schema validation script
./scripts/validate-schema.sh
```

This verifies that foreign key constraints match migration expectations.

## Additional Resources

- [Supabase Migrations Documentation](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Database Operations Runbook](../DATABASE/OPERATIONS_RUNBOOK.md)

