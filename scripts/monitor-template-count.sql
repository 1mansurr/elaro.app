-- Template Count Monitoring Script
-- Run this monthly in Supabase SQL Editor to monitor template growth
-- If public template count exceeds 100, consider prioritizing pagination

-- Total public templates
SELECT 
  COUNT(*) as total_public_templates,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as recent_public_templates,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as weekly_public_templates
FROM task_templates
WHERE is_public = true;

-- Template distribution by category
SELECT 
  category,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM task_templates
WHERE is_public = true
GROUP BY category
ORDER BY count DESC;

-- Template distribution by task type
SELECT 
  task_type,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM task_templates
WHERE is_public = true
GROUP BY task_type
ORDER BY count DESC;

-- Top 10 most used public templates
SELECT 
  id,
  template_name,
  category,
  task_type,
  usage_count,
  rating,
  created_at
FROM task_templates
WHERE is_public = true
ORDER BY usage_count DESC
LIMIT 10;

-- Growth trend (last 6 months)
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as templates_created
FROM task_templates
WHERE is_public = true
  AND created_at > NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- Recommendation
SELECT 
  CASE 
    WHEN COUNT(*) > 100 THEN 
      '⚠️ RECOMMENDATION: Public template count exceeds 100. Consider implementing pagination in getPublicTemplates() for better performance.'
    WHEN COUNT(*) > 50 THEN 
      '📊 MONITORING: Public template count is growing. Consider implementing pagination if count continues to increase.'
    ELSE 
      '✅ STATUS: Public template count is manageable. Continue monitoring monthly.'
  END as recommendation,
  COUNT(*) as current_count
FROM task_templates
WHERE is_public = true;

