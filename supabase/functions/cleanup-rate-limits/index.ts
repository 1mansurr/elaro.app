import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createScheduledHandler } from '../_shared/function-handler.ts';
import { cleanupOldRateLimits } from '../_shared/rate-limiter.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';

serve(
  createScheduledHandler(
    async supabaseAdminClient => {
      const traceContext = extractTraceContext(
        new Request('https://cron.internal'),
      );

      await logger.info('Starting rate limits cleanup', {}, traceContext);

      // Clean up rate limit records older than 5 minutes
      await cleanupOldRateLimits(supabaseAdminClient, 5);

      await logger.info(
        'Rate limits cleanup completed successfully',
        {},
        traceContext,
      );

      return {
        success: true,
        message: 'Rate limits cleaned up successfully',
        timestamp: new Date().toISOString(),
      };
    },
    { requireSecret: true, secretEnvVar: 'CRON_SECRET' },
  ),
);
