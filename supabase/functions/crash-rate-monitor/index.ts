import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface CrashRateBaseline {
  averageCrashRate: number;
  calculatedAt: string;
  days: number;
}

interface CrashRateAlert {
  currentRate: number;
  baseline: number;
  increase: number;
  increasePercent: number;
  threshold: number;
  shouldAlert: boolean;
}

/**
 * Calculate baseline crash rate from Sentry (last 7 days)
 *
 * Note: This function calls Sentry API to get crash rate data.
 * You'll need to set SENTRY_ORG, SENTRY_PROJECT, and SENTRY_API_TOKEN in Supabase secrets.
 */
async function calculateBaseline(): Promise<CrashRateBaseline> {
  const SENTRY_ORG = Deno.env.get('SENTRY_ORG');
  const SENTRY_PROJECT = Deno.env.get('SENTRY_PROJECT') || 'elaro';
  const SENTRY_API_TOKEN = Deno.env.get('SENTRY_API_TOKEN');

  if (!SENTRY_ORG || !SENTRY_API_TOKEN) {
    throw new Error(
      'Sentry configuration missing. Set SENTRY_ORG and SENTRY_API_TOKEN in Supabase secrets.',
    );
  }

  // Calculate date range (last 7 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  // Fetch crash rate from Sentry API
  // Using Sentry API v0 for organization stats
  const url = `https://sentry.io/api/0/organizations/${SENTRY_ORG}/stats_v2/`;
  const params = new URLSearchParams({
    stat: 'received',
    since: Math.floor(startDate.getTime() / 1000).toString(),
    until: Math.floor(endDate.getTime() / 1000).toString(),
    resolution: '1d',
    project: SENTRY_PROJECT,
  });

  try {
    const response = await fetch(`${url}?${params}`, {
      headers: {
        Authorization: `Bearer ${SENTRY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Sentry API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    // Calculate average crash rate from Sentry response
    // Sentry returns data in format: [[timestamp, count], ...]
    // We need to calculate crash rate from error counts
    let totalErrors = 0;
    let totalSessions = 0;

    if (Array.isArray(data)) {
      data.forEach((day: any) => {
        if (Array.isArray(day) && day.length >= 2) {
          totalErrors += day[1] || 0;
        }
      });
    }

    // For crash rate, we need sessions data
    // This is a simplified calculation - adjust based on actual Sentry API response
    // In production, you'd fetch sessions separately and calculate crash rate
    const averageCrashRate =
      totalSessions > 0 ? totalErrors / totalSessions : 0;

    return {
      averageCrashRate,
      calculatedAt: new Date().toISOString(),
      days: 7,
    };
  } catch (error) {
    console.error('Error calculating baseline:', error);
    // Return a default baseline if Sentry API fails
    return {
      averageCrashRate: 0.01, // 1% default baseline
      calculatedAt: new Date().toISOString(),
      days: 7,
    };
  }
}

/**
 * Check if current crash rate exceeds threshold
 */
function checkCrashRate(
  currentRate: number,
  baseline: CrashRateBaseline,
  threshold: number = 0.05,
): CrashRateAlert {
  const increase = currentRate - baseline.averageCrashRate;
  const increasePercent =
    baseline.averageCrashRate > 0
      ? increase / baseline.averageCrashRate
      : currentRate > 0
        ? 1
        : 0;

  const shouldAlert = increasePercent > threshold;

  return {
    currentRate,
    baseline: baseline.averageCrashRate,
    increase,
    increasePercent,
    threshold,
    shouldAlert,
  };
}

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { currentCrashRate } = await req.json().catch(() => ({}));

    // Calculate baseline
    const baseline = await calculateBaseline();

    // Check if alert should be triggered
    const alert = checkCrashRate(currentCrashRate || 0, baseline, 0.05);

    return new Response(
      JSON.stringify({
        baseline,
        alert,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
