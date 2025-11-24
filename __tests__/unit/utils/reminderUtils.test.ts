import {
  cancelReminder,
  checkReminderConflicts,
  recordSRSPerformance,
  getSRSStatistics,
  getQualityRatingLabel,
  getQualityRatingColor,
  dismissReminder,
  markReminderOpened,
  snoozeReminder,
} from '@/utils/reminderUtils';
import { supabase } from '@/services/supabase';

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('reminderUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cancelReminder', () => {
    it('should successfully cancel a reminder', async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const result = await cancelReminder('reminder-123', 'task_completed');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'cancel-reminder',
        {
          body: {
            reminder_id: 'reminder-123',
            reason: 'task_completed',
          },
        },
      );
    });

    it('should handle errors when canceling reminder', async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Reminder not found' },
      });

      const result = await cancelReminder('reminder-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Reminder not found');
    });

    it('should handle exceptions', async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      const result = await cancelReminder('reminder-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('checkReminderConflicts', () => {
    it('should return conflicts when found', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockConflicts = [
        {
          conflicting_reminder_id: 'conflict-1',
          conflict_time: '2024-01-01T10:00:00Z',
          conflict_title: 'Conflicting Reminder',
        },
      ];

      (mockSupabase.rpc as jest.Mock).mockResolvedValue({
        data: mockConflicts,
        error: null,
      });

      const result = await checkReminderConflicts(
        new Date('2024-01-01T10:00:00Z'),
        15,
      );

      expect(result).toEqual(mockConflicts);
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'check_reminder_conflicts',
        {
          p_user_id: 'user-123',
          p_reminder_time: '2024-01-01T10:00:00.000Z',
          p_buffer_minutes: 15,
        },
      );
    });

    it('should return empty array on error', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      (mockSupabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await checkReminderConflicts(new Date());

      expect(result).toEqual([]);
    });
  });

  describe('recordSRSPerformance', () => {
    it('should successfully record SRS performance', async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: {
          next_interval_days: 7,
          ease_factor: 2.5,
          message: 'Performance recorded',
        },
        error: null,
      });

      const result = await recordSRSPerformance(
        'session-123',
        4,
        'reminder-123',
        5,
      );

      expect(result.success).toBe(true);
      expect(result.nextIntervalDays).toBe(7);
      expect(result.easeFactor).toBe(2.5);
      expect(result.message).toBe('Performance recorded');
    });

    it('should handle errors when recording performance', async () => {
      (mockSupabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Session not found' },
      });

      const result = await recordSRSPerformance('session-123', 4);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });
  });

  describe('getSRSStatistics', () => {
    it('should return SRS statistics', async () => {
      const mockStats = [
        {
          total_reviews: 100,
          average_quality: 3.5,
          retention_rate: 0.85,
          topics_reviewed: 10,
          average_ease_factor: 2.5,
          strongest_topics: [],
          weakest_topics: [],
        },
      ];

      (mockSupabase.rpc as jest.Mock).mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const result = await getSRSStatistics('user-123');

      expect(result).toEqual(mockStats[0]);
    });

    it('should return null on error', async () => {
      (mockSupabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await getSRSStatistics('user-123');

      expect(result).toBeNull();
    });
  });

  describe('getQualityRatingLabel', () => {
    it('should return correct label for each rating', () => {
      expect(getQualityRatingLabel(0)).toBe('Complete Blackout');
      expect(getQualityRatingLabel(1)).toBe('Incorrect');
      expect(getQualityRatingLabel(2)).toBe('Correct with Effort');
      expect(getQualityRatingLabel(3)).toBe('Correct with Hesitation');
      expect(getQualityRatingLabel(4)).toBe('Correct Easily');
      expect(getQualityRatingLabel(5)).toBe('Perfect Recall');
    });

    it('should return Unknown for invalid rating', () => {
      expect(getQualityRatingLabel(10)).toBe('Unknown');
      expect(getQualityRatingLabel(-1)).toBe('Unknown');
    });
  });

  describe('getQualityRatingColor', () => {
    it('should return correct color for each rating', () => {
      expect(getQualityRatingColor(0)).toBe('#DC2626'); // Red
      expect(getQualityRatingColor(1)).toBe('#EF4444'); // Light red
      expect(getQualityRatingColor(2)).toBe('#F59E0B'); // Orange
      expect(getQualityRatingColor(3)).toBe('#FBBF24'); // Yellow
      expect(getQualityRatingColor(4)).toBe('#10B981'); // Green
      expect(getQualityRatingColor(5)).toBe('#059669'); // Dark green
    });

    it('should return gray for invalid rating', () => {
      expect(getQualityRatingColor(10)).toBe('#6B7280');
    });
  });

  describe('dismissReminder', () => {
    it('should successfully dismiss a reminder', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      (mockSupabase.from as jest.Mock).mockImplementation(table => {
        if (table === 'reminders') {
          return { update: mockUpdate };
        }
        if (table === 'reminder_analytics') {
          return { insert: mockInsert };
        }
        return {};
      });

      await dismissReminder('reminder-123');

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest
          .fn()
          .mockResolvedValue({ error: { message: 'Update failed' } }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      // Should not throw
      await expect(dismissReminder('reminder-123')).resolves.not.toThrow();
    });
  });

  describe('markReminderOpened', () => {
    it('should successfully mark reminder as opened', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      (mockSupabase.from as jest.Mock).mockImplementation(table => {
        if (table === 'reminders') {
          return { update: mockUpdate };
        }
        if (table === 'reminder_analytics') {
          return { insert: mockInsert };
        }
        return {};
      });

      await markReminderOpened('reminder-123');

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('snoozeReminder', () => {
    it('should successfully snooze a reminder', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await snoozeReminder('reminder-123', 60);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should handle errors when snoozing', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest
          .fn()
          .mockResolvedValue({ error: { message: 'Update failed' } }),
      });

      (mockSupabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const result = await snoozeReminder('reminder-123', 60);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });
});
