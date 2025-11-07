import {
  createScheduledHandler,
  SupabaseClient,
} from '../_shared/function-handler.ts';
import { processNotificationQueue } from '../_shared/fallback-handler.ts';
import { logger } from '../_shared/logging.ts';

async function handleProcessNotificationQueue(supabaseAdmin: SupabaseClient) {
  const traceContext = { traceId: 'notification-queue-processor' };

  try {
    await logger.info(
      'Starting notification queue processing',
      {},
      traceContext,
    );

    // Process up to 100 notifications per run
    const result = await processNotificationQueue(supabaseAdmin, 100);

    await logger.info(
      'Notification queue processing completed',
      {
        processed: result.processed,
        sent: result.sent,
        failed: result.failed,
      },
      traceContext,
    );

    return {
      message: 'Notification queue processed',
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
    };
  } catch (error) {
    await logger.error(
      'Error processing notification queue',
      {
        error: error instanceof Error ? error.message : String(error),
      },
      traceContext,
    );
    throw error;
  }
}

export default createScheduledHandler(handleProcessNotificationQueue);
