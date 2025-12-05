/**
 * Helper functions for notification processing
 * Includes quiet hours checking, deduplication key generation, and preference validation
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

export interface QuietHoursConfig {
  enabled: boolean;
  start: string; // HH:MM format
  end: string; // HH:MM format
}

export interface NotificationPreferences {
  master_toggle?: boolean;
  do_not_disturb?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  timezone?: string;
  // Type-specific preferences
  reminders_enabled?: boolean;
  srs_reminders_enabled?: boolean;
  assignment_reminders_enabled?: boolean;
  lecture_reminders_enabled?: boolean;
  morning_summary_enabled?: boolean;
  evening_capture_enabled?: boolean;
}

/**
 * Check if a given time falls within user's quiet hours
 * @param prefs User notification preferences
 * @param checkTime Time to check (defaults to now)
 * @returns true if within quiet hours
 */
export function isWithinQuietHours(
  prefs: NotificationPreferences,
  checkTime?: Date,
): boolean {
  if (
    !prefs.quiet_hours_enabled ||
    !prefs.quiet_hours_start ||
    !prefs.quiet_hours_end
  ) {
    return false;
  }

  const time = checkTime || new Date();
  const timezone = prefs.timezone || 'UTC';

  // Use Intl.DateTimeFormat for reliable timezone conversion
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(time);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const currentMinutes = hour * 60 + minute;

    // Parse quiet hours
    const [startHour, startMinute] = prefs.quiet_hours_start
      .split(':')
      .map(Number);
    const [endHour, endMinute] = prefs.quiet_hours_end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } else {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
  } catch (error) {
    // Fallback to UTC if timezone is invalid
    console.error('Error parsing timezone, using UTC:', error);
    const hour = time.getUTCHours();
    const minute = time.getUTCMinutes();
    const currentMinutes = hour * 60 + minute;

    const [startHour, startMinute] = prefs.quiet_hours_start
      .split(':')
      .map(Number);
    const [endHour, endMinute] = prefs.quiet_hours_end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } else {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
  }
}

/**
 * Get next available time outside quiet hours
 * @param prefs User notification preferences
 * @param scheduledTime Original scheduled time
 * @returns Next available time
 */
export function getNextAvailableTime(
  prefs: NotificationPreferences,
  scheduledTime: Date,
): Date {
  if (!isWithinQuietHours(prefs, scheduledTime)) {
    return scheduledTime;
  }

  const quietHoursEnd = prefs.quiet_hours_end || '08:00';
  const [endHour, endMinute] = quietHoursEnd.split(':').map(Number);
  const timezone_str = prefs.timezone || 'UTC';
  const now = new Date();

  try {
    // Get current time in user's timezone using Intl
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone_str,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
    const month =
      parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    const currentHour = parseInt(
      parts.find(p => p.type === 'hour')?.value || '0',
    );
    const currentMinute = parseInt(
      parts.find(p => p.type === 'minute')?.value || '0',
    );

    // Create date in user's timezone at end of quiet hours
    const endTime = new Date(year, month, day, endHour, endMinute);
    const currentTime = new Date(year, month, day, currentHour, currentMinute);

    // If already past end today, schedule for tomorrow
    if (endTime <= currentTime) {
      endTime.setDate(endTime.getDate() + 1);
    }

    // Return in UTC
    return endTime;
  } catch (error) {
    // Fallback to UTC
    console.error('Error with timezone conversion, using UTC:', error);
    const endTime = new Date(scheduledTime);
    endTime.setUTCHours(endHour, endMinute, 0, 0);
    if (endTime <= now) {
      endTime.setUTCDate(endTime.getUTCDate() + 1);
    }
    return endTime;
  }
}

/**
 * Generate deduplication key for notification
 * @param userId User ID
 * @param notificationType Type of notification
 * @param itemId Optional item ID (assignment, lecture, etc.)
 * @param timeBucketMinutes Time bucket size in minutes (default: 1440 = daily)
 * @returns Deduplication key
 */
export function generateDeduplicationKey(
  userId: string,
  notificationType: string,
  itemId?: string,
  timeBucketMinutes: number = 1440,
): string {
  const now = new Date();

  // Calculate total minutes since epoch (not just minutes in hour)
  const totalMinutes = Math.floor(now.getTime() / (1000 * 60));

  // Round down to nearest bucket
  const bucketMinutes =
    Math.floor(totalMinutes / timeBucketMinutes) * timeBucketMinutes;

  // Convert back to date and format as YYYYMMDDHHMM
  const bucketDate = new Date(bucketMinutes * 60 * 1000);
  const bucketStr = bucketDate.toISOString().slice(0, 16).replace(/[-:T]/g, '');

  if (itemId) {
    return `${userId}:${notificationType}:${itemId}:${bucketStr}`;
  }
  return `${userId}:${notificationType}::${bucketStr}`;
}

/**
 * Check if notification preferences allow sending
 * @param prefs User notification preferences
 * @param notificationType Type of notification
 * @param checkTime Optional time to check (for quiet hours). Defaults to now.
 * @returns true if allowed
 */
