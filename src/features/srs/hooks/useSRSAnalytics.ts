import { useState, useCallback } from 'react';
import { SRSAnalyticsService, LearningInsights, PerformanceDashboard } from '../services/SRSAnalyticsService';

export interface UseSRSAnalyticsReturn {
  generateLearningInsights: (userId: string) => Promise<LearningInsights | null>;
  getPerformanceDashboard: (userId: string) => Promise<PerformanceDashboard | null>;
  loading: boolean;
  error: string | null;
}

export const useSRSAnalytics = (): UseSRSAnalyticsReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const srsAnalyticsService = SRSAnalyticsService.getInstance();

  const generateLearningInsights = useCallback(async (userId: string): Promise<LearningInsights | null> => {
    try {
      setLoading(true);
      setError(null);
      
      return await srsAnalyticsService.generateLearningInsights(userId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate learning insights';
      setError(errorMessage);
      console.error('❌ Error generating learning insights:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [srsAnalyticsService]);

  const getPerformanceDashboard = useCallback(async (userId: string): Promise<PerformanceDashboard | null> => {
    try {
      setLoading(true);
      setError(null);
      
      return await srsAnalyticsService.getPerformanceDashboard(userId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get performance dashboard';
      setError(errorMessage);
      console.error('❌ Error getting performance dashboard:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [srsAnalyticsService]);

  return {
    generateLearningInsights,
    getPerformanceDashboard,
    loading,
    error,
  };
};
