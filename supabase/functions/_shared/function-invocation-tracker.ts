/**
 * Edge Function Invocation Tracker
 * 
 * Tracks function invocations for monitoring and cost optimization
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { logger } from './logging.ts';

export interface InvocationRecord {
  functionName: string;
  durationMs?: number;
  statusCode?: number;
  errorMessage?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Record a function invocation
 */
export async function recordInvocation(
  supabaseClient: SupabaseClient,
  record: InvocationRecord,
): Promise<void> {
  try {
    const { error } = await supabaseClient.rpc('record_function_invocation', {
      p_function_name: record.functionName,
      p_duration_ms: record.durationMs || null,
      p_status_code: record.statusCode || null,
      p_error_message: record.errorMessage || null,
      p_user_id: record.userId || null,
      p_metadata: record.metadata || null,
    });

    if (error) {
      await logger.error('Failed to record function invocation', {
        error: error.message,
        function_name: record.functionName,
      });
    }
  } catch (error) {
    await logger.error('Exception recording function invocation', {
      error: error instanceof Error ? error.message : String(error),
      function_name: record.functionName,
    });
  }
}

/**
 * Check for high-frequency functions
 */
export async function checkHighFrequencyFunctions(
  supabaseClient: SupabaseClient,
): Promise<Array<{
  functionName: string;
  invocationCount: number;
  threshold: number;
  alertNeeded: boolean;
}>> {
  try {
    const { data, error } = await supabaseClient.rpc('check_high_frequency_functions');

    if (error) {
      await logger.error('Failed to check high frequency functions', {
        error: error.message,
      });
      return [];
    }

    return (data || []).map((row: any) => ({
      functionName: row.function_name,
      invocationCount: row.invocation_count,
      threshold: row.threshold,
      alertNeeded: row.alert_needed,
    }));
  } catch (error) {
    await logger.error('Exception checking high frequency functions', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Check for high error rate functions
 */
export async function checkHighErrorRateFunctions(
  supabaseClient: SupabaseClient,
): Promise<Array<{
  functionName: string;
  errorRate: number;
  errorCount: number;
  totalCount: number;
  alertNeeded: boolean;
}>> {
  try {
    const { data, error } = await supabaseClient.rpc('check_high_error_rate_functions');

    if (error) {
      await logger.error('Failed to check high error rate functions', {
        error: error.message,
      });
      return [];
    }

    return (data || []).map((row: any) => ({
      functionName: row.function_name,
      errorRate: Number(row.error_rate),
      errorCount: row.error_count,
      totalCount: row.total_count,
      alertNeeded: row.alert_needed,
    }));
  } catch (error) {
    await logger.error('Exception checking high error rate functions', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

