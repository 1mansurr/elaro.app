// Export all analytics services
export {
  weeklyAnalyticsService,
  WeeklyAnalyticsService,
} from './WeeklyAnalyticsService';
export {
  batchProcessingService,
  BatchProcessingService,
} from './BatchProcessingService';

// Export types for convenience
export type {
  WeeklyReport,
  WeeklyReportData,
  SubjectBreakdown,
  CompletionRates,
  DailyActivity,
  Achievement,
  ReportTemplate,
} from './WeeklyAnalyticsService';

export type {
  BatchProcessingLog,
  ProcessingUser,
} from './BatchProcessingService';
