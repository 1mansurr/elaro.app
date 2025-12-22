/**
 * Monitor Storage Usage Function
 *
 * Scheduled function that checks storage usage against Supabase Free Plan limits
 * and creates alerts when thresholds are exceeded.
 *
 * Runs: Daily (via cron or scheduled trigger)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { corsHeaders } from '../_shared/cors.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import {
  checkAllStorageQuotas,
} from '../_shared/storage-monitor.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const traceContext = extractTraceContext(req);
  await logger.info('Starting storage quota check', {}, traceContext);

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Check all storage quotas
    const results = await checkAllStorageQuotas(supabaseAdmin);

    const summary = {
      checkedAt: new Date().toISOString(),
      totalChecked: results.length,
      statuses: results.map(status => ({
        storageType: status.storageType,
        usageReadable: status.usageReadable,
        limitReadable: status.limitReadable,
        usagePercentage: status.usagePercentage.toFixed(2),
        remainingReadable: status.remainingReadable,
        alertLevel:
          status.usagePercentage >= 90
            ? 'critical'
            : status.usagePercentage >= 70
              ? 'warning'
              : 'ok',
      })),
      warnings: results.filter(
        r => r.usagePercentage >= 70 && r.usagePercentage < 90,
      ).length,
      critical: results.filter(r => r.usagePercentage >= 90).length,
    };

    await logger.info(
      'Storage quota check completed',
      {
        total_checked: results.length,
        warnings: summary.warnings,
        critical: summary.critical,
      },
      traceContext,
    );

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    await logger.error(
      'Error during storage quota check',
      {
        error: error instanceof Error ? error.message : String(error),
      },
      traceContext,
    );

    return new Response(
      JSON.stringify({
        error: 'Failed to check storage quotas',
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
