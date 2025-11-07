# Deployment Guide

## Overview

This guide covers deployment procedures for the ELARO application, including database migrations, application builds, and production releases.

## Prerequisites

- EAS CLI installed: `npm install -g eas-cli`
- Logged in to Expo account: `eas login`
- Supabase CLI installed: `npm install -g supabase`
- Access to Supabase project

## Quick Deployment

### Database Migrations

```bash
# Push all migrations to production
supabase db push

# Verify migrations applied
supabase migration list
```

### Application Build

```bash
# Build for iOS
npm run build:ios

# Build for Android
npm run build:android

# Build for both platforms
npm run build:all
```

### Submit to App Stores

```bash
# Submit to App Store
npm run submit:ios

# Submit to Google Play Store
npm run submit:android
```

## Pre-Deployment Checklist

### Database

- [ ] All migrations tested locally
- [ ] Backup created before deployment
- [ ] Migration scripts reviewed
- [ ] RLS policies verified
- [ ] Permissions checked

### Application

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Build configuration verified
- [ ] Version numbers updated
- [ ] Changelog updated

### Security

- [ ] No secrets in code
- [ ] API keys rotated if needed
- [ ] Security audit completed
- [ ] Dependencies audited

## Database Deployment

### Step 1: Create Backup

```bash
# Create full backup before deployment
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# Or use backup script
./scripts/backup-manager.sh full
```

### Step 2: Apply Migrations

```bash
# Push migrations to production
supabase db push

# Or apply specific migration
supabase db push --include-all
```

### Step 3: Verify Deployment

```sql
-- Check migration history
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC LIMIT 10;

-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check functions exist
SELECT proname FROM pg_proc 
WHERE proname LIKE '%reminder%';
```

### Rollback Procedure

If deployment fails, see [Rollback Procedure](./docs/ROLLBACK_PROCEDURE.md) for detailed steps.

## Application Deployment

### Build Profiles

The project uses EAS Build profiles defined in `eas.json`:

- **preview**: For testing and internal distribution
- **production**: For App Store and Google Play Store

### iOS Deployment

```bash
# 1. Clean iOS build
npm run clean:ios

# 2. Build for production
npm run build:ios

# 3. Submit to App Store
npm run submit:ios
```

### Android Deployment

```bash
# 1. Clean Android build
npm run clean:android

# 2. Build for production
npm run build:android

# 3. Submit to Play Store
npm run submit:android
```

### Environment Configuration

Ensure environment variables are set:

```bash
# Check environment variables
cat .env

# Verify Supabase secrets
supabase secrets list
```

## Post-Deployment Verification

### Database Verification

```sql
-- Check cron jobs are active
SELECT jobname, schedule, active FROM cron.job;

-- Check recent job runs
SELECT * FROM job_metrics ORDER BY run_at DESC LIMIT 5;

-- Verify data integrity
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM assignments;
```

### Application Verification

- [ ] App launches successfully
- [ ] Authentication works
- [ ] Core features functional
- [ ] No console errors
- [ ] Performance acceptable

### Monitoring

- [ ] Error tracking active (Sentry)
- [ ] Analytics tracking (Mixpanel)
- [ ] Performance metrics normal
- [ ] No critical alerts

## Troubleshooting

### Migration Issues

**Issue: Migration conflicts**

```bash
# Check for conflicts
supabase db diff

# Resolve conflicts manually
# Then create new migration
supabase db diff -f resolve_conflicts
```

**Issue: Migration fails**

1. Check migration SQL for errors
2. Verify database permissions
3. Review Supabase logs
4. Rollback if necessary

### Build Issues

**Issue: Build conflicts between platforms**

```bash
# Solution: Clean and rebuild for specific platform
npm run clean:ios
npm run prebuild:ios
npm run build:ios
```

**Issue: Metro cache issues**

```bash
# Clear Metro cache
npx expo start --clear
```

**Issue: Native dependencies**

```bash
# Clean prebuild and reinstall
npm run prebuild:clean
npm install
```

## Deployment Best Practices

### ✅ DO

- Always create backups before deployment
- Test migrations locally first
- Use staging environment for testing
- Monitor deployment closely
- Have rollback plan ready
- Document deployment steps

### ❌ DON'T

- Don't deploy untested migrations
- Don't skip backup creation
- Don't deploy during peak hours
- Don't ignore migration warnings
- Don't deploy without verification

## Continuous Deployment

### GitHub Actions

The project includes GitHub Actions workflows for:

- Automated testing
- Security audits
- Build verification

### Manual Deployment

For production deployments, use manual process:

1. Review changes
2. Create backup
3. Apply migrations
4. Build application
5. Submit to stores
6. Verify deployment

## Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [Expo Deployment Guide](https://docs.expo.dev/distribution/introduction/)

