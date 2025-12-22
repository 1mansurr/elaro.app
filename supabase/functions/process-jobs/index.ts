/**
 * Job Queue Processor
 *
 * Processes pending jobs from the job queue table.
 * Should be called on a schedule (e.g., every minute for notifications,
 * every 5 minutes for maintenance jobs).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createScheduledHandler } from '../_shared/function-handler.ts';
import {
  getNextJob,
  markJobProcessing,
  markJobCompleted,
  markJobFailed,
  type Job,
} from '../_shared/job-queue.ts';
import { successResponse } from '../_shared/response.ts';
import { type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import {
  AppError,
  ERROR_CODES,
  ERROR_STATUS_CODES,
} from '../_shared/function-handler.ts';

/**
 * Job processor registry
 * Maps job names to handler functions
 */
const jobProcessors: Record<
  string,
  (job: Job, supabaseAdmin: SupabaseClient) => Promise<void>
> = {
  // Add your job handlers here
  // Example:
  // 'send-email': async (job, supabaseAdmin) => {
  //   const { userId, template, data } = job.job_data;
  //   await sendEmail(userId, template, data);
  // },
};

/**
 * Register a job processor
 */
export function registerJobProcessor(
  jobName: string,
  processor: (job: Job, supabaseAdmin: SupabaseClient) => Promise<void>,
): void {
  jobProcessors[jobName] = processor;
}

/**
 * Process a single job
 */
async function processJob(job: Job, supabaseAdmin: SupabaseClient): Promise<void> {
  const processor = jobProcessors[job.job_name];

  if (!processor) {
    throw new AppError(
      `No processor registered for job type: ${job.job_name}`,
      ERROR_STATUS_CODES.CONFIG_ERROR,
      ERROR_CODES.CONFIG_ERROR,
    );
  }

  await processor(job, supabaseAdmin);
}

/**
 * Main job processing handler
 */
serve(
  createScheduledHandler(
    async supabaseAdmin => {
      const batchSize = 10; // Process up to 10 jobs per run
      let processed = 0;
      let succeeded = 0;
      let failed = 0;

      for (let i = 0; i < batchSize; i++) {
        // Get next pending job
        const job = await getNextJob(supabaseAdmin);

        if (!job) {
          // No more jobs to process
          break;
        }

        // Mark as processing
        await markJobProcessing(supabaseAdmin, job.id);
        processed++;

        try {
          // Process the job
          await processJob(job, supabaseAdmin);

          // Mark as completed
          await markJobCompleted(supabaseAdmin, job.id);
          succeeded++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(
            `Job ${job.id} (${job.job_name}) failed:`,
            errorMessage,
          );

          // Mark as failed (will retry if retries remaining)
          await markJobFailed(supabaseAdmin, job.id, errorMessage);
          failed++;
        }
      }

      return successResponse({
        processed,
        succeeded,
        failed,
        timestamp: new Date().toISOString(),
      });
    },
    { requireSecret: true },
  ),
);
