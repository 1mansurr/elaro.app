import { supabase } from '@/services/supabase';
import {
  INotificationSchedulingService,
  Notification,
  SmartSchedulingOptions,
  OptimalTime,
} from './interfaces/INotificationSchedulingService';
import { NotificationPreferenceService } from './NotificationPreferenceService';

/**
 * Service responsible for intelligent notification scheduling
 * Handles smart timing, batching, and contextual awareness
 */
export class NotificationSchedulingService implements INotificationSchedulingService {
  private static instance: NotificationSchedulingService;
  private preferenceService: NotificationPreferenceService;

  private constructor() {
    this.preferenceService = NotificationPreferenceService.getInstance();
  }

  public static getInstance(): NotificationSchedulingService {
    if (!NotificationSchedulingService.instance) {
      NotificationSchedulingService.instance =
        new NotificationSchedulingService();
    }
    return NotificationSchedulingService.instance;
  }

  /**
   * Schedule a notification with smart timing
   */
  async scheduleWithSmartTiming(
    notification: Notification,
    options: SmartSchedulingOptions,
  ): Promise<void> {
    try {
      // Get user preferences
      const preferences = await this.preferenceService.getUserPreferences(
        notification.userId,
      );

      if (!preferences.masterToggle) {
        console.log('Notifications disabled for user');
        return;
      }

      // Find optimal time
      const optimalTime = await this.findOptimalTime(
        notification.userId,
        notification,
      );

      // Check if within quiet hours
      const isQuiet = await this.isWithinQuietHours(
        notification.userId,
        optimalTime,
      );
      if (isQuiet && !options.context.weekendBehavior) {
        // Reschedule for next available time
        const nextAvailableTime = await this.getNextAvailableTime(
          notification.userId,
          optimalTime,
        );
        notification.scheduledFor = nextAvailableTime;
      } else {
        notification.scheduledFor = optimalTime;
      }

      // Apply frequency controls
      await this.applyFrequencyControls(
        notification.userId,
        notification,
        options,
      );

      // Schedule the notification
      await this.scheduleNotification(notification);
    } catch (error) {
      console.error('Error scheduling notification with smart timing:', error);
      throw error;
    }
  }

  /**
   * Find optimal time for a notification based on user behavior
   */
  async findOptimalTime(
    userId: string,
    notification: Notification,
  ): Promise<Date> {
    try {
      // Get user's optimal times
      const optimalTimes = await this.getOptimalTimes(userId);

      // Get user preferences
      const preferences =
        await this.preferenceService.getUserPreferences(userId);

      // Determine best time based on notification type and user patterns
      let bestTime: Date;

      if (
        notification.type === 'reminder' ||
        notification.type === 'assignment'
      ) {
        // Use morning preferred time for reminders
        bestTime = this.getTimeFromString(preferences.preferredTimes.morning);
      } else if (
        notification.type === 'srs' ||
        notification.type === 'lecture'
      ) {
        // Use evening preferred time for learning content
        bestTime = this.getTimeFromString(preferences.preferredTimes.evening);
      } else {
        // Use most engaged time slot
        const mostEngaged = optimalTimes.reduce((best, current) =>
          current.engagementScore > best.engagementScore ? current : best,
        );
        bestTime = this.getTimeFromHour(mostEngaged.hour);
      }

      // Apply jitter to avoid predictable patterns
      const jitteredTime = this.addJitter(bestTime, 15); // ±15 minutes

      return jitteredTime;
    } catch (error) {
      console.error('Error finding optimal time:', error);
      // Fallback to current time + 1 hour
      return new Date(Date.now() + 60 * 60 * 1000);
    }
  }

