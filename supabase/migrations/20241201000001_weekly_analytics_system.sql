-- Weekly Analytics System Database Schema
-- Migration: 20241201_weekly_analytics_system.sql

-- ============================================================================
-- WEEKLY REPORTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS weekly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    report_data JSONB NOT NULL,
    is_new BOOLEAN DEFAULT true,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one report per user per week
    UNIQUE(user_id, week_start_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_reports_user_id ON weekly_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_week_start ON weekly_reports(week_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_created_at ON weekly_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_is_new ON weekly_reports(is_new) WHERE is_new = true;

-- Partitioning by month for better performance
-- Note: This will be implemented in a separate migration for existing data

-- ============================================================================
-- REPORT TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL CHECK (category IN ('academic_performance', 'time_management', 'completion_rates', 'general')),
    scenario VARCHAR(100) NOT NULL CHECK (scenario IN ('high_activity', 'low_activity', 'improvement', 'decline', 'first_week')),
    template_content TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Ensure unique template names
    UNIQUE(name)
);

-- Indexes for template management
CREATE INDEX IF NOT EXISTS idx_report_templates_category ON report_templates(category);
CREATE INDEX IF NOT EXISTS idx_report_templates_scenario ON report_templates(scenario);
CREATE INDEX IF NOT EXISTS idx_report_templates_status ON report_templates(status);
CREATE INDEX IF NOT EXISTS idx_report_templates_created_by ON report_templates(created_by);

-- ============================================================================
-- NOTIFICATION DELIVERIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_id UUID NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) DEFAULT 'weekly_report',
    delivery_status VARCHAR(50) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed', 'retry')),
    delivery_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for notification tracking
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_id ON notification_deliveries(user_id);
-- Only create report_id index if column exists (table may have been created without this column)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_deliveries' 
        AND column_name = 'report_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_notification_deliveries_report_id ON notification_deliveries(report_id);
    END IF;
END $$;
-- Only create delivery_status index if column exists (table may have been created without this column)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_deliveries' 
        AND column_name = 'delivery_status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status ON notification_deliveries(delivery_status);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_created_at ON notification_deliveries(created_at);

-- ============================================================================
-- BATCH PROCESSING LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS batch_processing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processing_date DATE NOT NULL,
    total_users INTEGER NOT NULL,
    processed_users INTEGER DEFAULT 0,
    successful_reports INTEGER DEFAULT 0,
    failed_reports INTEGER DEFAULT 0,
    skipped_users INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for batch processing monitoring
CREATE INDEX IF NOT EXISTS idx_batch_processing_date ON batch_processing_logs(processing_date);
CREATE INDEX IF NOT EXISTS idx_batch_processing_status ON batch_processing_logs(status);
CREATE INDEX IF NOT EXISTS idx_batch_processing_started_at ON batch_processing_logs(started_at);

-- ============================================================================
-- USER ACTIVITY TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_activity_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    study_time_minutes INTEGER DEFAULT 0,
    assignments_completed INTEGER DEFAULT 0,
    courses_accessed INTEGER DEFAULT 0,
    study_sessions_count INTEGER DEFAULT 0,
    screen_time_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per user per day
    UNIQUE(user_id, activity_date)
);

