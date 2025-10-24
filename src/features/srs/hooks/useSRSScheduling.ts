import { useState, useCallback } from 'react';
import { SRSSchedulingService, SRSUserPreferences } from '../services/SRSSchedulingService';

export interface UseSRSSchedulingReturn {
  scheduleReminders: (
    sessionId: string,
    userId: string,
    sessionDate: Date,
    topic: string,
    preferences?: Partial<SRSUserPreferences>
  ) => Promise<void>;
  updatePreferences: (userId: string, preferences: Partial<SRSUserPreferences>) => Promise<void>;
  getUserPreferences: (userId: string) => Promise<SRSUserPreferences | null>;
  loading: boolean;
  error: string | null;
}

export const useSRSScheduling = (): UseSRSSchedulingReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const srsSchedulingService = SRSSchedulingService.getInstance();

  const scheduleReminders = useCallback(async (
    sessionId: string,
    userId: string,
    sessionDate: Date,
    topic: string,
    preferences?: Partial<SRSUserPreferences>
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      await srsSchedulingService.scheduleReminders(
        sessionId,
        userId,
        sessionDate,
        topic,
        preferences
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to schedule reminders';
      setError(errorMessage);
      console.error('❌ Error scheduling SRS reminders:', err);
    } finally {
      setLoading(false);
    }
  }, [srsSchedulingService]);

  const updatePreferences = useCallback(async (
    userId: string,
    preferences: Partial<SRSUserPreferences>
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      await srsSchedulingService.updateUserPreferences(userId, preferences);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences';
      setError(errorMessage);
      console.error('❌ Error updating SRS preferences:', err);
    } finally {
      setLoading(false);
    }
  }, [srsSchedulingService]);

  const getUserPreferences = useCallback(async (userId: string) => {
    try {
      return await srsSchedulingService.getUserPreferences(userId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get preferences';
      setError(errorMessage);
      console.error('❌ Error getting SRS preferences:', err);
      return null;
    }
  }, [srsSchedulingService]);

  return {
    scheduleReminders,
    updatePreferences,
    getUserPreferences,
    loading,
    error,
  };
};
