# Daily Backup Setup Instructions

## 🎯 Overview

To achieve the 24-hour RPO (Recovery Point Objective), daily backups must run automatically. Choose one of the following setup methods.

---

## Option 1: Local Cron Job (Recommended for Development)

### Setup Steps:

1. **Make the backup script executable** (already done):

   ```bash
   chmod +x scripts/daily-backup.sh
   ```

2. **Test the backup script manually**:

   ```bash
   cd /Users/new/Desktop/Biz/ELARO/ELARO-app
   ./scripts/daily-backup.sh
   ```

3. **Add to crontab**:

   ```bash
   crontab -e
   ```

4. **Add this line** (runs daily at 2 AM):

   ```cron
   0 2 * * * cd /Users/new/Desktop/Biz/ELARO/ELARO-app && ./scripts/daily-backup.sh >> /var/log/elaro-backup.log 2>&1
   ```

5. **Verify crontab entry**:
   ```bash
   crontab -l
   ```

### Backup Location:

- Backups stored in: `backups/daily/`
- Retention: 7 days (automatically cleaned up)
- Format: `daily_backup_YYYYMMDD_HHMMSS.sql.gz`

---

## Option 2: GitHub Actions (Recommended for Production)

### Setup Steps:

1. **Create GitHub Secrets**:
   - Go to: Settings → Secrets and variables → Actions
   - Add secrets:
     - `SUPABASE_ACCESS_TOKEN`: Your Supabase access token
     - `SUPABASE_PROJECT_REF`: Your project reference ID (`oqwyoucchbjiyddnznwf`)

2. **Workflow is already created**:
   - File: `.github/workflows/daily-backup.yml`
   - Runs daily at 2 AM UTC
   - Can be manually triggered via "Run workflow"

3. **View backups**:
   - Go to: Actions → Daily Database Backup
   - Download backups from "Artifacts" section

### Backup Location:

- Stored as GitHub Actions artifacts
- Retention: 7 days (configured in workflow)
- Can be extended with cloud storage (S3, GCS, etc.)

### Optional: Add Cloud Storage

To store backups long-term, uncomment the cloud storage upload steps in `.github/workflows/daily-backup.yml` and configure:

- **AWS S3**: Add `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` secrets
- **Google Cloud Storage**: Add `GCP_SA_KEY` secret
- **Azure Blob**: Add appropriate Azure credentials

---

## Option 3: Supabase Scheduled Functions (Advanced)

If you prefer to handle backups within Supabase:

1. Create a Supabase Edge Function that runs via cron
2. Use `pg_dump` within the function
3. Upload to cloud storage (S3, etc.)

**Note**: This requires more setup and is not recommended unless you have specific requirements.

---

## 📋 Verification

### Check Backup Status:

**For Cron:**

```bash
# View backup log
tail -f logs/daily-backup.log

# List recent backups
ls -lh backups/daily/ | tail -10

# Verify backup integrity
zcat backups/daily/daily_backup_*.sql.gz | head -20
```

**For GitHub Actions:**

- Go to Actions tab
- Check "Daily Database Backup" workflow runs
- Verify artifacts are created

---

## 🔧 Troubleshooting

### Backup Script Fails

1. **Check Supabase CLI is installed**:

   ```bash
   which supabase
   supabase --version
   ```

2. **Verify project link**:

   ```bash
   supabase status
   ```

3. **Check disk space**:

   ```bash
   df -h
   ```

4. **View detailed logs**:
   ```bash
   cat logs/daily-backup.log
   ```

### Cron Job Not Running

1. **Check cron service**:

   ```bash
   # macOS
   sudo launchctl list | grep cron
   ```

2. **Check cron permissions**:

   ```bash
   # Ensure script has execute permissions
   ls -l scripts/daily-backup.sh
   ```

3. **Test cron manually**:
   ```bash
   # Run the exact command from crontab
   cd /Users/new/Desktop/Biz/ELARO/ELARO-app && ./scripts/daily-backup.sh
   ```

### GitHub Actions Fails

1. **Check secrets are set**:
   - Settings → Secrets → Verify both secrets exist

2. **Check workflow file syntax**:
   - Go to Actions → Daily Database Backup
   - View error messages in workflow logs

3. **Test manually**:
   - Go to Actions → Daily Database Backup → "Run workflow"

---

## 📊 Backup Retention Policy

- **Daily backups**: Kept for 7 days
- **Weekly backups**: Manual (keep for 30 days)
- **Monthly backups**: Manual (keep for 1 year)

### Manual Weekly/Monthly Backups:

```bash
# Weekly backup (run manually on Sundays)
supabase db dump | gzip > backups/weekly/weekly_backup_$(date +%Y%m%d).sql.gz

# Monthly backup (run manually on 1st of month)
supabase db dump | gzip > backups/monthly/monthly_backup_$(date +%Y%m).sql.gz
```

---

## ✅ Success Criteria

After setup, you should have:

- [ ] Backups running daily at 2 AM
- [ ] Backup files created in `backups/daily/`
- [ ] Old backups automatically cleaned up (> 7 days)
- [ ] Backup logs showing successful completion
- [ ] At least 7 recent backup files present

---

## 🔗 Related Documentation

- `DATABASE_SETUP.md` - General database setup
- `docs/database-operations-runbook.md` - Operational procedures
- `MIGRATION_EXECUTION_COMMANDS.md` - Migration commands

---

**Last Updated**: November 1, 2025  
**Status**: Ready for Setup
