-- ============================================
-- ODDITY WELCOME SCREEN - TEST SCRIPTS
-- ============================================
-- Replace 'your-test-email@example.com' with your actual test email

-- ============================================
-- PREPARATION: Check Current User State
-- ============================================
SELECT 
  id,
  email,
  subscription_tier,
  subscription_status,
  trial_start_date,
  subscription_expires_at,
  last_welcome_shown_at
FROM users 
WHERE email = 'your-test-email@example.com';


-- ============================================
-- TEST 1: TRIAL-EARLY VARIANT
-- ============================================
-- User purchases DURING active trial
-- Expected: "Congratulations! You're now An Oddity" + "You now have access to"

-- Setup: Give user an active trial
UPDATE users 
SET subscription_tier = 'oddity',
    subscription_status = 'trialing',
    trial_start_date = NOW(),
    subscription_expires_at = NOW() + INTERVAL '7 days',
    last_welcome_shown_at = NULL  -- Reset to allow welcome screen to show
WHERE email = 'your-test-email@example.com';

-- Verify setup
SELECT 
  email,
  subscription_status,
  trial_start_date,
  subscription_expires_at,
  (subscription_expires_at > NOW()) as "trial_is_active"
FROM users 
WHERE email = 'your-test-email@example.com';

-- ✅ Now in the app: Navigate to PaywallScreen and purchase
-- Expected: Welcome screen with "Congratulations! You're now An Oddity"


-- ============================================
-- TEST 2: TRIAL-EXPIRED VARIANT
-- ============================================
-- User purchases 0-4 days AFTER trial expires
-- Expected: "Congratulations! You're now An Oddity" + "You now have access to"

-- Setup: Give user an expired trial (2 days ago)
UPDATE users 
SET subscription_tier = 'free',
    subscription_status = 'expired',
    trial_start_date = NOW() - INTERVAL '9 days',
    subscription_expires_at = NOW() - INTERVAL '2 days',
    last_welcome_shown_at = NULL  -- Reset to allow welcome screen to show
WHERE email = 'your-test-email@example.com';

-- Verify setup
SELECT 
  email,
  subscription_status,
  trial_start_date,
  subscription_expires_at,
  (NOW() - subscription_expires_at) as "days_since_trial_ended"
FROM users 
WHERE email = 'your-test-email@example.com';

-- ✅ Now in the app: Navigate to PaywallScreen and purchase
-- Expected: Welcome screen with "Congratulations! You're now An Oddity"


-- ============================================
-- TEST 3: DIRECT PURCHASE VARIANT
-- ============================================
-- User purchases 4+ days AFTER trial expires
-- Expected: "Welcome! You're now An Oddity" + "You now have access to"

-- Setup: Give user a trial that expired 8 days ago
UPDATE users 
SET subscription_tier = 'free',
    subscription_status = 'expired',
    trial_start_date = NOW() - INTERVAL '15 days',
    subscription_expires_at = NOW() - INTERVAL '8 days',
    last_welcome_shown_at = NULL  -- Reset to allow welcome screen to show
WHERE email = 'your-test-email@example.com';

-- Verify setup
SELECT 
  email,
  subscription_status,
  trial_start_date,
  subscription_expires_at,
  (NOW() - subscription_expires_at) as "days_since_trial_ended"
FROM users 
WHERE email = 'your-test-email@example.com';

-- ✅ Now in the app: Navigate to PaywallScreen and purchase
-- Expected: Welcome screen with "Welcome! You're now An Oddity"


-- ============================================
-- TEST 4: RENEWAL VARIANT
-- ============================================
-- User RE-PURCHASES after previous cancellation
-- Expected: "Welcome back! You're an Oddity Once again" + "You have access to"

-- Setup: Give user a canceled subscription
UPDATE users 
SET subscription_tier = 'free',
    subscription_status = 'canceled',  -- Key: previous subscription was canceled
    trial_start_date = NOW() - INTERVAL '30 days',
    subscription_expires_at = NOW() - INTERVAL '10 days',
    last_welcome_shown_at = NULL  -- Reset to allow welcome screen to show
WHERE email = 'your-test-email@example.com';

-- Verify setup
SELECT 
  email,
  subscription_status,
  subscription_tier,
  trial_start_date,
  subscription_expires_at
FROM users 
WHERE email = 'your-test-email@example.com';

-- ✅ Now in the app: Navigate to PaywallScreen and purchase
-- Expected: Welcome screen with "Welcome back! You're an Oddity Once again"


-- ============================================
-- TEST 5: RESTORE VARIANT
-- ============================================
-- User RESTORES previous purchase
-- Expected: "Your membership has been restored! You're now An Oddity again" + "You have access to"

-- Setup: Give user free tier (simulate app reinstall/lost purchase)
UPDATE users 
SET subscription_tier = 'free',
    subscription_status = 'expired',
    trial_start_date = NOW() - INTERVAL '30 days',
    subscription_expires_at = NOW() - INTERVAL '15 days',
    last_welcome_shown_at = NULL  -- Reset to allow welcome screen to show
WHERE email = 'your-test-email@example.com';

-- Verify setup
SELECT 
  email,
  subscription_tier,
  subscription_status
FROM users 
WHERE email = 'your-test-email@example.com';

-- ✅ Now in the app: 
-- 1. Navigate to Account Screen → Subscription Management
-- 2. Tap "Restore Purchases" button
-- Expected: Welcome screen with "Your membership has been restored!"

-- NOTE: This requires you actually have a valid purchase in RevenueCat
-- If restore fails, it means RevenueCat doesn't have a purchase for this user


-- ============================================
-- TEST 6: GENERIC FALLBACK
-- ============================================
-- Error case or placeholder variants (promo, granted, plan-change)
-- Expected: Small modal with "You're now An Oddity" (no confetti)

-- Setup: Remove trial data to trigger fallback
UPDATE users 
SET subscription_tier = 'free',
    subscription_status = NULL,
    trial_start_date = NULL,
    subscription_expires_at = NULL,
    last_welcome_shown_at = NULL  -- Reset to allow welcome screen to show
WHERE email = 'your-test-email@example.com';

-- Verify setup
SELECT 
  email,
  subscription_tier,
  trial_start_date,
  subscription_expires_at
FROM users 
WHERE email = 'your-test-email@example.com';

-- ✅ Now in the app: Navigate to PaywallScreen and purchase
-- Expected: Small generic modal (not full welcome screen)


-- ============================================
-- UTILITY QUERIES
-- ============================================

-- Reset welcome screen display (to test multiple times)
UPDATE users 
SET last_welcome_shown_at = NULL
WHERE email = 'your-test-email@example.com';

-- Check if welcome screen was shown
SELECT 
  email,
  last_welcome_shown_at,
  (last_welcome_shown_at IS NOT NULL) as "welcome_was_shown"
FROM users 
WHERE email = 'your-test-email@example.com';

-- See all test users and their states
SELECT 
  email,
  subscription_tier,
  subscription_status,
  trial_start_date,
  subscription_expires_at,
  last_welcome_shown_at
FROM users 
WHERE email LIKE '%test%' OR email LIKE '%demo%'
ORDER BY created_at DESC
LIMIT 10;

-- Reset user to fresh state
UPDATE users 
SET subscription_tier = 'free',
    subscription_status = NULL,
    trial_start_date = NULL,
    subscription_expires_at = NULL,
    last_welcome_shown_at = NULL
WHERE email = 'your-test-email@example.com';