export function canSendNotification(
  prefs: NotificationPreferences,
  notificationType: string,
  checkTime?: Date,
): boolean {
  // If prefs is null/undefined, default to false (safer)
  if (!prefs) {
    return false;
  }

  // Master toggle must be enabled
  if (prefs.master_toggle === false) {
    return false;
  }

  // Do not disturb must be off
  if (prefs.do_not_disturb === true) {
    return false;
  }

  // Check quiet hours if enabled
  const timeToCheck = checkTime || new Date();
  if (isWithinQuietHours(prefs, timeToCheck)) {
    return false;
  }

  // Type-specific preference mapping
  // undefined means no specific preference check needed (only master toggle applies)
  const typePreferenceMap: Record<
    string,
    keyof NotificationPreferences | undefined
  > = {
    assignment: 'assignment_reminders_enabled',
    lecture: 'lecture_reminders_enabled',
    spaced_repetition: 'srs_reminders_enabled',
    study_session: 'reminders_enabled',
    daily_summary: 'morning_summary_enabled',
    evening_capture: 'evening_capture_enabled',
    reminder: 'reminders_enabled', // Generic reminder type
    // System notifications - no specific preference, only master toggle applies
    welcome: undefined,
    subscription_ended: undefined,
    trial_expired: undefined,
    grace_period_warning: undefined,
    custom: undefined, // Custom notifications - only master toggle applies
  };

  // Check type-specific preference
  const preferenceKey = typePreferenceMap[notificationType];

  // If type has undefined mapping, it means no specific preference check needed
  // (only master toggle and do_not_disturb apply, already checked above)
  if (preferenceKey === undefined) {
    return true; // Allow if master toggle is on (already verified)
  }

  // If type has a specific preference mapping, check it
  if (prefs[preferenceKey] === false) {
    return false;
  }

  return true;
}

/**
 * Get user notification preferences from database
 * @param supabaseAdmin Supabase admin client
 * @param userId User ID
 * @returns Notification preferences
 */
export async function getUserNotificationPreferences(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<
  | (NotificationPreferences & {
      push_notifications?: boolean;
      email_notifications?: boolean;
    })
  | null
> {
  const { data: prefs, error } = await supabaseAdmin
    .from('notification_preferences')
    .select(
      'master_toggle, do_not_disturb, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, reminders_enabled, srs_reminders_enabled, assignment_reminders_enabled, lecture_reminders_enabled, morning_summary_enabled, evening_capture_enabled, push_notifications, email_notifications',
    )
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found, return complete defaults with timezone
      // Get user timezone even for defaults
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('timezone')
        .eq('id', userId)
        .single();

      return {
        master_toggle: true,
        do_not_disturb: false,
        quiet_hours_enabled: false,
        quiet_hours_start: null,
        quiet_hours_end: null,
        timezone: user?.timezone || 'UTC',
        // Type-specific preferences - all enabled by default
        reminders_enabled: true,
        srs_reminders_enabled: true,
        assignment_reminders_enabled: true,
        lecture_reminders_enabled: true,
        morning_summary_enabled: true,
        evening_capture_enabled: true,
        // Channel preferences - enabled by default
        push_notifications: true,
        email_notifications: true,
      };
    }
    console.error('Error fetching notification preferences:', error);
    return null;
  }

  // Also get user timezone
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('timezone')
    .eq('id', userId)
    .single();

  return {
    ...prefs,
    timezone: user?.timezone || 'UTC',
  };
}

/**
 * Get start and end of today in user's timezone (returned as UTC Date objects)
 * This calculates what "today" means in the user's timezone and returns
 * the UTC timestamps that represent the start and end of that day.
 */
export function getTodayBoundsInTimezone(timezone: string): {
  start: Date;
  end: Date;
} {
  const now = new Date();

  // Get current date in user's timezone (YYYY-MM-DD format)
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
  });
  const dateStr = dateFormatter.format(now); // "YYYY-MM-DD"

  // Get current time components in user's timezone
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const timeParts = timeFormatter.formatToParts(now);
  const hour = parseInt(timeParts.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(
    timeParts.find(p => p.type === 'minute')?.value || '0',
  );
  const second = parseInt(
    timeParts.find(p => p.type === 'second')?.value || '0',
  );

  // Calculate milliseconds since midnight in user's timezone
  const msSinceMidnight = (hour * 3600 + minute * 60 + second) * 1000;

  // Calculate timezone offset more accurately
  // Create a formatter that includes timezone offset info
  // We'll calculate offset by creating a date string and parsing it
  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const utcParts = utcFormatter.formatToParts(now);
  const utcHour = parseInt(utcParts.find(p => p.type === 'hour')?.value || '0');
  const utcMinute = parseInt(
    utcParts.find(p => p.type === 'minute')?.value || '0',
  );
  const utcSecond = parseInt(
    utcParts.find(p => p.type === 'second')?.value || '0',
  );
  const utcMsSinceMidnight =
    (utcHour * 3600 + utcMinute * 60 + utcSecond) * 1000;

  // The difference in msSinceMidnight represents the timezone offset
  // If user is ahead of UTC, their midnight happened earlier in UTC time
  const offset = msSinceMidnight - utcMsSinceMidnight;

  // Calculate UTC timestamp for midnight in user's timezone
  // User's midnight = UTC midnight + offset
  // UTC timestamp of user's midnight = now - msSinceMidnight - offset (adjusted)
  const midnightUTC = now.getTime() - msSinceMidnight;

  const start = new Date(midnightUTC);
  const end = new Date(midnightUTC + 24 * 60 * 60 * 1000);

  return { start, end };
}
