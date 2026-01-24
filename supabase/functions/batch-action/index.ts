// FILE: supabase/functions/batch-action/index.ts
// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createAuthenticatedHandler,
  AuthenticatedRequest,
} from '../_shared/function-handler.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { z } from 'zod';

// Define the schema for batch operations
const BatchItemSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['assignment', 'lecture', 'study_session', 'course']),
});

const BatchActionSchema = z.object({
  action: z.enum(['RESTORE', 'DELETE_PERMANENTLY']),
  items: z.array(BatchItemSchema).min(1).max(100), // Limit to 100 items per batch
});

type BatchItem = z.infer<typeof BatchItemSchema>;
type BatchAction = z.infer<typeof BatchActionSchema>;

// Define table mappings
const TABLE_NAMES: Record<string, string> = {
  assignment: 'assignments',
  lecture: 'lectures',
  study_session: 'study_sessions',
  course: 'courses',
};

serve(
  createAuthenticatedHandler(
    async (req: AuthenticatedRequest) => {
      const { action, items } = req.body as BatchAction;
      const { user, supabaseClient } = req;
      const traceContext = extractTraceContext(req as unknown as Request);

      await logger.info(
        'Batch operation requested',
        {
          user_id: user.id,
          action,
          item_count: items.length,
        },
        traceContext,
      );

      // Group items by type for efficient batch operations
      const itemsByType = items.reduce(
        (acc, item) => {
          if (!acc[item.type]) {
            acc[item.type] = [];
          }
          acc[item.type].push(item.id);
          return acc;
        },
        {} as Record<string, string[]>,
      );

      // Track results
      const results = {
        success: [] as Array<{ id: string; type: string }>,
        failed: [] as Array<{ id: string; type: string; error: string }>,
      };

      // Process each type in parallel
      const operations = Object.entries(itemsByType).map(
        async ([type, ids]) => {
          const tableName = TABLE_NAMES[type];
          if (!tableName) {
            await logger.error(
              'Unknown item type in batch operation',
              {
                user_id: user.id,
                type,
                item_count: ids.length,
              },
              traceContext,
            );
            ids.forEach(id => {
              results.failed.push({ id, type, error: 'Unknown item type' });
            });
            return;
          }

          try {
            await logger.info(
              'Processing batch items',
              {
                user_id: user.id,
                type,
                item_count: ids.length,
                action,
              },
              traceContext,
            );

            if (action === 'RESTORE') {
              // Restore items by setting deleted_at to null
              const { error, data } = await supabaseClient
                .from(tableName)
                .update({ deleted_at: null })
                .in('id', ids)
                .eq('user_id', user.id)
                .select('id');

              if (error) throw handleDbError(error);

              // Track successful operations
              const dataArray = Array.isArray(data) ? data : [];
              const restoredIds = dataArray.map(
                (item: { id: string }) => item.id,
              );
              restoredIds.forEach((id: string) => {
                results.success.push({ id, type });
              });

              // Track any that weren't restored (might not belong to user)
              const notRestored = ids.filter(id => !restoredIds.includes(id));
              notRestored.forEach(id => {
                results.failed.push({
                  id,
                  type,
                  error: 'Item not found or already restored',
                });
              });

              await logger.info(
                'Batch restore completed',
                {
                  user_id: user.id,
                  type,
                  restored_count: restoredIds.length,
                },
                traceContext,
              );
            } else if (action === 'DELETE_PERMANENTLY') {
              // Permanently delete items
              const deleteResult = (await supabaseClient
                .from(tableName)
                .delete()
                .in('id', ids)
                .eq('user_id', user.id)) as unknown as {
                error: unknown;
                count: number | null;
              };

              const { error, count } = deleteResult;

              if (error) throw handleDbError(error);

              // Since delete doesn't return data, assume success for all
              ids.forEach(id => {
                results.success.push({ id, type });
              });

              await logger.info(
                'Batch delete completed',
                {
                  user_id: user.id,
                  type,
                  deleted_count: count || ids.length,
                },
                traceContext,
              );
            }
          } catch (error) {
            await logger.error(
              'Error processing batch items',
              {
                user_id: user.id,
                type,
                error: error instanceof Error ? error.message : String(error),
              },
              traceContext,
            );
            // Mark all items of this type as failed
            ids.forEach(id => {
              results.failed.push({
                id,
                type,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            });
          }
        },
      );

      // Wait for all operations to complete
      await Promise.all(operations);

      // Determine overall status
      const allSucceeded = results.failed.length === 0;
      const allFailed = results.success.length === 0;

      let message: string;
      let statusCode: number;

      if (allSucceeded) {
        message = `Successfully ${action === 'RESTORE' ? 'restored' : 'deleted'} ${results.success.length} item(s)`;
        statusCode = 200;
        await logger.info(
          'Batch operation complete',
          {
            user_id: user.id,
            action,
            success_count: results.success.length,
            failed_count: results.failed.length,
          },
          traceContext,
        );
      } else if (allFailed) {
        message = `Failed to process any items`;
        statusCode = 500;
        await logger.error(
          'Batch operation failed',
          {
            user_id: user.id,
            action,
            failed_count: results.failed.length,
          },
          traceContext,
        );
      } else {
        message = `Partially completed: ${results.success.length} succeeded, ${results.failed.length} failed`;
        statusCode = 207; // Multi-Status
        await logger.info(
          'Batch operation partially completed',
          {
            user_id: user.id,
            action,
            success_count: results.success.length,
            failed_count: results.failed.length,
          },
          traceContext,
        );
      }

      return new Response(
        JSON.stringify({
          message,
          results: {
            total: items.length,
            succeeded: results.success.length,
            failed: results.failed.length,
            details: {
              success: results.success,
              failed: results.failed,
            },
          },
        }),
        {
          status: statusCode,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    },
    {
      rateLimitName: 'batch-action',
      schema: BatchActionSchema,
    },
  ),
);
