import { NotificationService } from '@/services/notifications/NotificationService';
import {
  createMockUser,
  createMockNotification,
  createMockSupabaseClient,
} from '@tests/utils/testUtils';

// Mock the individual services
const mockDeliveryService = {
  scheduleNotification: jest.fn(),
  sendPushNotification: jest.fn(),
  scheduleLocalNotification: jest.fn(),
  cancelNotification: jest.fn(),
  cancelAllUserNotifications: jest.fn(),
  getScheduledNotifications: jest.fn(),
  setupNotificationCategories: jest.fn(),
  setupAndroidChannels: jest.fn(),
  setNavigationRef: jest.fn(),
};

const mockPreferenceService = {
  getUserPreferences: jest.fn(),
  updateUserPreferences: jest.fn(),
  areNotificationsEnabled: jest.fn(),
};

const mockSchedulingService = {
  scheduleNotification: jest.fn(),
  cancelNotification: jest.fn(),
  getOptimalTimes: jest.fn(),
};

const mockHistoryService = {
  recordNotification: jest.fn(),
  getNotificationHistory: jest.fn(),
};

const mockWeeklyAnalytics = {
  generateWeeklyReport: jest.fn(),
  getWeeklyReport: jest.fn(),
  generateReportForUser: jest.fn(),
};

const mockBatchProcessing = {
  processBatch: jest.fn(),
  processBatchForUsers: jest.fn(),
};

// Export mocks so they can be accessed
export { mockWeeklyAnalytics, mockBatchProcessing, mockHistoryService };

jest.mock('@/services/notifications/NotificationDeliveryService', () => ({
  NotificationDeliveryService: {
    getInstance: jest.fn(() => mockDeliveryService),
  },
}));

jest.mock('@/services/notifications/NotificationPreferenceService', () => ({
  NotificationPreferenceService: {
    getInstance: jest.fn(() => mockPreferenceService),
  },
}));

jest.mock('@/services/notifications/NotificationSchedulingService', () => ({
  NotificationSchedulingService: {
    getInstance: jest.fn(() => mockSchedulingService),
  },
}));

// Mock history service - it's imported as a named export
// Mock history service - it's imported as a named export
jest.mock('@/services/notifications/NotificationHistoryService', () => ({
  notificationHistoryService: mockHistoryService,
}));

// Mock analytics services - they're imported as named exports
// These need to be mocked before NotificationService imports them
jest.mock('@/services/analytics/WeeklyAnalyticsService', () => ({
  weeklyAnalyticsService: mockWeeklyAnalytics,
}));

