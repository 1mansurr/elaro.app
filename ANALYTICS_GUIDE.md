# ELARO Analytics Implementation with Mixpanel

## Overview

This document outlines the privacy-first analytics implementation using Mixpanel for the ELARO app. The system is designed to collect valuable usage data while protecting user privacy and complying with GDPR regulations.

## Key Features

- **Privacy-First Design**: No PII (Personally Identifiable Information) is sent to Mixpanel
- **User Consent Control**: Users can opt-in/opt-out of analytics tracking
- **Geolocation**: Country-level location data for user demographics
- **PII Protection**: Automatic sanitization of all data before transmission
- **GDPR Compliant**: Full user control over data collection

## Files Created/Modified

### New Files

- `src/services/mixpanel.ts` - Privacy-focused Mixpanel service
- `src/services/analyticsEvents.ts` - Event constants for tracking
- `src/features/settings/components/AnalyticsToggle.tsx` - User consent toggle
- `src/services/analyticsUsageExamples.ts` - Usage examples and best practices

### Modified Files

- `App.tsx` - Mixpanel initialization
- `src/features/auth/contexts/AuthContext.tsx` - Auth event tracking
- `src/features/user-profile/screens/AccountScreen.tsx` - Added analytics toggle
- `ios/Elaro/PrivacyInfo.xcprivacy` - iOS privacy declarations

## Environment Setup

Add your Mixpanel project token to your `.env` file:

```bash
EXPO_PUBLIC_MIXPANEL_TOKEN=your_mixpanel_project_token_here
```

## Privacy Protection Features

### 1. PII Sanitization

The `mixpanel.ts` service automatically removes or hashes any PII before sending data:

- **Email addresses** - Removed completely
- **Names** - Removed completely
- **User IDs** - Hashed using simple hash function
- **Phone numbers** - Removed completely
- **Addresses** - Removed completely

### 2. Safe Property Detection

Only safe properties are allowed through:

- Numeric values (numbers, booleans)
- Short strings (< 50 characters)
- Arrays of safe values
- Objects with safe nested properties

### 3. User Consent

- Analytics tracking is **disabled by default**
- Users must explicitly opt-in via the settings toggle
- Consent is stored locally and persists across app sessions
- Users can change their preference at any time

## Tracked Events

### User Lifecycle

- `User Signed Up` - User registration
- `User Logged In` - User authentication
- `User Logged Out` - User logout
- `Onboarding Completed` - User completes onboarding

### Academic Content

- `Course Created` - New course added
- `Assignment Created` - New assignment added
- `Assignment Completed` - Assignment marked complete
- `Lecture Created` - New lecture scheduled
- `Lecture Attended` - Lecture marked attended

### Study Sessions

- `Study Session Created` - New study session started
- `Study Session Completed` - Study session finished
- `Study Session Skipped` - Study session skipped
- `Spaced Repetition Enabled` - Feature enabled

### Subscription & Payments

- `Subscription Started` - User subscribes to paid plan
- `Subscription Cancelled` - Subscription cancelled
- `Payment Completed` - Payment processed
- `Trial Started` - Free trial begins
- `Trial Converted` - Trial converts to paid

### Feature Usage

- `Calendar Viewed` - Calendar screen accessed
- `Home Screen Viewed` - Home screen accessed
- `Notification Received` - Push notification received
- `Notification Opened` - Notification tapped
- `Settings Viewed` - Settings screen accessed

### App Performance

- `App Opened` - App launched
- `App Backgrounded` - App sent to background
- `Error Occurred` - App error logged

### Privacy & Analytics

- `Analytics Consent Changed` - User toggles analytics preference

## Usage Examples

### Basic Event Tracking

```typescript
import { mixpanelService } from '@/services/mixpanel';
import { AnalyticsEvents } from '@/services/analyticsEvents';

// Track a simple event
mixpanelService.track(AnalyticsEvents.COURSE_CREATED, {
  course_name_length: courseName.length,
  has_course_code: !!courseCode,
  initial_assignment_count: assignments.length,
});
```

### Setting User Properties

```typescript
// Set non-PII user properties
mixpanelService.setUserProperties({
  subscription_tier: 'premium',
  onboarding_completed: true,
  university: 'Stanford University', // Safe - no PII
});
```

### User Identification

```typescript
// Identify user with hashed ID (no PII)
mixpanelService.identifyUser(userId);
```

## Geolocation

Mixpanel automatically collects country-level geolocation data when enabled. This helps understand:

- User distribution by country
- Regional usage patterns
- Localization needs

**Note**: No precise location data is collected - only country-level information.

## iOS Privacy Compliance

The `PrivacyInfo.xcprivacy` file has been updated to declare:

- Device ID collection for analytics
- Usage data collection for analytics
- Tracking enabled (with user consent)

## Best Practices

### 1. Always Use Event Constants

```typescript
// ✅ Good
mixpanelService.track(AnalyticsEvents.COURSE_CREATED, properties);

// ❌ Bad
mixpanelService.track('Course Created', properties);
```

### 2. Sanitize Data Before Sending

```typescript
// ✅ Good - PII removed automatically by service
mixpanelService.track(AnalyticsEvents.USER_SIGNED_UP, {
  signup_method: 'email',
  has_first_name: !!firstName,
});

// ❌ Bad - PII will be removed anyway, but don't send it
mixpanelService.track(AnalyticsEvents.USER_SIGNED_UP, {
  email: userEmail, // Will be stripped
  first_name: firstName, // Will be stripped
});
```

### 3. Use Descriptive Event Names

```typescript
// ✅ Good
mixpanelService.track('Study Session Completed', {
  duration_minutes: 45,
  task_type: 'assignment',
  completion_rate: 100,
});

// ❌ Bad
mixpanelService.track('Event', { data: 'value' });
```

### 4. Track Meaningful Metrics

Focus on business-critical metrics:

- User engagement patterns
- Feature adoption rates
- Conversion funnel metrics
- Error rates and types

## Data Retention

Mixpanel data retention follows their standard policies:

- **Free tier**: 1 year
- **Paid tiers**: Configurable retention periods

## Security Considerations

1. **API Keys**: Mixpanel project token is stored in environment variables
2. **Data Encryption**: All data is encrypted in transit to Mixpanel
3. **Access Control**: Mixpanel dashboard access should be restricted
4. **Regular Audits**: Review collected data periodically for PII leaks

## Troubleshooting

### Analytics Not Working

1. Check if user has consented to analytics
2. Verify `EXPO_PUBLIC_MIXPANEL_TOKEN` is set correctly
3. Check console for initialization errors
4. Ensure Mixpanel service is properly imported

### PII Concerns

1. All PII is automatically stripped by the service
2. User IDs are hashed before transmission
3. Email addresses and names are never sent
4. Geolocation is country-level only

## Future Enhancements

1. **Cohort Analysis**: Track user retention and engagement cohorts
2. **Funnel Analysis**: Analyze user conversion funnels
3. **A/B Testing**: Integrate with Mixpanel's A/B testing features
4. **Custom Dashboards**: Create custom analytics dashboards
5. **Real-time Alerts**: Set up alerts for critical metrics

## Support

For questions about the analytics implementation:

1. Check the usage examples in `analyticsUsageExamples.ts`
2. Review Mixpanel documentation
3. Contact the development team

---

**Important**: This analytics system is designed with privacy as the top priority. All PII is automatically protected, and users have full control over their data collection preferences.
