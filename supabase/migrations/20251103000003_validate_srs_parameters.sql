-- Add parameter validation to SM-2 algorithm
-- Part of Phase 2: Algorithm & Parameter Fixes

CREATE OR REPLACE FUNCTION public.calculate_next_srs_interval(
  p_quality_rating INTEGER,
  p_current_interval INTEGER,
  p_ease_factor DECIMAL,
  p_repetition_number INTEGER
) RETURNS TABLE(
  next_interval INTEGER,
  new_ease_factor DECIMAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  ef DECIMAL(4,2);
  next_int INTEGER;
BEGIN
  -- Input validation: Quality rating must be 0-5
  IF p_quality_rating < 0 OR p_quality_rating > 5 THEN
    RAISE EXCEPTION 'Quality rating must be between 0 and 5, got: %', p_quality_rating;
  END IF;
  
  -- Input validation: Current interval must be at least 1 day
  IF p_current_interval < 1 THEN
    RAISE EXCEPTION 'Current interval must be at least 1 day, got: %', p_current_interval;
  END IF;
  
  -- Input validation: Ease factor bounds enforcement
  IF p_ease_factor < 1.3 THEN
    p_ease_factor := 1.3; -- Enforce minimum (SM-2 standard)
  ELSIF p_ease_factor > 3.0 THEN
    p_ease_factor := 3.0; -- Enforce maximum (reasonable upper bound)
  END IF;
  
  -- Input validation: Repetition number must be positive
  IF p_repetition_number < 1 THEN
    p_repetition_number := 1;
  END IF;
  
  -- SM-2 Algorithm Implementation
  -- Calculate new ease factor
  ef := p_ease_factor + (0.1 - (5 - p_quality_rating) * (0.08 + (5 - p_quality_rating) * 0.02));
  
  -- Ensure ease factor stays in valid range (1.3 to 3.0)
  IF ef < 1.3 THEN
    ef := 1.3;
  ELSIF ef > 3.0 THEN
    ef := 3.0;
  END IF;
  
  -- Calculate next interval based on quality
  IF p_quality_rating < 3 THEN
    -- Failed recall - restart from day 1
    next_int := 1;
  ELSE
    -- Successful recall - increase interval
    IF p_repetition_number = 1 THEN
      next_int := 1;
    ELSIF p_repetition_number = 2 THEN
      next_int := 6;
    ELSE
      next_int := ROUND(p_current_interval * ef)::INTEGER;
      -- Ensure next interval is at least 1 day
      IF next_int < 1 THEN
        next_int := 1;
      END IF;
      -- Cap maximum interval at 365 days (1 year)
      IF next_int > 365 THEN
        next_int := 365;
      END IF;
    END IF;
  END IF;
  
  -- Return results
  RETURN QUERY SELECT next_int, ef;
END;
$$;

COMMENT ON FUNCTION public.calculate_next_srs_interval IS 
'Calculates next review interval using SM-2 algorithm with comprehensive parameter validation and bounds checking';

