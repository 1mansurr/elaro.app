/**
 * Monitor Storage Usage Function
 *
 * Scheduled function that checks storage usage against Supabase Free Plan limits
 * and creates alerts when thresholds are exceeded.
 *
 * Runs: Daily (via cron or scheduled trigger)
 */

// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { getCorsHeaders } from '../_shared/cors.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { checkAllStorageQuotas } from '../_shared/storage-monitor.ts';

serve(async (req: Request) => {
  const origin = req.headers.get('Origin');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(origin) });
  }

  const traceContext = extractTraceContext(req);
  await logger.info('Starting storage quota check', {}, traceContext);

  try {
    // @ts-expect-error - Deno.env is available at runtime in Deno
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    // @ts-expect-error - Deno.env is available at runtime in Deno
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
      headers: {
        ...getCorsHeaders(origin),
        'Content-Type': 'application/json',
      },
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
        headers: {
          ...getCorsHeaders(origin),
          'Content-Type': 'application/json',
        },
        status: 500,
      },
    );
  }
});
