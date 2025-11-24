# Account Management System Setup Guide

This document provides instructions for setting up the new account management features including soft delete with 7-day retention and account suspension capabilities.

## 🚀 Features Implemented

### 1. **Soft Delete with 7-Day Retention**

- Users can delete their accounts with a 7-day grace period
- Account restoration is possible by logging in within 7 days
- Automatic permanent deletion after 7 days

### 2. **Account Suspension System**

- Admins can suspend accounts for non-compliance
- Support for temporary and indefinite suspensions
- Automatic unsuspension when suspension period expires
- Complete audit trail of all admin actions

## 📋 Setup Instructions

### Step 1: Database Migration

Run the migration to add the new account management fields:

```sql
-- This migration is already created in:
-- supabase/migrations/20250115000000_add_account_management_fields.sql
```

### Step 2: Deploy Edge Functions

Deploy the following new Edge Functions:

1. `soft-delete-account` - Handles soft deletion with 7-day retention
2. `restore-account` - Allows users to restore their accounts
3. `permanently-delete-account` - Cleanup function for expired deletions
4. `suspend-account` - Admin function to suspend accounts
5. `unsuspend-account` - Admin function to unsuspend accounts
6. `auto-unsuspend-accounts` - Automatic unsuspension of expired suspensions

### Step 3: Environment Variables

Ensure these environment variables are set in your Supabase project:

```bash
# Required for cron job authentication
CRON_SECRET=your-secure-cron-secret-here

# Required for admin functions
ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

### Step 4: Set Up Cron Jobs

Add these cron jobs in your Supabase Dashboard under Database > Extensions > pg_cron:

#### 1. Auto-unsuspend expired accounts (daily at 2 AM)

```sql
SELECT cron.schedule(
  'auto-unsuspend-accounts',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/auto-unsuspend-accounts',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.cron_secret') || '"}'
  );
  $$
);
```

#### 2. Permanently delete expired soft-deleted accounts (daily at 3 AM)

```sql
SELECT cron.schedule(
  'permanent-delete-accounts',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/permanently-delete-account',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.cron_secret') || '"}'
  );
  $$
);
```

### Step 5: Update App Settings

Add the cron secret to your app settings:

```sql
-- In Supabase SQL Editor
INSERT INTO app.settings (key, value)
VALUES ('cron_secret', 'your-secure-cron-secret-here')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

## 🔧 Usage

### For Users

#### Deleting an Account

1. Go to Account Settings
2. Click "Delete Account"
3. Confirm the deletion
4. Account is soft-deleted with 7-day retention
5. User is signed out immediately

#### Restoring an Account

1. User attempts to log in with their credentials
2. System detects soft-deleted account
3. User is prompted to restore the account
4. Account is restored to active status

### For Admins

#### Suspending an Account

```typescript
// Call the suspend-account function
const { data, error } = await supabase.functions.invoke('suspend-account', {
  body: {
    userId: 'user-uuid-here',
    reason: 'Violation of terms of service',
    duration: 7, // 7 days (optional, omit for indefinite)
    adminNotes: 'Additional notes for audit trail',
  },
});
```

#### Unsuspending an Account

```typescript
// Call the unsuspend-account function
const { data, error } = await supabase.functions.invoke('unsuspend-account', {
  body: {
    userId: 'user-uuid-here',
    reason: 'Issue resolved',
    adminNotes: 'User provided explanation',
  },
});
```

## 🛡️ Security Features

### Admin Access Control

- Only users with `role = 'admin'` can suspend/unsuspend accounts
- Admins cannot suspend their own accounts
- All admin actions are logged in the `admin_actions` table

### Account Status Validation

- Deleted accounts cannot be suspended
- Suspended accounts cannot be deleted
- Proper validation prevents invalid state transitions

### Audit Trail

- All suspension/unsuspension actions are logged
- Includes admin ID, target user, reason, and metadata
- Timestamps for all actions

## 📊 Database Schema

### New Fields in `users` Table

- `account_status`: 'active' | 'deleted' | 'suspended'
- `deleted_at`: Timestamp when account was soft-deleted
- `deletion_scheduled_at`: When permanent deletion is scheduled
- `suspension_end_date`: When suspension expires (null for indefinite)

### New `admin_actions` Table

- Tracks all admin actions for audit purposes
- Includes action type, reason, admin notes, and metadata
- Full audit trail for compliance

## 🔄 Automatic Processes

### Daily Cleanup (3 AM)

- Permanently deletes accounts that have been soft-deleted for 7+ days
- Removes all user data and auth records
- Logs all deletion activities

### Daily Unsuspension (2 AM)

- Automatically unsuspends accounts where suspension period has expired
- Logs auto-unsuspension actions
- Updates account status to 'active'

## 🚨 Error Handling

### User-Facing Errors

- Clear error messages for restoration failures
- Graceful handling of expired restoration periods
- Proper feedback for suspension notifications

### Admin-Facing Errors

- Validation errors for invalid operations
- Clear error messages for failed suspensions
- Audit logging even for failed operations

## 📱 Frontend Integration

### AuthContext Updates

- Automatic detection of deleted/suspended accounts during login
- User-friendly restoration prompts
- Proper error handling and user feedback

### Account Screen Updates

- Updated messaging to reflect 7-day retention
- Clear explanation of restoration process
- Improved user experience

## 🔍 Monitoring

### Logs to Monitor

- Edge function execution logs
- Cron job execution status
- Admin action audit trail
- Account status changes

### Key Metrics

- Number of soft-deleted accounts
- Restoration success rate
- Suspension/unsuspension frequency
- Cleanup process success rate

## 🆘 Troubleshooting

### Common Issues

1. **Cron jobs not running**
   - Check if pg_cron extension is enabled
   - Verify cron secret is set correctly
   - Check function URLs are correct

2. **Admin functions failing**
   - Verify user has admin role
   - Check admin_actions table permissions
   - Ensure proper authentication

3. **Account restoration not working**
   - Check if 7-day period has expired
   - Verify account_status is 'deleted'
   - Check deletion_scheduled_at timestamp

### Support Commands

```sql
-- Check account status
SELECT id, email, account_status, deleted_at, deletion_scheduled_at, suspension_end_date
FROM users
WHERE account_status != 'active';

-- Check recent admin actions
SELECT * FROM admin_actions
ORDER BY created_at DESC
LIMIT 10;

-- Check cron job status
SELECT * FROM cron.job;
```

## ✅ Testing Checklist

- [ ] Database migration applied successfully
- [ ] All Edge Functions deployed
- [ ] Environment variables set
- [ ] Cron jobs configured
- [ ] Test account deletion and restoration
- [ ] Test admin suspension/unsuspension
- [ ] Verify audit logging
- [ ] Test automatic cleanup processes
- [ ] Verify error handling
- [ ] Test frontend integration

## 📞 Support

For issues or questions about the account management system:

1. Check the logs in Supabase Dashboard
2. Review the audit trail in admin_actions table
3. Verify cron job execution status
4. Check Edge Function logs for errors
