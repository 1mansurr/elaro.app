-- Function to detect if user is cramming (multiple reviews in short time)
-- Part of Phase 2: Algorithm & Parameter Fixes

CREATE OR REPLACE FUNCTION public.detect_cramming(
  p_user_id UUID,
  p_session_id UUID,
  p_hours_window INTEGER DEFAULT 24
) RETURNS TABLE(
  is_cramming BOOLEAN,
  review_count INTEGER,
  average_quality DECIMAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  recent_reviews INTEGER;
  avg_quality DECIMAL;
BEGIN
  -- Count reviews in the time window
  SELECT 
    COUNT(*),
    COALESCE(AVG(quality_rating), 0)
  INTO recent_reviews, avg_quality
  FROM public.srs_performance
  WHERE user_id = p_user_id
    AND session_id = p_session_id
    AND review_date >= NOW() - (p_hours_window || ' hours')::INTERVAL;
  
  -- Consider it cramming if more than 2 reviews in the window
  -- This allows for legitimate reviews while catching rapid repetition
  RETURN QUERY SELECT 
    (recent_reviews > 2)::BOOLEAN as is_cramming,
    recent_reviews as review_count,
    ROUND(avg_quality, 2) as average_quality;
END;
$$;

COMMENT ON FUNCTION public.detect_cramming IS 
'Detects if user is reviewing the same material multiple times in a short period (cramming). Returns true if more than 2 reviews in the specified hours window.';

