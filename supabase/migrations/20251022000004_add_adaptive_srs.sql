-- Adaptive Spaced Repetition System (SRS)
-- Implements SM-2 algorithm for personalized learning intervals

-- 1. Create SRS performance tracking table
CREATE TABLE IF NOT EXISTS public.srs_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  reminder_id UUID REFERENCES public.reminders(id) ON DELETE SET NULL,
  review_date TIMESTAMPTZ NOT NULL,
  quality_rating INTEGER NOT NULL CHECK (quality_rating BETWEEN 0 AND 5),
  response_time_seconds INTEGER,
  ease_factor DECIMAL(4,2) DEFAULT 2.5,
  interval_days INTEGER NOT NULL,
  next_interval_days INTEGER,
  repetition_number INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_srs_performance_user_session ON public.srs_performance(user_id, session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_srs_performance_user ON public.srs_performance(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_srs_performance_quality ON public.srs_performance(quality_rating);

-- Add comments
COMMENT ON TABLE public.srs_performance IS 'Tracks user performance on spaced repetition reviews for adaptive interval calculation';
COMMENT ON COLUMN public.srs_performance.quality_rating IS 'User self-assessment: 0=complete blackout, 1=incorrect, 2=correct with effort, 3=correct with hesitation, 4=correct easily, 5=perfect recall';
COMMENT ON COLUMN public.srs_performance.ease_factor IS 'SM-2 ease factor for this topic (higher = easier for user)';
COMMENT ON COLUMN public.srs_performance.interval_days IS 'Current interval that was used';
COMMENT ON COLUMN public.srs_performance.next_interval_days IS 'Calculated next interval based on performance';

-- 2. Add difficulty tracking to study sessions
ALTER TABLE public.study_sessions
ADD COLUMN IF NOT EXISTS difficulty_rating INTEGER DEFAULT NULL CHECK (difficulty_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS confidence_level INTEGER DEFAULT NULL CHECK (confidence_level BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS time_spent_minutes INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

COMMENT ON COLUMN public.study_sessions.difficulty_rating IS 'User-assessed difficulty: 1=very easy, 5=very hard';
COMMENT ON COLUMN public.study_sessions.confidence_level IS 'User confidence: 1=not confident, 5=very confident';
COMMENT ON COLUMN public.study_sessions.time_spent_minutes IS 'Time spent studying this topic';
COMMENT ON COLUMN public.study_sessions.review_count IS 'Number of times reviewed via SRS';

-- 3. Enable RLS on srs_performance
ALTER TABLE public.srs_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own SRS performance"
  ON public.srs_performance
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own SRS performance"
  ON public.srs_performance
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own SRS performance"
  ON public.srs_performance
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. Function to calculate next SRS interval using SM-2 algorithm
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
  -- SM-2 Algorithm Implementation
  -- Calculate new ease factor
  ef := p_ease_factor + (0.1 - (5 - p_quality_rating) * (0.08 + (5 - p_quality_rating) * 0.02));
  
  -- Ensure ease factor doesn't go below 1.3
  IF ef < 1.3 THEN
    ef := 1.3;
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
    END IF;
  END IF;
  
  -- Return results
  RETURN QUERY SELECT next_int, ef;
END;
$$;

COMMENT ON FUNCTION public.calculate_next_srs_interval IS 'Calculates next review interval using SM-2 algorithm based on quality rating';

-- 5. Function to get user's SRS statistics
CREATE OR REPLACE FUNCTION public.get_srs_statistics(p_user_id UUID)
RETURNS TABLE(
  total_reviews INTEGER,
  average_quality DECIMAL,
  retention_rate DECIMAL,
  topics_reviewed INTEGER,
  average_ease_factor DECIMAL,
  strongest_topics JSONB,
  weakest_topics JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as review_count,
      AVG(quality_rating) as avg_quality,
      AVG(CASE WHEN quality_rating >= 3 THEN 1.0 ELSE 0.0 END) as retention,
      COUNT(DISTINCT session_id) as topics_count,
      AVG(ease_factor) as avg_ef
    FROM public.srs_performance
    WHERE user_id = p_user_id
  ),
  strong AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'session_id', sp.session_id,
        'topic', ss.topic,
        'avg_quality', avg_quality,
        'ease_factor', avg_ease
      )
    ) as topics
    FROM (
      SELECT 
        session_id,
        AVG(quality_rating) as avg_quality,
        AVG(ease_factor) as avg_ease
      FROM public.srs_performance
      WHERE user_id = p_user_id
      GROUP BY session_id
      ORDER BY AVG(quality_rating) DESC, AVG(ease_factor) DESC
      LIMIT 5
    ) sp
    JOIN public.study_sessions ss ON ss.id = sp.session_id
  ),
  weak AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'session_id', sp.session_id,
        'topic', ss.topic,
        'avg_quality', avg_quality,
        'ease_factor', avg_ease
      )
    ) as topics
    FROM (
      SELECT 
        session_id,
        AVG(quality_rating) as avg_quality,
        AVG(ease_factor) as avg_ease
      FROM public.srs_performance
      WHERE user_id = p_user_id
      GROUP BY session_id
      ORDER BY AVG(quality_rating) ASC, AVG(ease_factor) ASC
      LIMIT 5
    ) sp
    JOIN public.study_sessions ss ON ss.id = sp.session_id
  )
  SELECT
    stats.review_count::INTEGER,
    ROUND(stats.avg_quality, 2),
    ROUND(stats.retention * 100, 2),
    stats.topics_count::INTEGER,
    ROUND(stats.avg_ef, 2),
    COALESCE(strong.topics, '[]'::jsonb),
    COALESCE(weak.topics, '[]'::jsonb)
  FROM stats, strong, weak;
END;
$$;

COMMENT ON FUNCTION public.get_srs_statistics IS 'Returns comprehensive SRS performance statistics for a user';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Adaptive SRS system and reminder enhancements added successfully';
END $$;

