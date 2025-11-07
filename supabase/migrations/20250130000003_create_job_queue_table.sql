-- Create job queue table for Supabase-native background job processing
-- Supports custom schedules per job type

CREATE TABLE IF NOT EXISTS public.job_queue (
  id BIGSERIAL PRIMARY KEY,
  job_name TEXT NOT NULL,
  job_data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'retrying'
  priority INTEGER DEFAULT 0 NOT NULL, -- Higher priority = processed first
  retry_count INTEGER DEFAULT 0 NOT NULL,
  max_retries INTEGER DEFAULT 3 NOT NULL,
  scheduled_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, -- When job should run
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for efficient job processing
CREATE INDEX IF NOT EXISTS idx_job_queue_status_scheduled 
  ON public.job_queue(status, scheduled_at, priority DESC);

CREATE INDEX IF NOT EXISTS idx_job_queue_status_priority 
  ON public.job_queue(status, priority DESC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_job_queue_job_name 
  ON public.job_queue(job_name);

CREATE INDEX IF NOT EXISTS idx_job_queue_retrying 
  ON public.job_queue(status, retry_count)
  WHERE status = 'retrying';

-- Enable Row Level Security
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;

-- Policy: System can manage job queue
DROP POLICY IF EXISTS "System can manage job queue" ON public.job_queue;
CREATE POLICY "System can manage job queue" 
  ON public.job_queue 
  FOR ALL 
  USING (true);

-- Add comments
COMMENT ON TABLE public.job_queue IS 'Background job queue for async processing';
COMMENT ON COLUMN public.job_queue.job_name IS 'Job type identifier (e.g., send-email, send-notification)';
COMMENT ON COLUMN public.job_queue.job_data IS 'JSON payload for the job';
COMMENT ON COLUMN public.job_queue.status IS 'Current status: pending, processing, completed, failed, retrying';
COMMENT ON COLUMN public.job_queue.priority IS 'Higher priority jobs are processed first';
COMMENT ON COLUMN public.job_queue.scheduled_at IS 'When the job should be executed';

