/**
 * Service Response Types
 *
 * Defines common types for service responses across the application.
 * Used to replace `any` types in service files.
 */

import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Standard Supabase response wrapper
 */
export interface SupabaseResponse<T> {
  data: T | null;
  error: PostgrestError | null;
}

/**
 * Notification service response
 */
export interface NotificationServiceResponse<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
  isDuplicate?: boolean;
}

/**
 * Analytics event structure
 */
export interface AnalyticsEvent {
  name: string;
  properties: Record<string, unknown>;
  timestamp: number;
  userId?: string;
  sessionId?: string;
}

/**
 * RevenueCat error structure
 */
export interface RevenueCatError {
  code?: string;
  message?: string;
  underlyingErrorMessage?: string;
}

/**
 * Processing batch result
 */
export interface BatchResult {
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
}

/**
 * User data from Supabase (for analytics processing)
 */
export interface AnalyticsUser {
  id: string;
  subscription_tier: string;
  last_activity: string;
  timezone: string;
}

/**
 * Study session data structure
 */
export interface StudySessionData {
  id: string;
  user_id: string;
  subject?: string;
  duration?: number;
  created_at: string;
  [key: string]: unknown;
}

/**
 * Task data structure
 */
export interface TaskData {
  id: string;
  user_id: string;
  type: string;
  subject?: string;
  status: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}