  /**
   * Batch multiple notifications for a user
   */
  async batchNotifications(
    userId: string,
    notifications: Notification[],
  ): Promise<void> {
    try {
      // Get user preferences
      const preferences =
        await this.preferenceService.getUserPreferences(userId);

      // Prefer summaries/reminders/update settings to infer batching behavior
      const isBatched =
        (preferences.frequency as any).summaries === 'weekly' ||
        (preferences.frequency as any).summaries === 'daily';
      if (isBatched) {
        // Group notifications by type and priority
        const grouped = this.groupNotificationsByType(notifications);

        // Schedule each group at optimal times
        for (const [type, groupNotifications] of Object.entries(grouped)) {
          const optimalTime = await this.findOptimalTime(
            userId,
            groupNotifications[0],
          );

          // Create a batched notification
          const batchedNotification: Notification = {
            id: `batch_${type}_${Date.now()}`,
            title: this.getBatchedTitle(type, groupNotifications.length),
            body: this.getBatchedBody(groupNotifications),
            type: groupNotifications[0].type,
            priority: this.getHighestPriority(groupNotifications) as any,
            userId,
            scheduledFor: optimalTime,
            data: {
              batched: true,
              count: groupNotifications.length,
              originalNotifications: groupNotifications.map(n => ({
                id: n.id,
                title: n.title,
                data: n.data,
              })),
            },
          };

          await this.scheduleNotification(batchedNotification);
        }
      } else {
        // Schedule individually with smart timing
        for (const notification of notifications) {
          await this.scheduleWithSmartTiming(notification, {
            smartTiming: {
              enabled: true,
              learningPattern: 'mixed',
              optimalHours: [],
              avoidHours: [],
            },
            frequency: {
              type: 'immediate',
              batchWindow: 0,
              maxPerDay: 10,
              cooldownPeriod: 30,
            },
            context: {
              locationAware: false,
              activityAware: false,
              timezoneAware: true,
              weekendBehavior: 'same',
            },
            rescheduling: {
              autoReschedule: true,
              maxReschedules: 3,
              rescheduleDelay: 60,
            },
          });
        }
      }
    } catch (error) {
      console.error('Error batching notifications:', error);
      throw error;
    }
  }

  /**
   * Handle notification rescheduling
   */
  async handleRescheduling(
    notificationId: string,
    reason: string,
  ): Promise<void> {
    try {
      // Get notification details
      const { data: notification } = await supabase
        .from('notification_queue')
        .select('*')
        .eq('id', notificationId)
        .single();

      if (!notification) {
        throw new Error('Notification not found');
      }

      // Calculate new time based on reason
      let newTime: Date;
      const now = new Date();

      switch (reason) {
        case 'user_busy':
          newTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes later
          break;
        case 'quiet_hours':
          newTime = await this.getNextAvailableTime(notification.user_id, now);
          break;
        case 'frequency_limit':
          newTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour later
          break;
        default:
          newTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes later
      }

      // Update notification in queue
      const { error } = await supabase
        .from('notification_queue')
        .update({
          scheduled_for: newTime.toISOString(),
          status: 'pending',
          retry_count: (notification.retry_count || 0) + 1,
          last_error: null,
        })
        .eq('id', notificationId);

      if (error) {
        throw error;
      }

      console.log(
        `Notification ${notificationId} rescheduled for ${newTime.toISOString()}`,
      );
    } catch (error) {
      console.error('Error rescheduling notification:', error);
      throw error;
    }
  }

  /**
   * Check if time is within quiet hours
   */
  async isWithinQuietHours(userId: string, time: Date): Promise<boolean> {
    try {
      const preferences =
        await this.preferenceService.getUserPreferences(userId);

      if (!preferences.quietHours.enabled) {
        return false;
      }

      const currentHour = time.getHours();
      const currentMinute = time.getMinutes();
      const currentTimeMinutes = currentHour * 60 + currentMinute;

      const startTimeMinutes = this.parseTimeToMinutes(
        preferences.quietHours.start,
      );
      const endTimeMinutes = this.parseTimeToMinutes(
        preferences.quietHours.end,
      );

      // Handle overnight quiet hours (e.g., 22:00 to 08:00)
      if (startTimeMinutes > endTimeMinutes) {
        return (
          currentTimeMinutes >= startTimeMinutes ||
          currentTimeMinutes < endTimeMinutes
        );
      } else {
        return (
          currentTimeMinutes >= startTimeMinutes &&
          currentTimeMinutes < endTimeMinutes
        );
      }
    } catch (error) {
      console.error('Error checking quiet hours:', error);
      return false;
    }
  }

