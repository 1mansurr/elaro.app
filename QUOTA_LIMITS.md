# Service Quota Limits

## Current Configuration

### Supabase
- **Plan**: Free
- **API Calls**: Unlimited (per pricing page)
- **Other Limits**: 50,000 MAUs, 500MB database, 1GB file storage
- **Last Verified**: 2025-01-31
- **Verified By**: ELARO
- **Source**: https://app.supabase.com/project/oqwyoucchbjiyddnznwf/settings/billing
- **Configuration File**: `supabase/functions/_shared/quota-monitor.ts` (line 35)
- **Monitoring Note**: Set to 10M/day for tracking purposes (actual: Unlimited - won't trigger alerts)

**Important**: API requests are unlimited on Free plan, but other resource limits apply (database size, storage, bandwidth).

### Expo Push Notifications
- **Plan**: Free
- **Rate Limit**: 600 notifications per second
- **Calculated Daily**: 51,840,000 notifications/day (600/sec × 86,400 sec/day)
- **Last Verified**: 2025-01-31
- **Verified By**: ELARO
- **Source**: https://expo.dev → Account Settings → Usage
- **Configuration File**: `supabase/functions/_shared/quota-monitor.ts` (line 48)
- **Monitoring Note**: This is a per-second rate limit, not a daily quota. Monitoring tracks daily usage for visibility.

**Important**: This is a burst rate limit (600/sec), not a hard daily cap. Sustained high usage may still be throttled.

### RevenueCat
- **Plan**: Free
- **API Calls**: No clear monthly request cap found
- **Free Tier Limit**: Free until Monthly Recurring Revenue (MTR) reaches US $2,500
- **Last Verified**: 2025-01-31
- **Verified By**: ELARO
- **Source**: https://app.revenuecat.com → Project Settings → Usage
- **Configuration File**: `supabase/functions/_shared/quota-monitor.ts` (line 60)
- **Monitoring Note**: Set to 10M/month for tracking purposes (actual: No explicit cap - tracks usage)

**Important**: Free tier is based on revenue threshold ($2,500 MTR), not request count. Monitoring tracks API usage for visibility.

## How to Update Quota Limits

**📖 See `QUOTA_VERIFICATION_GUIDE.md` for detailed step-by-step instructions.**

Quick Steps:

1. **Follow Verification Guide**
   - Open `QUOTA_VERIFICATION_GUIDE.md`
   - Follow verification steps for each service
   - Note actual limits from service dashboards

2. **Update Configuration**
   - Open `supabase/functions/_shared/quota-monitor.ts`
   - Update `QUOTA_CONFIGS` array with verified limits
   - Add comments with source and verification date

3. **Update This Documentation**
   - Update the limits in this file
   - Add verification date
   - Add link to dashboard

4. **Test Quota Monitoring**
   - Verify quota alerts trigger at correct thresholds (70% and 90%)
   - Test with mock data if needed

## Quota Alert Thresholds

- **Warning**: 70% of quota limit
- **Critical**: 90% of quota limit

These thresholds are configured in:
- `supabase/functions/_shared/quota-monitor.ts`
- Database functions: `track_quota_usage()` and `get_quota_status()`

## Monitoring

Quota usage is tracked in the `api_quota_usage` table. You can query current usage:

```sql
SELECT 
  service_name,
  quota_type,
  usage_count,
  quota_limit,
  percentage,
  remaining
FROM api_quota_usage
WHERE date = CURRENT_DATE
ORDER BY percentage DESC;
```

## Best Practices

1. **Regular Verification**: Check and update quota limits quarterly
2. **Monitor Usage**: Set up alerts for approaching limits
3. **Plan Ahead**: Upgrade plans before hitting limits
4. **Document Changes**: Always update this file when limits change

