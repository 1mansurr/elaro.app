/**
 * Monitor Edge Functions Function
 *
 * Scheduled function that checks for high-frequency and high-error-rate functions
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
  checkHighFrequencyFunctions,
  checkHighErrorRateFunctions,
} from '../_shared/function-invocation-tracker.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const traceContext = extractTraceContext(req);
  await logger.info('Starting edge function monitoring', {}, traceContext);

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Check high-frequency functions
    const highFrequency = await checkHighFrequencyFunctions(supabaseAdmin);

    // Check high error rate functions
    const highErrorRate = await checkHighErrorRateFunctions(supabaseAdmin);

    // Create alerts for high-frequency functions
    for (const func of highFrequency) {
      if (func.alertNeeded) {
        const { error } = await supabaseAdmin
          .from('edge_function_alerts')
          .insert({
            function_name: func.functionName,
            alert_type: 'high_frequency',
            metric_value: func.invocationCount,
            threshold_value: func.threshold,
            message: `${func.functionName} has ${func.invocationCount} invocations today (threshold: ${func.threshold})`,
          });

        if (error) {
          await logger.error(
            'Failed to create high-frequency alert',
            {
              error: error.message,
              function_name: func.functionName,
            },
            traceContext,
          );
        }
      }
    }

    // Create alerts for high error rate functions
    for (const func of highErrorRate) {
      if (func.alertNeeded) {
        const { error } = await supabaseAdmin
          .from('edge_function_alerts')
          .insert({
            function_name: func.functionName,
            alert_type: 'high_error_rate',
            metric_value: func.errorRate,
            threshold_value: 10, // 10% error rate threshold
            message: `${func.functionName} has ${func.errorRate.toFixed(2)}% error rate (${func.errorCount}/${func.totalCount} errors)`,
          });

        if (error) {
          await logger.error(
            'Failed to create high-error-rate alert',
            {
              error: error.message,
              function_name: func.functionName,
            },
            traceContext,
          );
        }
      }
    }

    const summary = {
      checkedAt: new Date().toISOString(),
      highFrequencyFunctions: highFrequency.length,
      highErrorRateFunctions: highErrorRate.length,
      alerts: {
        highFrequency: highFrequency.filter(f => f.alertNeeded).length,
        highErrorRate: highErrorRate.filter(f => f.alertNeeded).length,
      },
      details: {
        highFrequency: highFrequency.map(f => ({
          functionName: f.functionName,
          invocationCount: f.invocationCount,
          threshold: f.threshold,
          alertNeeded: f.alertNeeded,
        })),
        highErrorRate: highErrorRate.map(f => ({
          functionName: f.functionName,
          errorRate: f.errorRate.toFixed(2),
          errorCount: f.errorCount,
          totalCount: f.totalCount,
          alertNeeded: f.alertNeeded,
        })),
      },
    };

    await logger.info(
      'Edge function monitoring completed',
      {
        high_frequency_count: highFrequency.length,
        high_error_rate_count: highErrorRate.length,
        alerts_created:
          summary.alerts.highFrequency + summary.alerts.highErrorRate,
      },
      traceContext,
    );

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    await logger.error(
      'Error during edge function monitoring',
      {
        error: error instanceof Error ? error.message : String(error),
      },
      traceContext,
    );

    return new Response(
      JSON.stringify({
        error: 'Failed to monitor edge functions',
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
