# Trash Can Automatic Cleanup - Deployment Guide

## Overview

The `cleanup-deleted-items` function is a Supabase Edge Function that automatically removes old, soft-deleted items from the database based on user subscription tiers. This ensures database storage efficiency and enforces business rules for data retention.

## Retention Periods

- **Free Users**: 48 hours
- **Premium Users**: 120 hours (5 days)

## Function Behavior

1. **Fetches all users** with their subscription tier information
2. **Calculates retention period** for each user based on their subscription
3. **Permanently deletes** soft-deleted items older than the retention period
4. **Processes all tables**: courses, assignments, lectures, study_sessions
5. **Continues processing** even if individual operations fail (fault tolerance)

## Deployment Commands

### Deploy the Function
```bash
supabase functions deploy cleanup-deleted-items
```

### Schedule the Function (Daily at Midnight UTC)
```bash
supabase functions deploy cleanup-deleted-items --schedule "0 0 * * *"
```

### Alternative Scheduling Options

#### Every 6 Hours
```bash
supabase functions deploy cleanup-deleted-items --schedule "0 */6 * * *"
```

#### Every 12 Hours
```bash
supabase functions deploy cleanup-deleted-items --schedule "0 */12 * * *"
```

#### Weekly (Sundays at Midnight)
```bash
supabase functions deploy cleanup-deleted-items --schedule "0 0 * * 0"
```

## Environment Variables Required

The function requires the following environment variables to be set in your Supabase project:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin-level access

## Monitoring

### View Function Logs
```bash
supabase functions logs cleanup-deleted-items
```

### Test the Function Manually
```bash
supabase functions invoke cleanup-deleted-items
```

## Safety Features

1. **User Isolation**: Only processes items belonging to each specific user
2. **Soft Delete Only**: Only removes items that are already soft-deleted
3. **Fault Tolerance**: Continues processing even if individual operations fail
4. **Comprehensive Logging**: Logs all operations for monitoring and debugging

## Business Impact

- **Storage Efficiency**: Prevents database from growing indefinitely with old deleted items
- **Subscription Value**: Premium users get 2.5x longer data recovery window
- **Automated Management**: No manual intervention required
- **Cost Optimization**: Reduces long-term storage costs

## Security Considerations

- Uses Service Role Key for admin-level access
- Processes all users in a single function execution
- No user authentication required (scheduled function)
- Isolated per-user operations prevent cross-user data access

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure Service Role Key has proper permissions
2. **Timeout Issues**: Function may timeout with large user bases - consider batching
3. **Missing Environment Variables**: Verify all required env vars are set

### Performance Optimization

For large user bases, consider:
- Implementing batch processing
- Adding progress tracking
- Splitting into multiple smaller functions
- Adding database indexes on `deleted_at` columns

## Related Functions

This function works in conjunction with:
- `restore-*` functions (for manual restoration)
- `delete-*-permanently` functions (for immediate permanent deletion)
- Soft delete triggers in the database schema
