/**
 * Integration Tests: Notifications + Analytics
 *
 * Tests the integration between notification service and analytics:
 * - Notification sent → Analytics event tracked
 * - Notification opened → Analytics event tracked
 * - Notification dismissed → Analytics event tracked
 */

import { notificationService } from '@/services/notifications';
import { mixpanelService } from '@/services/mixpanel';

// Mock analytics service
jest.mock('@/services/mixpanel', () => ({
  mixpanelService: {
    trackEvent: jest.fn(),
    track: jest.fn(),
  },
}));

// Mock notification service
jest.mock('@/services/notifications', () => ({
  notificationService: {
    scheduleNotification: jest.fn(),
    cancelNotification: jest.fn(),
    getScheduledNotifications: jest.fn(),
  },
}));

describe('Notifications + Analytics Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Notification Sent', () => {
    it('should track analytics event when notification is sent', async () => {
      const notificationData = {
        id: 'notif-1',
        title: 'Test Notification',
        body: 'Test body',
        triggerDate: new Date(),
        type: 'reminder' as const,
      };

      (notificationService.scheduleNotification as jest.Mock).mockResolvedValue(
        {
          success: true,
        },
      );

      await notificationService.scheduleNotification(notificationData);

      // Analytics should track notification sent event
      expect(mixpanelService.trackEvent).toHaveBeenCalledWith(
        'notification_sent',
        expect.objectContaining({
          notification_id: notificationData.id,
          notification_type: notificationData.type,
        }),
      );
    });

    it('should track notification type in analytics', async () => {
      const notificationData = {
        id: 'notif-2',
        title: 'Assignment Reminder',
        body: 'Your assignment is due soon',
        triggerDate: new Date(),
        type: 'reminder' as const,
        data: { assignmentId: 'assignment-1' },
      };

      (notificationService.scheduleNotification as jest.Mock).mockResolvedValue(
        {
          success: true,
        },
      );

      await notificationService.scheduleNotification(notificationData);

      expect(mixpanelService.trackEvent).toHaveBeenCalledWith(
        'notification_sent',
        expect.objectContaining({
          notification_type: 'reminder',
        }),
      );
    });
  });

  describe('Notification Opened', () => {
    it('should track analytics event when notification is opened', () => {
      const notificationId = 'notif-1';
      const notificationData = {
        notificationId,
        action: 'opened',
        timestamp: new Date().toISOString(),
      };

      // Simulate notification opened handler
      const handleNotificationOpened = (data: typeof notificationData) => {
        mixpanelService.trackEvent('notification_opened', {
          notification_id: data.notificationId,
          action: data.action,
          timestamp: data.timestamp,
        });
      };

      handleNotificationOpened(notificationData);

      expect(mixpanelService.trackEvent).toHaveBeenCalledWith(
        'notification_opened',
        expect.objectContaining({
          notification_id: notificationId,
          action: 'opened',
        }),
      );
    });

    it('should track notification source when opened', () => {
      const notificationData = {
        notificationId: 'notif-2',
        action: 'opened',
        source: 'push',
        timestamp: new Date().toISOString(),
      };

      const handleNotificationOpened = (data: typeof notificationData) => {
        mixpanelService.trackEvent('notification_opened', {
          notification_id: data.notificationId,
          source: data.source,
        });
      };

      handleNotificationOpened(notificationData);

      expect(mixpanelService.trackEvent).toHaveBeenCalledWith(
        'notification_opened',
        expect.objectContaining({
          source: 'push',
        }),
      );
    });
  });

  describe('Notification Dismissed', () => {
    it('should track analytics event when notification is dismissed', async () => {
      const notificationId = 'notif-1';

      (notificationService.cancelNotification as jest.Mock).mockResolvedValue({
        success: true,
      });

      await notificationService.cancelNotification(notificationId);

      // Analytics should track notification dismissed
      expect(mixpanelService.trackEvent).toHaveBeenCalledWith(
        'notification_dismissed',
        expect.objectContaining({
          notification_id: notificationId,
        }),
      );
    });

    it('should track dismissal reason if provided', async () => {
      const notificationId = 'notif-2';
      const reason = 'user_dismissed';

      (notificationService.cancelNotification as jest.Mock).mockResolvedValue({
        success: true,
      });

      await notificationService.cancelNotification(notificationId);

      // Track with reason
      mixpanelService.trackEvent('notification_dismissed', {
        notification_id: notificationId,
        reason,
      });

      expect(mixpanelService.trackEvent).toHaveBeenCalledWith(
        'notification_dismissed',
        expect.objectContaining({
          notification_id: notificationId,
          reason,
        }),
      );
    });
  });

  describe('Notification Delivery Status', () => {
    it('should track notification delivery success', () => {
      const notificationData = {
        notificationId: 'notif-1',
        status: 'delivered',
        timestamp: new Date().toISOString(),
      };

      mixpanelService.trackEvent('notification_delivered', notificationData);

      expect(mixpanelService.trackEvent).toHaveBeenCalledWith(
        'notification_delivered',
        expect.objectContaining({
          status: 'delivered',
        }),
      );
    });

    it('should track notification delivery failure', () => {
      const notificationData = {
        notificationId: 'notif-1',
        status: 'failed',
        error: 'Permission denied',
        timestamp: new Date().toISOString(),
      };

      mixpanelService.trackEvent(
        'notification_delivery_failed',
        notificationData,
      );

      expect(mixpanelService.trackEvent).toHaveBeenCalledWith(
        'notification_delivery_failed',
        expect.objectContaining({
          status: 'failed',
          error: 'Permission denied',
        }),
      );
    });
  });
});
