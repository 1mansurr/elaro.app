/**
 * Supabase-Native Job Queue System
 *
 * Provides job queue functionality using Supabase database tables.
 * Supports custom schedules per job type, retries, and priorities.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

export type JobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'retrying';

export interface Job {
  id: number;
  job_name: string;
  job_data: Record<string, unknown>;
  status: JobStatus;
  priority: number;
  retry_count: number;
  max_retries: number;
  scheduled_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface EnqueueJobOptions {
  priority?: number;
  delay?: number; // Milliseconds to delay execution
  maxRetries?: number;
  scheduledAt?: string; // ISO timestamp
}

/**
 * Enqueue a job for background processing
 *
 * @param supabaseClient - Supabase client (admin for queue operations)
 * @param jobName - Job type identifier
 * @param jobData - Job payload
 * @param options - Job options (priority, delay, retries)
 * @returns Job ID
 */
export async function enqueueJob(
  supabaseClient: SupabaseClient,
  jobName: string,
  jobData: Record<string, unknown>,
  options: EnqueueJobOptions = {},
): Promise<number> {
  const scheduledAt = options.scheduledAt
    ? new Date(options.scheduledAt).toISOString()
    : options.delay
      ? new Date(Date.now() + options.delay).toISOString()
      : new Date().toISOString();

  const { data, error } = await supabaseClient
    .from('job_queue')
    .insert({
      job_name: jobName,
      job_data: jobData,
      status: 'pending',
      priority: options.priority || 0,
      max_retries: options.maxRetries || 3,
      scheduled_at: scheduledAt,
    })
    .select('id')
    .single();

  if (error) {
    console.error(`Failed to enqueue job ${jobName}:`, error);
    throw new Error(`Failed to enqueue job: ${error.message}`);
  }

  return data.id;
}

/**
 * Get next pending job for processing
 * Processes jobs in priority order (highest first), then by scheduled_at
 */
export async function getNextJob(
  supabaseClient: SupabaseClient,
  jobName?: string, // Optional: filter by job name
): Promise<Job | null> {
  let query = supabaseClient
    .from('job_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('priority', { ascending: false })
    .order('scheduled_at', { ascending: true })
    .limit(1);

  if (jobName) {
    query = query.eq('job_name', jobName);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching next job:', error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0] as Job;
}

/**
 * Mark a job as processing
 */
export async function markJobProcessing(
  supabaseClient: SupabaseClient,
  jobId: number,
): Promise<void> {
  const { error } = await supabaseClient
    .from('job_queue')
    .update({
      status: 'processing',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    console.error(`Failed to mark job ${jobId} as processing:`, error);
  }
}

/**
 * Mark a job as completed
 */
export async function markJobCompleted(
  supabaseClient: SupabaseClient,
  jobId: number,
): Promise<void> {
  const { error } = await supabaseClient
    .from('job_queue')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    console.error(`Failed to mark job ${jobId} as completed:`, error);
  }
}

/**
 * Mark a job as failed
 */
export async function markJobFailed(
  supabaseClient: SupabaseClient,
  jobId: number,
  errorMessage: string,
): Promise<void> {
  const { data: job } = await supabaseClient
    .from('job_queue')
    .select('retry_count, max_retries')
    .eq('id', jobId)
    .single();

  if (!job) {
    console.error(`Job ${jobId} not found`);
    return;
  }

  const shouldRetry = job.retry_count < job.max_retries;
  const newStatus: JobStatus = shouldRetry ? 'retrying' : 'failed';

  const { error } = await supabaseClient
    .from('job_queue')
    .update({
      status: newStatus,
      error_message: errorMessage,
      retry_count: job.retry_count + 1,
      updated_at: new Date().toISOString(),
      // If retrying, reschedule for exponential backoff
      scheduled_at: shouldRetry
        ? new Date(
            Date.now() + Math.pow(3, job.retry_count) * 5 * 60 * 1000,
          ).toISOString() // 5min, 15min, 45min
        : undefined,
    })
    .eq('id', jobId);

  if (error) {
    console.error(`Failed to mark job ${jobId} as failed:`, error);
  } else if (shouldRetry) {
    console.log(
      `Job ${jobId} will retry in ${Math.pow(3, job.retry_count) * 5} minutes`,
    );
  }
}

/**
 * Get job retry configuration
 * Centralized retry configs per job type
 */
export interface JobRetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number;
  backoffMultiplier: number;
}

const JOB_RETRY_CONFIGS: Record<string, JobRetryConfig> = {
  'send-email': {
    maxRetries: 5,
    baseDelay: 5000,
    maxDelay: 300000, // 5 minutes
    backoffMultiplier: 2,
  },
  'send-notification': {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 60000, // 1 minute
    backoffMultiplier: 2,
  },
  'process-batch': {
    maxRetries: 3,
    baseDelay: 10000,
    maxDelay: 300000,
    backoffMultiplier: 2,
  },
  default: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 60000,
    backoffMultiplier: 2,
  },
};

export function getJobRetryConfig(jobName: string): JobRetryConfig {
  return JOB_RETRY_CONFIGS[jobName] || JOB_RETRY_CONFIGS.default;
}

/**
 * Clean up old completed/failed jobs
 */
export async function cleanupOldJobs(
  supabaseClient: SupabaseClient,
  olderThanDays: number = 7,
): Promise<void> {
  const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  const { error } = await supabaseClient
    .from('job_queue')
    .delete()
    .in('status', ['completed', 'failed'])
    .lt('completed_at', cutoffDate.toISOString())
    .or(
      'completed_at.is.null,and(updated_at.lt.' +
        cutoffDate.toISOString() +
        ')',
    );

  if (error) {
    console.error('Failed to cleanup old jobs:', error);
  } else {
    console.log(`Cleaned up jobs older than ${olderThanDays} days`);
  }
}
