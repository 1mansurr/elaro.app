# Notification System Guide

## Overview

The ELARO notification system is a modern, modular architecture that provides intelligent notification delivery, comprehensive user preferences, advanced scheduling, and analytics tracking.

## Architecture

### Service Layer

```
src/services/notifications/
├── interfaces/
│   ├── INotificationDeliveryService.ts
│   ├── INotificationPreferenceService.ts
│   ├── INotificationSchedulingService.ts
│   └── INotificationAnalyticsService.ts
├── NotificationDeliveryService.ts
├── NotificationPreferenceService.ts
├── NotificationSchedulingService.ts
├── NotificationAnalyticsService.ts
├── NotificationService.ts (orchestrator)
└── index.ts
```

### UI Components

```
src/features/notifications/
├── components/
│   ├── AdvancedNotificationSettings.tsx
│   ├── NotificationAnalyticsDashboard.tsx
│   └── SmartNotificationScheduler.tsx
└── screens/
    └── NotificationManagementScreen.tsx
```

## Features

### 1. Advanced Notification Settings

Comprehensive preferences with 20+ settings:

- **Master Controls**: Global toggle, do not disturb
- **Quiet Hours**: Customizable time ranges with time pickers
- **Preferred Times**: Morning/evening preferences
- **Notification Types**: Granular control over 8+ categories
- **Frequency Settings**: Smart batching and cooldown periods
- **Advanced Options**: Vibration, sound, badges, location awareness

### 2. Smart Scheduling

- **Smart Timing**: AI-powered optimal delivery time prediction
- **Context Awareness**: Location and activity-based adjustments
- **Frequency Control**: Automatic batching and spam prevention
- **Rescheduling**: Auto-reschedule when user is busy
- **Quick Schedule**: One-tap scheduling for common scenarios

### 3. Analytics & Optimization

- **Engagement Metrics**: Open rates, click rates, action rates
- **Timing Analysis**: Best hours, days, frequency patterns
- **User Behavior**: Notification fatigue, preference accuracy
- **Effectiveness**: Task completion, satisfaction, retention
- **Recommendations**: Data-driven optimization suggestions

## Usage

### Basic Notification

```typescript
import { notificationService } from '@/services/notifications';

// Send a simple notification
await notificationService.sendSmartNotification(
  userId,
  'Study Reminder',
  'Time to study!',
  'reminder',
  'normal',
);
```

### Advanced Preferences

```typescript
// Get user preferences
const preferences = await notificationService.getUserPreferences(userId);

// Update preferences
await notificationService.updatePreferences(userId, {
  masterToggle: true,
  doNotDisturb: false,
  quietHoursEnabled: true,
  quietHoursStart: '22:00:00',
  quietHoursEnd: '08:00:00',
});
```

### Analytics

```typescript
// Get notification analytics
const analytics = await notificationService.getAnalytics(userId, {
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-31'),
});

console.log(analytics.openRate); // 0.75
console.log(analytics.bestHours); // [9, 10, 18, 19]
```

## Alert Delivery Setup

### Required Configuration

**Admin Email (Required):**

```bash
# Local development (.env)
ADMIN_EMAIL=admin@yourdomain.com

# Production (Supabase secrets)
supabase secrets set ADMIN_EMAIL=admin@yourdomain.com
```

### Optional: Email Delivery (Resend)

1. Sign up for Resend: https://resend.com
2. Create API key from dashboard
3. Set environment variables:

```bash
# Local development
RESEND_API_KEY=re_your_api_key_here
ALERT_EMAIL_FROM=alerts@yourdomain.com

# Production
supabase secrets set RESEND_API_KEY=re_your_api_key_here
supabase secrets set ALERT_EMAIL_FROM=alerts@yourdomain.com
```

### Optional: Slack Integration

1. Create Slack webhook: **Apps** → **Incoming Webhooks**
2. Set webhook URL:

```bash
supabase secrets set SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Verify Configuration

```bash
# Check secrets are set
supabase secrets list
```

## Database Schema

### Notification Preferences

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  master_toggle BOOLEAN DEFAULT true,
  do_not_disturb BOOLEAN DEFAULT false,
  quiet_hours_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  -- ... additional preference fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Notification Analytics

```sql
CREATE TABLE notification_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Troubleshooting

### Notifications Not Delivering

1. Check user preferences: `masterToggle` and `doNotDisturb`
2. Verify quiet hours configuration
3. Check device permissions
4. Review notification service logs

### Email Alerts Not Sending

1. Verify Resend API key is valid
2. Check domain is verified in Resend
3. Verify `ALERT_EMAIL_FROM` matches verified domain
4. Check Edge Function logs for errors

### Slack Alerts Not Sending

1. Verify webhook URL is correct
2. Check webhook is still active in Slack
3. Verify channel exists and has permissions
4. Check Edge Function logs for errors

## Best Practices

1. **Respect User Preferences**: Always check `masterToggle` and quiet hours
2. **Batch Notifications**: Use smart scheduling to avoid spam
3. **Track Analytics**: Monitor engagement metrics for optimization
4. **Test Thoroughly**: Test notification delivery on both iOS and Android
5. **Handle Errors Gracefully**: Implement fallbacks for failed deliveries

## Security Notes

- Never commit API keys or webhook URLs to version control
- Use Supabase secrets for production (not `.env` files)
- Rotate API keys periodically
- Limit webhook access to specific channels

## Additional Resources

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Resend Documentation](https://resend.com/docs)

