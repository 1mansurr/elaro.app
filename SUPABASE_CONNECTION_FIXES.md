# Supabase Connection Issues - Fix Guide

## Issues Found and Fixed

### ✅ Fixed Issues

1. **Service Role Key Variable Name**
   - **Problem**: Code was using `SECRET_SUPABASE_SERVICE_ROLE_KEY` instead of `SUPABASE_SERVICE_ROLE_KEY`
   - **Fixed**: All occurrences updated in edge functions and migrations
   - **Files Updated**: 9 files total

2. **Migration History Desync**
   - **Problem**: Remote database had migration `20251102` but local had `20251102000000`
   - **Fixed**: Repaired migration history using `supabase migration repair --status reverted 20251102`

3. **Supabase CLI Version**
   - **Problem**: Using outdated CLI v2.51.0
   - **Fixed**: Updated to v2.54.11 via Homebrew

4. **Missing .supabase Folder**
   - **Problem**: CLI linkage was broken
   - **Fixed**: Re-linked project with `supabase link --project-ref alqpwhrsxmetwbtxuihv`

### ⚠️ Remaining Connection Issues

#### 1. Password Authentication Failures

**Error**: `password authentication failed for user "postgres"`

**Causes**:

- Database password may be incorrect or expired
- Password might have been reset in Supabase Dashboard
- Connection credentials may be cached incorrectly

**Solutions**:

**Option A: Reset Database Password**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/alqpwhrsxmetwbtxuihv/settings/database)
2. Navigate to Settings → Database
3. Click "Reset Database Password"
4. Copy the new password
5. Re-link the project:
   ```bash
   supabase link --project-ref alqpwhrsxmetwbtxuihv
   # Enter the new password when prompted
   ```

**Option B: Use Access Token Instead**

```bash
# Login with access token
supabase login

# Re-link project (will use access token instead of password)
supabase link --project-ref alqpwhrsxmetwbtxuihv
```

#### 2. Database Termination Errors

**Error**: `FATAL: {:shutdown, :db_termination} (SQLSTATE XX000)`

**Causes**:

- Database might be paused (free tier auto-pauses after inactivity)
- Database might be experiencing issues
- Connection pooler might be overloaded

**Solutions**:

1. **Check Database Status**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard/project/alqpwhrsxmetwbtxuihv)
   - Check if database is paused (free tier)
   - If paused, click "Resume" to wake it up
   - Wait 1-2 minutes for database to fully start

2. **Use Direct Connection for Migrations**
   - The CLI should automatically use direct connection (port 5432) for migrations
   - If issues persist, wait a few minutes and retry

3. **Retry with Backoff**
   ```bash
   # Wait 30 seconds and retry
   sleep 30 && supabase db push --include-all
   ```

#### 3. Connection Timeout Errors

**Error**: `timeout: context deadline exceeded`

**Causes**:

- Network connectivity issues
- Database is slow to respond
- Connection pooler is overloaded

**Solutions**:

1. **Check Network Connectivity**

   ```bash
   # Test connection to Supabase
   ping aws-1-eu-west-1.pooler.supabase.com
   ```

2. **Use Direct Connection**
   - Migrations should use direct connection automatically
   - If using pooler, try again after a few minutes

3. **Increase Timeout (if possible)**
   - The CLI handles timeouts automatically
   - Multiple retries are built-in

## Recommended Next Steps

### 1. Verify Database is Active

```bash
# Check project status
supabase projects list

# Should show your project as active
```

### 2. Reset Database Password (if needed)

1. Go to Dashboard → Settings → Database
2. Reset password
3. Re-link: `supabase link --project-ref alqpwhrsxmetwbtxuihv`

### 3. Resume Database (if paused)

- Free tier databases auto-pause after 1 week of inactivity
- Resume from Dashboard if needed

### 4. Retry Migration Push

```bash
# After fixing password/database status
supabase db push --include-all
```

### 5. Verify Edge Function Secrets

Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in:

- Supabase Dashboard → Edge Functions → Secrets
- Should match the service role key from Settings → API

## Connection Configuration

### Current Setup

- **Project Ref**: `alqpwhrsxmetwbtxuihv`
- **Region**: `aws-1-eu-west-1` (West EU - London)
- **Connection**: Using pooler by default, direct for migrations

### Connection Strings

**Direct Connection (for migrations)**:

```
postgresql://postgres.alqpwhrsxmetwbtxuihv:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
```

**Pooler Connection (for applications)**:

```
postgresql://postgres.alqpwhrsxmetwbtxuihv:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres
```

## Troubleshooting Commands

```bash
# Check CLI version
supabase --version

# List linked projects
supabase projects list

# Check migration status
supabase migration list

# Test connection
supabase db push --dry-run

# Re-link project
supabase link --project-ref alqpwhrsxmetwbtxuihv

# Login with access token
supabase login
```

## Summary

✅ **Fixed**: Service role key variable names, migration history, CLI version, project linkage
⚠️ **Action Required**: Reset database password and/or resume database if paused
🔄 **Next**: Retry `supabase db push --include-all` after fixing password/database status
