import { NotificationService } from '@/services/notifications/NotificationService';
import { createMockUser, createMockNotification, createMockSupabaseClient } from '@tests/utils/testUtils';

// Mock the individual services
jest.mock('@/services/notifications/NotificationDeliveryService');
jest.mock('@/services/notifications/NotificationPreferenceService');
jest.mock('@/services/notifications/NotificationSchedulingService');
jest.mock('@/services/notifications/NotificationAnalyticsService');

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    notificationService = NotificationService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = NotificationService.getInstance();
      const instance2 = NotificationService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('delivery service', () => {
    it('should have delivery service available', () => {
      expect(notificationService.delivery).toBeDefined();
    });

    it('should schedule notification through delivery service', async () => {
      const mockNotification = createMockNotification();
      const mockUser = createMockUser();
      
      const mockSchedule = jest.fn().mockResolvedValue({ success: true });
      notificationService.delivery.scheduleNotification = mockSchedule;

      const result = await notificationService.delivery.scheduleNotification(
        mockUser,
        mockNotification
      );

      expect(mockSchedule).toHaveBeenCalledWith(mockUser, mockNotification);
      expect(result.success).toBe(true);
    });

    it('should send push notification through delivery service', async () => {
      const mockUser = createMockUser();
      const notificationData = {
        title: 'Test',
        body: 'Test notification',
        data: { type: 'reminder' }
      };

      const mockSendPush = jest.fn().mockResolvedValue({ success: true });
      notificationService.delivery.sendPushNotification = mockSendPush;

      const result = await notificationService.delivery.sendPushNotification(
        mockUser,
        notificationData
      );

      expect(mockSendPush).toHaveBeenCalledWith(mockUser, notificationData);
      expect(result.success).toBe(true);
    });
  });

  describe('preferences service', () => {
    it('should have preferences service available', () => {
      expect(notificationService.preferences).toBeDefined();
    });

    it('should get user preferences', async () => {
      const mockUser = createMockUser();
      const mockPreferences = {
        enabled: true,
        quiet_hours: { start: '22:00', end: '08:00' },
        types: { reminders: true, updates: false }
      };

      const mockGetPreferences = jest.fn().mockResolvedValue(mockPreferences);
      notificationService.preferences.getUserPreferences = mockGetPreferences;

      const result = await notificationService.preferences.getUserPreferences(mockUser);

      expect(mockGetPreferences).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockPreferences);
    });

    it('should update user preferences', async () => {
      const mockUser = createMockUser();
      const newPreferences = {
        enabled: false,
        quiet_hours: { start: '23:00', end: '07:00' }
      };

      const mockUpdatePreferences = jest.fn().mockResolvedValue({ success: true });
      notificationService.preferences.updateUserPreferences = mockUpdatePreferences;

      const result = await notificationService.preferences.updateUserPreferences(
        mockUser,
        newPreferences
      );

      expect(mockUpdatePreferences).toHaveBeenCalledWith(mockUser, newPreferences);
      expect(result.success).toBe(true);
    });
  });

  describe('scheduling service', () => {
    it('should have scheduling service available', () => {
      expect(notificationService.scheduling).toBeDefined();
    });

    it('should schedule reminder', async () => {
      const mockUser = createMockUser();
      const reminderData = {
        title: 'Study Reminder',
        body: 'Time to study!',
        scheduled_for: new Date(Date.now() + 3600000).toISOString()
      };

      const mockScheduleReminder = jest.fn().mockResolvedValue({ success: true, id: 'reminder-1' });
      notificationService.scheduling.scheduleReminder = mockScheduleReminder;

      const result = await notificationService.scheduling.scheduleReminder(
        mockUser,
        reminderData
      );

      expect(mockScheduleReminder).toHaveBeenCalledWith(mockUser, reminderData);
      expect(result.success).toBe(true);
      expect(result.id).toBe('reminder-1');
    });

    it('should cancel scheduled reminder', async () => {
      const mockUser = createMockUser();
      const reminderId = 'reminder-1';

      const mockCancelReminder = jest.fn().mockResolvedValue({ success: true });
      notificationService.scheduling.cancelReminder = mockCancelReminder;

      const result = await notificationService.scheduling.cancelReminder(
        mockUser,
        reminderId
      );

      expect(mockCancelReminder).toHaveBeenCalledWith(mockUser, reminderId);
      expect(result.success).toBe(true);
    });
  });

  describe('analytics service', () => {
    it('should have analytics service available', () => {
      expect(notificationService.analytics).toBeDefined();
    });

    it('should track notification sent', async () => {
      const mockUser = createMockUser();
      const notificationData = {
        type: 'reminder',
        title: 'Test Notification'
      };

      const mockTrackSent = jest.fn().mockResolvedValue({ success: true });
      notificationService.analytics.trackNotificationSent = mockTrackSent;

      const result = await notificationService.analytics.trackNotificationSent(
        mockUser,
        notificationData
      );

      expect(mockTrackSent).toHaveBeenCalledWith(mockUser, notificationData);
      expect(result.success).toBe(true);
    });

    it('should get notification analytics', async () => {
      const mockUser = createMockUser();
      const mockAnalytics = {
        total_sent: 10,
        total_opened: 8,
        open_rate: 0.8,
        last_30_days: 5
      };

      const mockGetAnalytics = jest.fn().mockResolvedValue(mockAnalytics);
      notificationService.analytics.getUserAnalytics = mockGetAnalytics;

      const result = await notificationService.analytics.getUserAnalytics(mockUser);

      expect(mockGetAnalytics).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockAnalytics);
    });
  });

  describe('error handling', () => {
    it('should handle delivery service errors gracefully', async () => {
      const mockUser = createMockUser();
      const mockNotification = createMockNotification();

      const mockSchedule = jest.fn().mockRejectedValue(new Error('Delivery failed'));
      notificationService.delivery.scheduleNotification = mockSchedule;

      await expect(
        notificationService.delivery.scheduleNotification(mockUser, mockNotification)
      ).rejects.toThrow('Delivery failed');
    });

    it('should handle preferences service errors gracefully', async () => {
      const mockUser = createMockUser();

      const mockGetPreferences = jest.fn().mockRejectedValue(new Error('Preferences failed'));
      notificationService.preferences.getUserPreferences = mockGetPreferences;

      await expect(
        notificationService.preferences.getUserPreferences(mockUser)
      ).rejects.toThrow('Preferences failed');
    });

    it('should handle scheduling service errors gracefully', async () => {
      const mockUser = createMockUser();
      const reminderData = { title: 'Test', scheduled_for: new Date().toISOString() };

      const mockScheduleReminder = jest.fn().mockRejectedValue(new Error('Scheduling failed'));
      notificationService.scheduling.scheduleReminder = mockScheduleReminder;

      await expect(
        notificationService.scheduling.scheduleReminder(mockUser, reminderData)
      ).rejects.toThrow('Scheduling failed');
    });

    it('should handle analytics service errors gracefully', async () => {
      const mockUser = createMockUser();
      const notificationData = { type: 'reminder' };

      const mockTrackSent = jest.fn().mockRejectedValue(new Error('Analytics failed'));
      notificationService.analytics.trackNotificationSent = mockTrackSent;

      await expect(
        notificationService.analytics.trackNotificationSent(mockUser, notificationData)
      ).rejects.toThrow('Analytics failed');
    });
  });

  describe('integration between services', () => {
    it('should coordinate between delivery and analytics services', async () => {
      const mockUser = createMockUser();
      const mockNotification = createMockNotification();

      // Mock successful delivery
      const mockSchedule = jest.fn().mockResolvedValue({ success: true, id: 'notification-1' });
      notificationService.delivery.scheduleNotification = mockSchedule;

      // Mock analytics tracking
      const mockTrackSent = jest.fn().mockResolvedValue({ success: true });
      notificationService.analytics.trackNotificationSent = mockTrackSent;

      // Simulate the flow
      const deliveryResult = await notificationService.delivery.scheduleNotification(
        mockUser,
        mockNotification
      );

      if (deliveryResult.success) {
        await notificationService.analytics.trackNotificationSent(
          mockUser,
          { type: mockNotification.type, title: mockNotification.title }
        );
      }

      expect(mockSchedule).toHaveBeenCalledWith(mockUser, mockNotification);
      expect(mockTrackSent).toHaveBeenCalledWith(
        mockUser,
        { type: mockNotification.type, title: mockNotification.title }
      );
    });
  });
});
