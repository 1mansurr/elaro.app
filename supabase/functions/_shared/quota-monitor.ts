/**
 * Quota Monitoring Service
 *
 * Tracks API usage and provides alerts when approaching quotas
 */

// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { logger } from './logging.ts';

interface QuotaConfig {
  serviceName: string;
  quotaType: 'daily' | 'monthly';
  limit: number;
}

/**
 * Quota configurations - update these based on your actual service limits
 *
 * ⚠️ CRITICAL: These limits MUST be verified against your actual service dashboards.
 * Wrong limits mean monitoring won't work correctly and you risk exceeding quotas.
 *
 * 📋 VERIFICATION STEPS:
 * 1. Log into each service dashboard (links below)
 * 2. Check Settings → Billing → Usage (or equivalent)
 * 3. Update the limit value below with actual number
 * 4. Fill in all placeholders (Plan, Source, Last verified, Verified by)
 * 5. Update QUOTA_LIMITS.md with the same information
 * 6. Remove all TODO comments after verification
 *
 * 📚 See QUOTA_VERIFICATION_GUIDE.md for detailed step-by-step instructions
 *
 * Last verified: 2025-01-31 by ELARO
 */
const QUOTA_CONFIGS: QuotaConfig[] = [
  {
    serviceName: 'supabase',
    quotaType: 'daily',
    // ✅ VERIFIED: Free plan → "Unlimited API requests" per pricing page
    // Note: Other limits apply (e.g., 50,000 MAUs, 500MB database, 1GB storage)
    // Set high limit for monitoring purposes (won't trigger alerts, but tracks usage)
    limit: 10000000, // 10M/day - High limit for tracking (actual: Unlimited)
    // Plan: Free
    // Source: https://app.supabase.com/project/oqwyoucchbjiyddnznwf/settings/billing
    // Last verified: 2025-01-31
    // Verified by: ELARO
    // Note: API requests are unlimited, but monitoring tracks usage for visibility
  },
  {
    serviceName: 'expo_push',
    quotaType: 'daily',
    // ✅ VERIFIED: Free plan → "600 notifications per second" rate limit
    // Calculated daily: 600/sec × 86,400 sec/day = 51,840,000/day
    // This is a rate limit (burst capacity), not a hard daily cap
    limit: 51840000, // 51.84M/day - Calculated from 600/sec rate limit
    // Plan: Free
    // Source: https://expo.dev → Account Settings → Usage
    // Last verified: 2025-01-31
    // Verified by: ELARO
    // Note: This is a per-second rate limit, not a daily quota. Monitoring tracks daily usage.
  },
  {
    serviceName: 'revenuecat',
    quotaType: 'monthly',
    // ✅ VERIFIED: Free plan → Free until MTR reaches US $2,500
    // No clear monthly request cap found in documentation
    // Set high limit for monitoring purposes (tracks usage, won't trigger false alerts)
    limit: 10000000, // 10M/month - High limit for tracking (actual: No clear cap)
    // Plan: Free
    // Source: https://app.revenuecat.com → Project Settings → Usage
    // Last verified: 2025-01-31
    // Verified by: ELARO
    // Note: No explicit request cap, but free tier ends at $2,500 MTR. Monitoring tracks usage.
  },
];

export interface QuotaStatus {
  usage: number;
  limit: number;
  percentage: number;
  remaining: number;
}

/**
 * Track quota usage for a service
 */
export async function trackQuotaUsage(
  supabaseClient: SupabaseClient,
  serviceName: string,
  increment: number = 1,
): Promise<QuotaStatus> {
  const config = QUOTA_CONFIGS.find(c => c.serviceName === serviceName);
  if (!config) {
    await logger.warn(
      'Quota config not found',
      { serviceName },
      { traceId: 'quota-monitor' },
    );
    return { usage: 0, limit: Infinity, percentage: 0, remaining: Infinity };
  }

  try {
    // Call database function to track usage
    const { data, error } = await supabaseClient.rpc('track_quota_usage', {
      p_service_name: serviceName,
      p_quota_type: config.quotaType,
      p_increment: increment,
      p_quota_limit: config.limit,
    });

    if (error) {
      await logger.error(
        'Error tracking quota usage',
        { error: error.message, serviceName },
        { traceId: 'quota-monitor' },
      );
      return {
        usage: 0,
        limit: config.limit,
        percentage: 0,
        remaining: config.limit,
      };
    }

    const usage = data?.usage_count || increment;
    const limit = data?.quota_limit || config.limit;
    const percentage = limit > 0 ? (usage / limit) * 100 : 0;
    const remaining = Math.max(0, limit - usage);

    return { usage, limit, percentage, remaining };
  } catch (error) {
    await logger.error(
      'Exception tracking quota usage',
      {
        error: error instanceof Error ? error.message : String(error),
        serviceName,
      },
      { traceId: 'quota-monitor' },
    );
    return {
      usage: 0,
      limit: config.limit,
      percentage: 0,
      remaining: config.limit,
    };
  }
}

/**
 * Get current quota status for a service
 */
export async function getQuotaStatus(
  supabaseClient: SupabaseClient,
  serviceName: string,
): Promise<QuotaStatus> {
  const config = QUOTA_CONFIGS.find(c => c.serviceName === serviceName);
  if (!config) {
    return { usage: 0, limit: Infinity, percentage: 0, remaining: Infinity };
  }

  try {
    const { data, error } = await supabaseClient.rpc('get_quota_status', {
      p_service_name: serviceName,
      p_quota_type: config.quotaType,
    });

    if (error) {
      await logger.warn(
        'Error getting quota status',
        { error: error.message, serviceName },
        { traceId: 'quota-monitor' },
      );
      return {
        usage: 0,
        limit: config.limit,
        percentage: 0,
        remaining: config.limit,
      };
    }

    if (!data || data.length === 0) {
      return {
        usage: 0,
        limit: config.limit,
        percentage: 0,
        remaining: config.limit,
      };
    }

    const status = data[0];
    return {
      usage: status.usage || 0,
      limit: status.limit_value || config.limit,
      percentage: Number(status.percentage) || 0,
      remaining: status.remaining || 0,
    };
  } catch (error) {
    await logger.error(
      'Exception getting quota status',
      {
        error: error instanceof Error ? error.message : String(error),
        serviceName,
      },
      { traceId: 'quota-monitor' },
    );
    return {
      usage: 0,
      limit: config.limit,
      percentage: 0,
      remaining: config.limit,
    };
  }
}

/**
 * Check if fallback should be used (quota exhausted)
 */
export async function shouldUseFallback(
  supabaseClient: SupabaseClient,
  serviceName: string,
  requiredCount: number = 1,
): Promise<boolean> {
  const quotaStatus = await getQuotaStatus(supabaseClient, serviceName);

  // Use fallback if less than required count remains
  return quotaStatus.remaining < requiredCount;
}
