import {
  queueNotification,
  queueNotificationBatch,
  cancelQueuedNotification,
  getUserQueuedNotifications,
  getNotificationAnalytics,
} from '@/utils/notificationQueue';
import { supabase } from '@/services/supabase';

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('notificationQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('queueNotification', () => {
    it('should successfully queue a notification', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      (mockSupabase.from as jest.Mock).mockImplementation(table => {
        if (table === 'notification_queue') {
          return {
            select: mockSelect,
            insert: mockInsert,
          };
        }
        if (table === 'notification_deliveries') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                      single: jest
                        .fn()
                        .mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
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
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should detect duplicate notifications', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'existing-123' },
              error: null,
            }),
          }),
        }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
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
      expect(result.isDuplicate).toBe(true);
    });

    it('should handle database errors', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const mockInsert = jest.fn().mockResolvedValue({
        error: { message: 'Database error', code: '23505' },
      });

      (mockSupabase.from as jest.Mock).mockImplementation(table => {
        if (table === 'notification_queue') {
          return {
            select: mockSelect,
            insert: mockInsert,
          };
        }
        if (table === 'notification_deliveries') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                      single: jest
                        .fn()
                        .mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const notification = {
        user_id: 'user-123',
        notification_type: 'assignment_due',
        title: 'Assignment Due',
        body: 'Your assignment is due soon',
      };

      const result = await queueNotification(notification);

      // Duplicate key error should be treated as duplicate
      expect(result.success).toBe(true);
      expect(result.isDuplicate).toBe(true);
    });
  });

  describe('queueNotificationBatch', () => {
    it('should successfully queue multiple notifications', async () => {
      // Mock for checking existing notifications (returns empty - no duplicates)
      const mockSelectExisting = jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      // Mock for inserting notifications
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ id: 'notif-1' }, { id: 'notif-2' }],
          error: null,
        }),
      });

      (mockSupabase.from as jest.Mock).mockImplementation(table => {
        if (table === 'notification_queue') {
          return {
            select: mockSelectExisting,
            insert: mockInsert,
          };
        }
        return {};
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
      // Generate the actual deduplication key that will be created
      const now = new Date();
      const totalMinutes = Math.floor(now.getTime() / (1000 * 60));
      const bucketMinutes = Math.floor(totalMinutes / 1440) * 1440;
      const bucketDate = new Date(bucketMinutes * 60 * 1000);
      const bucketStr = bucketDate
        .toISOString()
        .slice(0, 16)
        .replace(/[-:T]/g, '');
      const expectedDedupKey = `user-123:assignment_due:item-1:${bucketStr}`;

      // Mock for checking existing notifications (returns one existing notification)
      const mockSelectExisting = jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            // Return one existing notification with a deduplication key that matches one in the batch
            data: [{ deduplication_key: expectedDedupKey }],
            error: null,
          }),
        }),
      });

      // Mock for inserting notifications (only one should be inserted since one is duplicate)
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ id: 'notif-2' }],
          error: null,
        }),
      });

      (mockSupabase.from as jest.Mock).mockImplementation(table => {
        if (table === 'notification_queue') {
          return {
            select: mockSelectExisting,
            insert: mockInsert,
          };
        }
        return {};
      });

      const notifications = [
        {
          user_id: 'user-123',
          notification_type: 'assignment_due',
          title: 'Assignment 1 Due',
          body: 'Body 1',
          data: { itemId: 'item-1' }, // This will match the existing dedup key
        },
        {
          user_id: 'user-123',
          notification_type: 'assignment_due',
          title: 'Assignment 2 Due',
          body: 'Body 2',
          data: { itemId: 'item-2' }, // This will be inserted
        },
      ];

      const result = await queueNotificationBatch(notifications);

      expect(result.success).toBe(true);
      expect(result.duplicates).toBeGreaterThan(0);
      expect(result.queued).toBe(1); // Only one should be queued
    });

    it('should handle errors in batch', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const mockInsert = jest.fn().mockResolvedValue({
        error: { message: 'Database error' },
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
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

      expect(result.success).toBe(false);
      expect(result.failed).toBeGreaterThan(0);
    });
  });

  describe('cancelQueuedNotification', () => {
    it('should successfully cancel a notification', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await cancelQueuedNotification('notif-123');

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should handle errors when canceling', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest
          .fn()
          .mockResolvedValue({ error: { message: 'Update failed' } }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

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

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockNotifications,
              error: null,
            }),
          }),
        }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      const result = await getUserQueuedNotifications('user-123');

      expect(result).toEqual(mockNotifications);
    });

    it('should return empty array on error', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      const result = await getUserQueuedNotifications('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getNotificationAnalytics', () => {
    it('should return analytics data', async () => {
      const mockData = [
        {
          notification_type: 'assignment_due',
          total_sent: 10,
          total_opened: 8,
          open_rate: 80,
          best_hour: 9,
        },
      ];

      (mockSupabase.rpc as jest.Mock).mockResolvedValue({
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

    it('should return default values when no data', async () => {
      (mockSupabase.rpc as jest.Mock).mockResolvedValue({
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
