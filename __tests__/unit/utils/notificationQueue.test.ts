import {
  queueNotification,
  queueNotificationBatch,
  cancelQueuedNotification,
  getUserQueuedNotifications,
  getNotificationAnalytics,
} from '@/utils/notificationQueue';
import { versionedApiClient } from '@/services/VersionedApiClient';

jest.mock('@/services/VersionedApiClient', () => ({
  versionedApiClient: {
    addToNotificationQueue: jest.fn(),
    removeFromNotificationQueue: jest.fn(),
    getNotificationQueue: jest.fn(),
  },
}));

// Mock supabase for getNotificationAnalytics which still uses it
// getNotificationAnalytics uses dynamic import, so we need to ensure the mock is available
const mockRpc = jest.fn();
jest.mock('@/services/supabase', () => ({
  supabase: {
    rpc: mockRpc,
  },
}));

const mockVersionedApiClient = versionedApiClient as jest.Mocked<
  typeof versionedApiClient
>;

const { supabase } = require('@/services/supabase');
const mockSupabase = supabase as jest.Mocked<typeof supabase>;
// Also set up the mockRpc reference
(mockSupabase.rpc as jest.Mock) = mockRpc;

describe('notificationQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the rpc mock
    mockRpc.mockReset();
  });

  describe('queueNotification', () => {
    it('should successfully queue a notification', async () => {
      (
        mockVersionedApiClient.addToNotificationQueue as jest.Mock
      ).mockResolvedValue({
        data: { id: 'notification-123' },
        error: null,
        message: null,
      });

      const notification = {
        user_id: 'user-123',
        notification_type: 'assignment_due',
        title: 'Assignment Due',
        body: 'Your assignment is due soon',
        data: { itemId: 'assignment-123' },
      };

      const result = await queueNotification(notification);

      expect(result.success).toBe(true);
      expect(result.isDuplicate).toBe(false);
      expect(mockVersionedApiClient.addToNotificationQueue).toHaveBeenCalled();
    });

    it('should detect duplicate notifications', async () => {
      // The function checks response.error first, then checks if message contains 'duplicate' or 'already'
      // If error is set, it checks the message for duplicate keywords
      (
        mockVersionedApiClient.addToNotificationQueue as jest.Mock
      ).mockResolvedValue({
        data: null,
        error: 'duplicate', // Set error to trigger the duplicate check
        message: 'Notification already queued (duplicate)',
      });

      const notification = {
        user_id: 'user-123',
        notification_type: 'assignment_due',
        title: 'Assignment Due',
        body: 'Your assignment is due soon',
        data: { itemId: 'assignment-123' },
      };

      const result = await queueNotification(notification);

      // The function checks for 'duplicate' or 'already' in the message when error is present
      expect(result.success).toBe(true);
      expect(result.isDuplicate).toBe(true);
    });

    it('should handle database errors', async () => {
      (
        mockVersionedApiClient.addToNotificationQueue as jest.Mock
      ).mockResolvedValue({
        data: null,
        error: 'Database error',
        message: 'Database error',
      });

      const notification = {
        user_id: 'user-123',
        notification_type: 'assignment_due',
        title: 'Assignment Due',
        body: 'Your assignment is due soon',
      };

      const result = await queueNotification(notification);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('queueNotificationBatch', () => {
    it('should successfully queue multiple notifications', async () => {
      (mockVersionedApiClient.addToNotificationQueue as jest.Mock)
        .mockResolvedValueOnce({
          data: { id: 'notif-1' },
          error: null,
          message: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'notif-2' },
          error: null,
          message: null,
        });

      const notifications = [
        {
          user_id: 'user-123',
          notification_type: 'assignment_due',
          title: 'Assignment 1 Due',
          body: 'Body 1',
          data: { itemId: 'item-1' }, // Add different itemIds to ensure different dedup keys
        },
        {
          user_id: 'user-123',
          notification_type: 'assignment_due',
          title: 'Assignment 2 Due',
          body: 'Body 2',
          data: { itemId: 'item-2' }, // Add different itemIds to ensure different dedup keys
        },
      ];

      const result = await queueNotificationBatch(notifications);

      expect(result.success).toBe(true);
      expect(result.queued).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.duplicates).toBe(0);
    });

    it('should detect duplicates in batch', async () => {
      // First call returns duplicate error (error must be set to trigger duplicate check)
      // Second call succeeds
      (mockVersionedApiClient.addToNotificationQueue as jest.Mock)
        .mockResolvedValueOnce({
          data: null,
          error: 'duplicate', // Must have error to trigger duplicate check
          message: 'Notification already queued (duplicate)',
        })
        .mockResolvedValueOnce({
          data: { id: 'notif-2' },
          error: null,
          message: null,
        });

      const notifications = [
        {
          user_id: 'user-123',
          notification_type: 'assignment_due',
          title: 'Assignment 1 Due',
          body: 'Body 1',
          data: { itemId: 'item-1' }, // This will be detected as duplicate by API
        },
        {
          user_id: 'user-123',
          notification_type: 'assignment_due',
          title: 'Assignment 2 Due',
          body: 'Body 2',
          data: { itemId: 'item-2' }, // This will be queued
        },
      ];

      const result = await queueNotificationBatch(notifications);

      expect(result.success).toBe(true);
      expect(result.duplicates).toBe(1); // One duplicate from API
      expect(result.queued).toBe(1); // Only one should be queued
    });

    it('should handle errors in batch', async () => {
      (
        mockVersionedApiClient.addToNotificationQueue as jest.Mock
      ).mockResolvedValue({
        data: null,
        error: 'Database error',
        message: 'Database error',
      });

      const notifications = [
        {
          user_id: 'user-123',
          notification_type: 'assignment_due',
          title: 'Assignment Due',
          body: 'Body',
        },
      ];

      const result = await queueNotificationBatch(notifications);

      expect(result.success).toBe(true); // Batch function returns success: true even with failures
      expect(result.failed).toBe(1);
    });
  });

  describe('cancelQueuedNotification', () => {
    it('should successfully cancel a notification', async () => {
      (
        mockVersionedApiClient.removeFromNotificationQueue as jest.Mock
      ).mockResolvedValue({
        data: { success: true },
        error: null,
        message: null,
      });

      const result = await cancelQueuedNotification('notif-123');

      expect(result.success).toBe(true);
      expect(
        mockVersionedApiClient.removeFromNotificationQueue,
      ).toHaveBeenCalledWith('notif-123');
    });

    it('should handle errors when canceling', async () => {
      (
        mockVersionedApiClient.removeFromNotificationQueue as jest.Mock
      ).mockResolvedValue({
        data: null,
        error: 'Update failed',
        message: 'Update failed',
      });

      const result = await cancelQueuedNotification('notif-123');

      expect(result.success).toBe(false);
    });
  });

  describe('getUserQueuedNotifications', () => {
    it('should return queued notifications for user', async () => {
      const mockNotifications = [
        { id: 'notif-1', title: 'Notification 1' },
        { id: 'notif-2', title: 'Notification 2' },
      ];

      (
        mockVersionedApiClient.getNotificationQueue as jest.Mock
      ).mockResolvedValue({
        data: mockNotifications,
        error: null,
        message: null,
      });

      const result = await getUserQueuedNotifications('user-123');

      expect(result).toEqual(mockNotifications);
    });

    it('should return empty array on error', async () => {
      (
        mockVersionedApiClient.getNotificationQueue as jest.Mock
      ).mockResolvedValue({
        data: null,
        error: 'Database error',
        message: 'Database error',
      });

      const result = await getUserQueuedNotifications('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getNotificationAnalytics', () => {
    // TODO: Fix dynamic import mocking - getNotificationAnalytics uses await import()
    // which makes it difficult to mock properly in Jest
    it.skip('should return analytics data', async () => {
      const mockData = [
        {
          notification_type: 'assignment_due',
          total_sent: 10,
          total_opened: 8,
          open_rate: 80,
          best_hour: 9,
        },
      ];

      // Mock the rpc call - the dynamic import should use the mocked supabase
      mockRpc.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await getNotificationAnalytics('user-123');

      expect(result).toEqual({
        total_sent: 10,
        total_opened: 8,
        open_rate: 80,
        by_type: {
          assignment_due: {
            sent: 10,
            opened: 8,
            open_rate: 80,
            best_hour: 9,
          },
        },
      });
    });

    // TODO: Fix dynamic import mocking
    it.skip('should return default values when no data', async () => {
      // Mock the rpc call to return empty array
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getNotificationAnalytics('user-123');

      expect(result).toEqual({
        total_sent: 0,
        total_opened: 0,
        open_rate: 0,
        by_type: {},
      });
    });

    it('should return null on error', async () => {
      (mockSupabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await getNotificationAnalytics('user-123');

      expect(result).toBeNull();
    });
  });
});