  /**
   * Get user's optimal notification times
   */
  async getOptimalTimes(userId: string): Promise<OptimalTime[]> {
    try {
      // Get user's engagement analytics
      const { data: analytics } = await supabase
        .from('notification_analytics')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!analytics || analytics.length === 0) {
        // Return default optimal times
        return this.getDefaultOptimalTimes();
      }

      // Analyze engagement patterns
      const timeEngagement = new Map<
        number,
        { count: number; engagement: number }
      >();

      analytics.forEach(analytic => {
        const hour = new Date(analytic.created_at).getHours();
        const engagement = analytic.open_rate || 0;

        if (!timeEngagement.has(hour)) {
          timeEngagement.set(hour, { count: 0, engagement: 0 });
        }

        const current = timeEngagement.get(hour)!;
        timeEngagement.set(hour, {
          count: current.count + 1,
          engagement:
            (current.engagement * current.count + engagement) /
            (current.count + 1),
        });
      });

      // Convert to OptimalTime array
      const optimalTimes: OptimalTime[] = [];
      timeEngagement.forEach((data, hour) => {
        optimalTimes.push({
          hour,
          dayOfWeek: 0, // Default to Sunday, could be enhanced
          engagementScore: data.engagement,
          context: this.getTimeContext(hour),
        });
      });

      return optimalTimes.sort((a, b) => b.engagementScore - a.engagementScore);
    } catch (error) {
      console.error('Error getting optimal times:', error);
      return this.getDefaultOptimalTimes();
    }
  }

  /**
   * Apply frequency controls to prevent notification spam
   */
  private async applyFrequencyControls(
    userId: string,
    notification: Notification,
    options: SmartSchedulingOptions,
  ): Promise<void> {
    try {
      const preferences =
        await this.preferenceService.getUserPreferences(userId);

      // Check daily notification count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: todayNotifications } = await supabase
        .from('notification_deliveries')
        .select('id')
        .eq('user_id', userId)
        .gte('sent_at', today.toISOString())
        .lt('sent_at', tomorrow.toISOString());

      const todayCount = todayNotifications?.length || 0;

      if (todayCount >= preferences.frequency.maxPerDay) {
        // Reschedule for tomorrow
        notification.scheduledFor = new Date(
          tomorrow.getTime() + 9 * 60 * 60 * 1000,
        ); // 9 AM tomorrow
        return;
      }

      // Check cooldown period
      const { data: recentNotifications } = await supabase
        .from('notification_deliveries')
        .select('sent_at')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false })
        .limit(1);

      if (recentNotifications && recentNotifications.length > 0) {
        const lastNotification = new Date(recentNotifications[0].sent_at);
        const timeSinceLastNotification =
          Date.now() - lastNotification.getTime();
        const cooldownMs = preferences.frequency.cooldownPeriod * 60 * 1000;

        if (timeSinceLastNotification < cooldownMs) {
          // Reschedule after cooldown period
          notification.scheduledFor = new Date(
            lastNotification.getTime() + cooldownMs,
          );
        }
      }
    } catch (error) {
      console.error('Error applying frequency controls:', error);
    }
  }

  /**
   * Schedule a notification in the database
   */
  private async scheduleNotification(
    notification: Notification,
  ): Promise<void> {
    try {
      // Use API layer for queue operations
      const { versionedApiClient } =
        await import('@/services/VersionedApiClient');

      const response = await versionedApiClient.addToNotificationQueue({
        notification_type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        scheduled_for:
          notification.scheduledFor?.toISOString() || new Date().toISOString(),
        priority: this.getPriorityNumber(notification.priority),
      });

      if (response.error) {
        throw new Error(
          response.message ||
            response.error ||
            'Failed to schedule notification',
        );
      }
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Get next available time outside quiet hours
   */
  private async getNextAvailableTime(
    userId: string,
    fromTime: Date,
  ): Promise<Date> {
    const preferences = await this.preferenceService.getUserPreferences(userId);
    const endQuietHours = this.getTimeFromString(preferences.quietHours.end);

    // If we're in quiet hours, schedule for after quiet hours end
    if (await this.isWithinQuietHours(userId, fromTime)) {
      return endQuietHours;
    }

    return fromTime;
  }

  /**
   * Group notifications by type for batching
   */
  private groupNotificationsByType(
    notifications: Notification[],
  ): Record<string, Notification[]> {
    return notifications.reduce(
      (groups, notification) => {
        const type = notification.type;
        if (!groups[type]) {
          groups[type] = [];
        }
        groups[type].push(notification);
        return groups;
      },
      {} as Record<string, Notification[]>,
    );
  }

  /**
   * Get batched notification title
   */
  private getBatchedTitle(type: string, count: number): string {
    const typeLabels: Record<string, string> = {
      reminder: 'Reminders',
      assignment: 'Assignments',
      lecture: 'Lectures',
      srs: 'Study Reviews',
      achievement: 'Achievements',
    };

    return `${count} ${typeLabels[type] || 'Notifications'}`;
  }

  /**
   * Get batched notification body
   */
  private getBatchedBody(notifications: Notification[]): string {
    if (notifications.length === 1) {
      return notifications[0].body;
    }

    return `You have ${notifications.length} new notifications`;
  }

  /**
   * Get highest priority from a group of notifications
   */
  private getHighestPriority(
    notifications: Notification[],
  ): 'urgent' | 'high' | 'normal' | 'low' {
    const priorityOrder: Record<'urgent' | 'high' | 'normal' | 'low', number> =
      { urgent: 4, high: 3, normal: 2, low: 1 };
    return notifications.reduce(
      (highest, current) =>
        priorityOrder[
          current.priority as 'urgent' | 'high' | 'normal' | 'low'
        ] > priorityOrder[highest as 'urgent' | 'high' | 'normal' | 'low']
          ? current.priority
          : highest,
      'normal' as 'urgent' | 'high' | 'normal' | 'low',
    );
  }

  /**
   * Add jitter to a time to avoid predictable patterns
   */
  private addJitter(time: Date, maxMinutes: number): Date {
    const jitter = (Math.random() - 0.5) * 2 * maxMinutes; // ±maxMinutes
    return new Date(time.getTime() + jitter * 60 * 1000);
  }

  /**
   * Get time from string (HH:MM format)
   */
  private getTimeFromString(timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  /**
   * Get time from hour (0-23)
   */
  private getTimeFromHour(hour: number): Date {
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    return date;
  }

  /**
   * Parse time string to minutes since midnight
   */
  private parseTimeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Get time context for analytics
   */
  private getTimeContext(hour: number): string {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Get default optimal times for new users
   */
  private getDefaultOptimalTimes(): OptimalTime[] {
    return [
      { hour: 9, dayOfWeek: 0, engagementScore: 0.8, context: 'morning' },
      { hour: 18, dayOfWeek: 0, engagementScore: 0.7, context: 'evening' },
      { hour: 12, dayOfWeek: 0, engagementScore: 0.6, context: 'afternoon' },
    ];
  }

  /**
   * Get priority as number for database storage
   */
  private getPriorityNumber(
    priority: 'urgent' | 'high' | 'normal' | 'low' | string,
  ): number {
    const priorityMap: Record<'urgent' | 'high' | 'normal' | 'low', number> = {
      urgent: 1,
      high: 2,
      normal: 3,
      low: 4,
    };
    const key = (
      ['urgent', 'high', 'normal', 'low'].includes(priority)
        ? priority
        : 'normal'
    ) as 'urgent' | 'high' | 'normal' | 'low';
    return priorityMap[key];
  }
}