-- Indexes for activity tracking
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_date ON user_activity_tracking(activity_date);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity_tracking(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_tracking ENABLE ROW LEVEL SECURITY;

-- Weekly reports: Users can only see their own reports
DROP POLICY IF EXISTS "Users can view their own weekly reports" ON weekly_reports;
DROP POLICY IF EXISTS "Users can view their own weekly reports" ON weekly_reports;
CREATE POLICY "Users can view their own weekly reports" ON weekly_reports
    FOR ALL USING (auth.uid() = user_id);

-- Report templates: Only admins can manage templates
DROP POLICY IF EXISTS "Admins can manage report templates" ON report_templates;
DROP POLICY IF EXISTS "Admins can manage report templates" ON report_templates;
CREATE POLICY "Admins can manage report templates" ON report_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Notification deliveries: Users can only see their own notifications
DROP POLICY IF EXISTS "Users can view their own notification deliveries" ON notification_deliveries;
DROP POLICY IF EXISTS "Users can view their own notification deliveries" ON notification_deliveries;
CREATE POLICY "Users can view their own notification deliveries" ON notification_deliveries
    FOR ALL USING (auth.uid() = user_id);

-- Batch processing logs: Only admins can view
DROP POLICY IF EXISTS "Admins can view batch processing logs" ON batch_processing_logs;
DROP POLICY IF EXISTS "Admins can view batch processing logs" ON batch_processing_logs;
CREATE POLICY "Admins can view batch processing logs" ON batch_processing_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- User activity tracking: Users can only see their own activity
DROP POLICY IF EXISTS "Users can view their own activity tracking" ON user_activity_tracking;
CREATE POLICY "Users can view their own activity tracking" ON user_activity_tracking
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_weekly_reports_updated_at ON weekly_reports;
CREATE TRIGGER update_weekly_reports_updated_at BEFORE UPDATE ON weekly_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_report_templates_updated_at ON report_templates;
CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON report_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_deliveries_updated_at ON notification_deliveries;
CREATE TRIGGER update_notification_deliveries_updated_at BEFORE UPDATE ON notification_deliveries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_activity_tracking_updated_at ON user_activity_tracking;
CREATE TRIGGER update_user_activity_tracking_updated_at BEFORE UPDATE ON user_activity_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE TEMPLATES
-- ============================================================================

-- Insert sample templates for different scenarios (idempotent)
INSERT INTO report_templates (name, category, scenario, template_content, status, created_by) VALUES
-- High Activity Templates
('High Activity Academic Summary', 'academic_performance', 'high_activity', 
'This week you completed {{assignments_completed}} assignments and studied for {{study_time_hours}} hours, showing excellent academic progress! Your most productive day was {{most_productive_day}} with {{max_daily_study}} hours of focused study time.', 'published', NULL),

('High Activity Time Management', 'time_management', 'high_activity',
'Your study sessions averaged {{avg_session_duration}} minutes this week, with {{study_sessions_count}} total sessions. You maintained a consistent study schedule, with {{consistent_days}} days of study activity.', 'published', NULL),

-- Low Activity Templates
('Low Activity Academic Summary', 'academic_performance', 'low_activity',
'This week you completed {{assignments_completed}} assignments and studied for {{study_time_hours}} hours. Consider increasing your study time to stay on track with your academic goals.', 'published', NULL),

('Low Activity Time Management', 'time_management', 'low_activity',
'You had {{study_sessions_count}} study sessions this week, averaging {{avg_session_duration}} minutes each. Try to establish a more consistent study routine for better academic performance.', 'published', NULL),

-- Improvement Templates
('Improvement Academic Summary', 'academic_performance', 'improvement',
'Great progress this week! You completed {{assignments_completed}} assignments and studied for {{study_time_hours}} hours, which is {{improvement_percentage}}% more than last week. Keep up the excellent work!', 'published', NULL),

('Improvement Time Management', 'time_management', 'improvement',
'Your study consistency improved this week with {{study_sessions_count}} sessions, up {{improvement_percentage}}% from last week. Your average session duration was {{avg_session_duration}} minutes.', 'published', NULL),

-- Decline Templates
('Decline Academic Summary', 'academic_performance', 'decline',
'This week you completed {{assignments_completed}} assignments and studied for {{study_time_hours}} hours, which is {{decline_percentage}}% less than last week. Consider reviewing your study schedule to get back on track.', 'published', NULL),

('Decline Time Management', 'time_management', 'decline',
'Your study activity decreased this week with {{study_sessions_count}} sessions, down {{decline_percentage}}% from last week. Try to maintain a consistent study routine for better results.', 'published', NULL),

-- First Week Templates
('First Week Academic Summary', 'academic_performance', 'first_week',
'Welcome to your first week of tracking! You completed {{assignments_completed}} assignments and studied for {{study_time_hours}} hours. This baseline will help us track your progress in future weeks.', 'published', NULL),

('First Week Time Management', 'time_management', 'first_week',
'This is your first week of activity tracking. You had {{study_sessions_count}} study sessions, averaging {{avg_session_duration}} minutes each. We''ll use this data to provide personalized insights in future reports.', 'published', NULL)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE weekly_reports IS 'Stores weekly analytics reports for users with JSON data structure';
COMMENT ON TABLE report_templates IS 'Admin-manageable templates for generating weekly reports';
COMMENT ON TABLE notification_deliveries IS 'Tracks notification delivery status for weekly reports';
COMMENT ON TABLE batch_processing_logs IS 'Logs batch processing runs for monitoring and debugging';
COMMENT ON TABLE user_activity_tracking IS 'Daily activity tracking for building weekly reports';