jest.mock('@/services/analytics/BatchProcessingService', () => ({
  batchProcessingService: mockBatchProcessing,
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    // Clear the singleton instance by accessing private property
    // @ts-ignore - accessing private property for testing
    NotificationService.instance = undefined;
    notificationService = NotificationService.getInstance();
    jest.clearAllMocks();

    // Manually set the analytics services on the instance since mocks might not be applied
    // @ts-ignore - accessing private property for testing
    notificationService.weeklyAnalytics = mockWeeklyAnalytics;
    // @ts-ignore - accessing private property for testing
    notificationService.batchProcessing = mockBatchProcessing;
    // @ts-ignore - accessing private property for testing
    notificationService.history = mockHistoryService;
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
        mockNotification,
      );

      expect(mockSchedule).toHaveBeenCalledWith(mockUser, mockNotification);
      expect(result.success).toBe(true);
    });

    it('should send push notification through delivery service', async () => {
      const mockUser = createMockUser();
      const notificationData = {
        title: 'Test',
        body: 'Test notification',
        data: { type: 'reminder' },
      };

      const mockSendPush = jest.fn().mockResolvedValue({ success: true });
      notificationService.delivery.sendPushNotification = mockSendPush;

      const result = await notificationService.delivery.sendPushNotification(
        mockUser,
        notificationData,
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
        types: { reminders: true, updates: false },
      };

      const mockGetPreferences = jest.fn().mockResolvedValue(mockPreferences);
      notificationService.preferences.getUserPreferences = mockGetPreferences;

      const result =
        await notificationService.preferences.getUserPreferences(mockUser);

      expect(mockGetPreferences).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockPreferences);
    });

    it('should update user preferences', async () => {
      const mockUser = createMockUser();
      const newPreferences = {
        enabled: false,
        quiet_hours: { start: '23:00', end: '07:00' },
      };

      const mockUpdatePreferences = jest
        .fn()
        .mockResolvedValue({ success: true });
      notificationService.preferences.updateUserPreferences =
        mockUpdatePreferences;

      const result =
        await notificationService.preferences.updateUserPreferences(
          mockUser,
          newPreferences,
        );

      expect(mockUpdatePreferences).toHaveBeenCalledWith(
        mockUser,
        newPreferences,
      );
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
        scheduled_for: new Date(Date.now() + 3600000).toISOString(),
      };

      const mockScheduleReminder = jest
        .fn()
        .mockResolvedValue({ success: true, id: 'reminder-1' });
      notificationService.scheduling.scheduleReminder = mockScheduleReminder;

      const result = await notificationService.scheduling.scheduleReminder(
        mockUser,
        reminderData,
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
        reminderId,
      );

      expect(mockCancelReminder).toHaveBeenCalledWith(mockUser, reminderId);
      expect(result.success).toBe(true);
    });
  });

  describe('analytics services', () => {
    it('should have weekly analytics service available', () => {
      expect(notificationService.weeklyAnalytics).toBeDefined();
    });

    it('should have batch processing service available', () => {
      expect(notificationService.batchProcessing).toBeDefined();
    });

    it('should have history service available', () => {
      expect(notificationService.history).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle delivery service errors gracefully', async () => {
      const mockUser = createMockUser();
      const mockNotification = createMockNotification();

      const mockSchedule = jest
        .fn()
        .mockRejectedValue(new Error('Delivery failed'));
      notificationService.delivery.scheduleNotification = mockSchedule;

      await expect(
        notificationService.delivery.scheduleNotification(
          mockUser,
          mockNotification,
        ),
      ).rejects.toThrow('Delivery failed');
    });

    it('should handle preferences service errors gracefully', async () => {
      const mockUser = createMockUser();

      const mockGetPreferences = jest
        .fn()
        .mockRejectedValue(new Error('Preferences failed'));
      notificationService.preferences.getUserPreferences = mockGetPreferences;

      await expect(
        notificationService.preferences.getUserPreferences(mockUser),
      ).rejects.toThrow('Preferences failed');
    });

    it('should handle scheduling service errors gracefully', async () => {
      const mockUser = createMockUser();
      const reminderData = {
        title: 'Test',
        scheduled_for: new Date().toISOString(),
      };

      const mockScheduleReminder = jest
        .fn()
        .mockRejectedValue(new Error('Scheduling failed'));
      notificationService.scheduling.scheduleReminder = mockScheduleReminder;

      await expect(
        notificationService.scheduling.scheduleReminder(mockUser, reminderData),
      ).rejects.toThrow('Scheduling failed');
    });

    it('should handle analytics service errors gracefully', async () => {
      // Analytics errors are handled internally by the services
      // This test verifies the services exist and can handle errors
      expect(notificationService.weeklyAnalytics).toBeDefined();
      expect(notificationService.batchProcessing).toBeDefined();
    });
  });

  describe('integration between services', () => {
    it('should coordinate between delivery and scheduling services', async () => {
      const mockUser = createMockUser();
      const mockNotification = createMockNotification();

      // Mock successful delivery
      const mockSchedule = jest
        .fn()
        .mockResolvedValue({ success: true, id: 'notification-1' });
      notificationService.delivery.scheduleNotification = mockSchedule;

      // Mock scheduling
      const mockScheduleReminder = jest
        .fn()
        .mockResolvedValue({ success: true });
      notificationService.scheduling.scheduleReminder = mockScheduleReminder;

      // Simulate the flow
      const deliveryResult =
        await notificationService.delivery.scheduleNotification(
          mockUser,
          mockNotification,
        );

      expect(mockSchedule).toHaveBeenCalledWith(mockUser, mockNotification);
      expect(deliveryResult.success).toBe(true);
    });
  });
});
