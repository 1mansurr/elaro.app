/**
 * Frontend timezone helper functions
 * Mirror backend logic for consistency
 */

export function isWithinQuietHoursFrontend(
  quietHoursEnabled: boolean,
  quietHoursStart: string | null,
  quietHoursEnd: string | null,
  userTimezone: string,
  checkTime?: Date,
): boolean {
  if (!quietHoursEnabled || !quietHoursStart || !quietHoursEnd) {
    return false;
  }

  const time = checkTime || new Date();

  // Use Intl.DateTimeFormat for reliable timezone conversion
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone || 'UTC',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(time);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const currentMinutes = hour * 60 + minute;

    const [startHour, startMinute] = quietHoursStart.split(':').map(Number);
    const [endHour, endMinute] = quietHoursEnd.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } else {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
  } catch (error) {
    console.error('Error parsing timezone, using UTC:', error);
    // Fallback to UTC if timezone is invalid
    const hour = time.getUTCHours();
    const minute = time.getUTCMinutes();
    const currentMinutes = hour * 60 + minute;

    const [startHour, startMinute] = quietHoursStart.split(':').map(Number);
    const [endHour, endMinute] = quietHoursEnd.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } else {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
  }
}
