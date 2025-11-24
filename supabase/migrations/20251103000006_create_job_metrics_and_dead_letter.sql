-- Create job metrics and dead-letter queue tables
-- Part of Phase 4: Job Runner Reliability

-- Job metrics table for tracking job execution
CREATE TABLE IF NOT EXISTS public.job_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'partial')),
  reminders_found INTEGER DEFAULT 0,
  reminders_processed INTEGER DEFAULT 0,
  notifications_sent INTEGER DEFAULT 0,
  notifications_failed INTEGER DEFAULT 0,
  errors TEXT[],
  execution_time_ms INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_metrics_job_name ON public.job_metrics(job_name, run_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_metrics_status ON public.job_metrics(status, run_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_metrics_created_at ON public.job_metrics(created_at DESC);

COMMENT ON TABLE public.job_metrics IS 'Tracks execution metrics for scheduled jobs (reminder processing, cleanup, etc.)';
COMMENT ON COLUMN public.job_metrics.job_name IS 'Name of the job (e.g., process-due-reminders)';
COMMENT ON COLUMN public.job_metrics.status IS 'Job execution status: success, failure, or partial';
COMMENT ON COLUMN public.job_metrics.metadata IS 'Additional job-specific metrics and information';

-- Failed reminders table (dead-letter queue)
CREATE TABLE IF NOT EXISTS public.failed_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID REFERENCES public.reminders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  error_message TEXT NOT NULL,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  next_retry_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT FALSE,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failed_reminders_retry ON public.failed_reminders(next_retry_at, resolved)
WHERE resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_failed_reminders_user ON public.failed_reminders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_failed_reminders_reminder ON public.failed_reminders(reminder_id);

COMMENT ON TABLE public.failed_reminders IS 'Dead-letter queue for reminders that failed to process after retries';
COMMENT ON COLUMN public.failed_reminders.retry_count IS 'Number of retry attempts made';
COMMENT ON COLUMN public.failed_reminders.next_retry_at IS 'When to retry this reminder next (null if resolved)';
COMMENT ON COLUMN public.failed_reminders.resolved IS 'Whether this failure has been manually resolved';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_failed_reminders_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_failed_reminders_timestamp
  BEFORE UPDATE ON public.failed_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_failed_reminders_updated_at();

-- Enable RLS
ALTER TABLE public.job_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_metrics (admin/system only)
CREATE POLICY "Service role can manage job metrics"
  ON public.job_metrics
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for failed_reminders
CREATE POLICY "Users can view own failed reminders"
  ON public.failed_reminders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage failed reminders"
  ON public.failed_reminders
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

