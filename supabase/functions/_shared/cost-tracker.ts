/**
 * Cost Tracking Utility
 *
 * Records API costs for monitoring and budget tracking
 */

// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { logger } from './logging.ts';

interface CostRecord {
  serviceName: string;
  operationType: string;
  quantity: number;
  unitCost: number;
  timestamp: string;
}

/**
 * Record API cost in the database
 */
export async function recordApiCost(
  supabaseClient: SupabaseClient,
  cost: CostRecord,
): Promise<void> {
  try {
    const totalCost = cost.quantity * cost.unitCost;

    const { error } = await supabaseClient.rpc('record_api_cost', {
      p_service_name: cost.serviceName,
      p_operation_type: cost.operationType,
      p_quantity: cost.quantity,
      p_unit_cost: cost.unitCost,
      p_total_cost: totalCost,
      p_date: cost.timestamp.split('T')[0], // Extract date
    });

    if (error) {
      await logger.error('Failed to record API cost', {
        error: error.message,
        cost,
      });
    } else {
      await logger.info('API cost recorded', {
        service: cost.serviceName,
        operation: cost.operationType,
        quantity: cost.quantity,
        totalCost,
      });
    }
  } catch (error) {
    await logger.error('Exception recording API cost', {
      error: error instanceof Error ? error.message : String(error),
      cost,
    });
  }
}

/**
 * Get cost summary for a service in current month
 */
export async function getMonthlyCost(
  supabaseClient: SupabaseClient,
  serviceName: string,
): Promise<number> {
  try {
    const { data, error } = await supabaseClient.rpc(
      'get_current_month_spend',
      {
        p_service_name: serviceName,
      },
    );

    if (error) {
      await logger.error('Failed to get monthly cost', {
        error: error.message,
        serviceName,
      });
      return 0;
    }

    return data?.total_spend || 0;
  } catch (error) {
    await logger.error('Exception getting monthly cost', {
      error: error instanceof Error ? error.message : String(error),
      serviceName,
    });
    return 0;
  }
}

/**
 * Default cost per operation
 *
 * ⚠️ ACTION REQUIRED: Verify these costs match your actual service pricing.
 * See COST_VERIFICATION_GUIDE.md for step-by-step verification instructions.
 *
 * VERIFICATION TEMPLATE:
 * - Check service pricing pages or invoices
 * - Update the cost values below
 * - Add verification date, source link, and plan name
 * - Update COST_VERIFICATION_GUIDE.md with the same information
 *
 * Last verified: 2025-01-XX
 * Plan: Free Tier (all services)
 */
export const DEFAULT_COSTS = {
  expo_push: {
    push_notification: 0.0, // Free tier: $0.00 per notification
    // Plan: Free
    // Actual Cost: $0.00 per notification
    // Source: https://expo.dev/pricing
    // Last verified: 2025-01-XX
  },
  revenuecat: {
    webhook_processing: 0.0, // Free tier: $0.00 per webhook
    api_call: 0.0, // Free tier: $0.00 per call
    // Plan: Free (until $2,500 MTR)
    // Actual Webhook Cost: $0.00 per webhook
    // Actual API Call Cost: $0.00 per call
    // Source: https://www.revenuecat.com/pricing
    // Last verified: 2025-01-XX
  },
  supabase: {
    api_call: 0.0, // Free tier: $0.00 per call (included)
    storage: 0.0, // Free tier: $0.00 per GB/month (included)
    // Plan: Free
    // Actual API Call Cost: $0.00 per call (included in plan)
    // Actual Storage Cost: $0.00 per GB/month (included in plan)
    // Source: https://supabase.com/pricing
    // Last verified: 2025-01-XX
  },
} as const;
