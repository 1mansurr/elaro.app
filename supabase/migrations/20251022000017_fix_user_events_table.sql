-- Fix User Events Table Structure
-- This migration updates the existing user_events table to support event processing

-- ============================================================================
-- UPDATE EXISTING USER_EVENTS TABLE
-- ============================================================================

-- Add missing columns to existing user_events table
ALTER TABLE public.user_events 
ADD COLUMN IF NOT EXISTS table_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS record_id UUID,
ADD COLUMN IF NOT EXISTS old_data JSONB,
ADD COLUMN IF NOT EXISTS new_data JSONB,
ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS processing_error TEXT,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- ============================================================================
-- CREATE INDEXES FOR EVENT PROCESSING
-- ============================================================================

-- Create index for efficient event processing
CREATE INDEX IF NOT EXISTS idx_user_events_processing 
ON public.user_events (processed, created_at) 
WHERE processed = FALSE;

-- Create index for retry logic
CREATE INDEX IF NOT EXISTS idx_user_events_retry 
ON public.user_events (processed, retry_count, created_at) 
WHERE processed = FALSE AND retry_count < 3;

-- ============================================================================
-- UPDATE TRIGGER FUNCTIONS TO WORK WITH EXISTING TABLE
-- ============================================================================

-- Update the emit_user_event function to work with existing table structure
CREATE OR REPLACE FUNCTION emit_user_event()
RETURNS TRIGGER AS $$
DECLARE
  event_data JSONB;
  old_data JSONB;
  new_data JSONB;
BEGIN
  -- Convert OLD and NEW to JSONB for storage
  IF TG_OP = 'DELETE' THEN
    old_data := to_jsonb(OLD);
    new_data := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    old_data := NULL;
    new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
  END IF;

  -- Build event data
  event_data := json_build_object(
    'operation', TG_OP,
    'table', TG_TABLE_NAME,
    'record_id', COALESCE(NEW.id, OLD.id),
    'timestamp', NOW()
  );

  -- Insert event record
  INSERT INTO public.user_events (
    user_id,
    event_type,
    event_data,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    COALESCE(NEW.user_id, OLD.user_id, auth.uid()),
    TG_OP,
    event_data,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    old_data,
    new_data
  );

  -- Emit real-time notification for Edge Functions
  PERFORM pg_notify('user_event', json_build_object(
    'event_type', TG_OP,
    'table_name', TG_TABLE_NAME,
    'record_id', COALESCE(NEW.id, OLD.id),
    'user_id', COALESCE(NEW.user_id, OLD.user_id, auth.uid()),
    'timestamp', NOW()
  )::text);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- EVENT PROCESSING FUNCTIONS FOR EDGE FUNCTIONS
-- ============================================================================

-- Function to get unprocessed events
CREATE OR REPLACE FUNCTION get_unprocessed_events(
  p_limit INTEGER DEFAULT 100
) RETURNS TABLE (
  id UUID,
  event_type TEXT,
  table_name VARCHAR(100),
  record_id UUID,
  user_id UUID,
  event_data JSONB,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ue.id,
    ue.event_type,
    ue.table_name,
    ue.record_id,
    ue.user_id,
    ue.event_data,
    ue.old_data,
    ue.new_data,
    ue.created_at
  FROM public.user_events ue
  WHERE ue.processed = FALSE
  ORDER BY ue.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to mark events as processed
CREATE OR REPLACE FUNCTION mark_event_processed(
  p_event_id UUID,
  p_error TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE public.user_events 
  SET 
    processed = TRUE,
    processing_error = p_error,
    retry_count = retry_count + 1
  WHERE id = p_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get events for a specific user
CREATE OR REPLACE FUNCTION get_user_events(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  event_type TEXT,
  table_name VARCHAR(100),
  record_id UUID,
  event_data JSONB,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ue.id,
    ue.event_type,
    ue.table_name,
    ue.record_id,
    ue.event_data,
    ue.old_data,
    ue.new_data,
    ue.created_at
  FROM public.user_events ue
  WHERE ue.user_id = p_user_id
  ORDER BY ue.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

-- Function to clean up old processed events
CREATE OR REPLACE FUNCTION cleanup_old_user_events(
  p_days_to_keep INTEGER DEFAULT 30
) RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.user_events 
  WHERE processed = TRUE 
  AND created_at < NOW() - INTERVAL '1 day' * p_days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to retry failed events
CREATE OR REPLACE FUNCTION retry_failed_events(
  p_max_retries INTEGER DEFAULT 3
) RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.user_events 
  SET 
    processed = FALSE,
    processing_error = NULL
  WHERE processed = FALSE 
  AND retry_count < p_max_retries
  AND created_at < NOW() - INTERVAL '5 minutes';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMPLETION LOG
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'User events table structure updated successfully';
  RAISE NOTICE 'Added event processing columns';
  RAISE NOTICE 'Created processing indexes';
  RAISE NOTICE 'Updated trigger functions for existing table';
  RAISE NOTICE 'Event processing functions ready';
  RAISE NOTICE 'Cleanup functions active';
END $$;
