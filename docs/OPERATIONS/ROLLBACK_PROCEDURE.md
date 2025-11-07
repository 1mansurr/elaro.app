# Rollback Procedure

## When to Rollback

Rollback should be triggered when:

- Crash rate increases by >5% over baseline in first 24 hours
- Critical error affects >10% of users
- Security vulnerability discovered
- App Store rejection requires immediate fix

## Baseline Calculation

The crash rate baseline is calculated dynamically from the last 7 days of Sentry data:

- Average crash rate over 7 days
- Updated daily at midnight UTC
- Stored in Sentry custom metrics

## Rollback Steps

### 1. OTA Update Rollback

If issue is with OTA update:

1. Disable OTA updates for affected channel
2. Revert to previous OTA update
3. Notify team via email

Commands:

```bash
# Disable OTA for channel
./scripts/rollback/disable-ota.sh production

# Revert to previous update
./scripts/rollback/revert-ota.sh production <previous-update-id>
```

### 2. App Store Rollback

If issue requires app store rollback:

1. Build previous version using git tag
2. Submit to app stores
3. Request expedited review
4. Monitor crash rates in Sentry

### 3. Feature Flag Rollback

If issue is feature-specific:

1. Disable feature flag
2. Monitor impact
3. Fix and re-enable

## Automation

Rollback can be triggered automatically via Sentry webhook when crash rate threshold is exceeded.

## Monitoring

- Check Sentry dashboard for crash rate trends
- Monitor error rate alerts
- Review user reports
- Check health check endpoint status
