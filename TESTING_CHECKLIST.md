# ✅ Oddity Welcome Screen - Testing Checklist

## 📋 Pre-Testing Setup

### Step 1: Prepare Your Test Account

- [ ] Create a test user account or identify existing test email
- [ ] Update all SQL scripts: Replace `'your-test-email@example.com'` with your actual test email
- [ ] Ensure RevenueCat is configured in sandbox/test mode

### Step 2: Start the App

```bash
# iOS
npm run ios

# Android
npm run android
```

---

## 🧪 Test Each Variant

### ✅ TEST 1: Trial-Early Variant

**Setup** (Run in Supabase SQL Editor):

```sql
UPDATE users
SET subscription_tier = 'oddity',
    subscription_status = 'trialing',
    trial_start_date = NOW(),
    subscription_expires_at = NOW() + INTERVAL '7 days',
    last_welcome_shown_at = NULL
WHERE email = 'YOUR_TEST_EMAIL';
```

**Test Steps**:

1. [ ] Run the SQL script above
2. [ ] In app: Navigate to any locked feature OR Profile → "Upgrade to Oddity"
3. [ ] Complete purchase flow (use test card/sandbox mode)

**Expected Results**:

- [ ] Confetti animation plays (full screen, ~3 seconds)
- [ ] Modal appears (70% width/height, centered)
- [ ] Blurred background visible
- [ ] Headline: **"Congratulations!"**
- [ ] Subheadline: **"You're now An Oddity"**
- [ ] Benefits text: **"You now have access to:"**
- [ ] 4 benefits listed with icons
- [ ] Continue button visible
- [ ] Tapping Continue navigates to Home screen

**Status**: ⬜ Pass / ⬜ Fail  
**Notes**: **********\*\***********\_\_\_**********\*\***********

---

### ✅ TEST 2: Trial-Expired Variant

**Setup** (Run in Supabase SQL Editor):

```sql
UPDATE users
SET subscription_tier = 'free',
    subscription_status = 'expired',
    trial_start_date = NOW() - INTERVAL '9 days',
    subscription_expires_at = NOW() - INTERVAL '2 days',
    last_welcome_shown_at = NULL
WHERE email = 'YOUR_TEST_EMAIL';
```

**Test Steps**:

1. [ ] Run the SQL script above
2. [ ] In app: Navigate to PaywallScreen
3. [ ] Complete purchase flow

**Expected Results**:

- [ ] Confetti animation plays
- [ ] Headline: **"Congratulations!"**
- [ ] Subheadline: **"You're now An Oddity"**
- [ ] Benefits text: **"You now have access to:"**
- [ ] Continue button → Home screen

**Status**: ⬜ Pass / ⬜ Fail  
**Notes**: **********\*\***********\_\_\_**********\*\***********

---

### ✅ TEST 3: Direct Purchase Variant

**Setup** (Run in Supabase SQL Editor):

```sql
UPDATE users
SET subscription_tier = 'free',
    subscription_status = 'expired',
    trial_start_date = NOW() - INTERVAL '15 days',
    subscription_expires_at = NOW() - INTERVAL '8 days',
    last_welcome_shown_at = NULL
WHERE email = 'YOUR_TEST_EMAIL';
```

**Test Steps**:

1. [ ] Run the SQL script above
2. [ ] In app: Navigate to PaywallScreen
3. [ ] Complete purchase flow

**Expected Results**:

- [ ] Confetti animation plays
- [ ] Headline: **"Welcome!"** (different from Trial-Early/Expired!)
- [ ] Subheadline: **"You're now An Oddity"**
- [ ] Benefits text: **"You now have access to:"**
- [ ] Continue button → Home screen

**Status**: ⬜ Pass / ⬜ Fail  
**Notes**: **********\*\***********\_\_\_**********\*\***********

---

### ✅ TEST 4: Renewal Variant

**Setup** (Run in Supabase SQL Editor):

```sql
UPDATE users
SET subscription_tier = 'free',
    subscription_status = 'canceled',
    trial_start_date = NOW() - INTERVAL '30 days',
    subscription_expires_at = NOW() - INTERVAL '10 days',
    last_welcome_shown_at = NULL
WHERE email = 'YOUR_TEST_EMAIL';
```

**Test Steps**:

1. [ ] Run the SQL script above
2. [ ] In app: Navigate to PaywallScreen
3. [ ] Complete purchase flow

**Expected Results**:

- [ ] Confetti animation plays
- [ ] Headline: **"Welcome back!"** (different!)
- [ ] Subheadline: **"You're an Oddity Once again"**
- [ ] Benefits text: **"You have access to:"** (no "now"!)
- [ ] Continue button → Home screen

**Status**: ⬜ Pass / ⬜ Fail  
**Notes**: **********\*\***********\_\_\_**********\*\***********

---

### ✅ TEST 5: Restore Variant

**Setup** (Run in Supabase SQL Editor):

```sql
UPDATE users
SET subscription_tier = 'free',
    subscription_status = 'expired',
    trial_start_date = NOW() - INTERVAL '30 days',
    subscription_expires_at = NOW() - INTERVAL '15 days',
    last_welcome_shown_at = NULL
WHERE email = 'YOUR_TEST_EMAIL';
```

**Test Steps**:

1. [ ] Run the SQL script above
2. [ ] In app: Navigate to **Account Screen**
3. [ ] Scroll to **Subscription Management** section
4. [ ] Tap **"Restore Purchases"** button

**Expected Results**:

- [ ] Confetti animation plays
- [ ] Headline: **"Your membership has been restored!"**
- [ ] Subheadline: **"You're now An Oddity again"**
- [ ] Benefits text: **"You have access to:"** (no "now")
- [ ] Continue button → Home screen
- [ ] Toast message: "Purchases restored successfully!"

**Status**: ⬜ Pass / ⬜ Fail  
**Notes**: **********\*\***********\_\_\_**********\*\***********

**⚠️ Note**: This test requires a valid previous purchase in RevenueCat. If you don't have one:

- Use RevenueCat sandbox mode
- Or test on a real account that had a subscription

---

### ✅ TEST 6: Generic Fallback

**Setup** (Run in Supabase SQL Editor):

```sql
UPDATE users
SET subscription_tier = 'free',
    subscription_status = NULL,
    trial_start_date = NULL,
    subscription_expires_at = NULL,
    last_welcome_shown_at = NULL
WHERE email = 'YOUR_TEST_EMAIL';
```

**Test Steps**:

1. [ ] Run the SQL script above
2. [ ] In app: Navigate to PaywallScreen
3. [ ] Complete purchase flow

**Expected Results**:

- [ ] **Small modal** appears (not full screen)
- [ ] **NO confetti** animation
- [ ] Simple text: **"You're now An Oddity"**
- [ ] Continue button visible
- [ ] Continue button → Home screen

**Status**: ⬜ Pass / ⬜ Fail  
**Notes**: **********\*\***********\_\_\_**********\*\***********

---

## 🔍 Additional Testing

### Single Display Test

**Verify welcome screen only shows once**:

1. [ ] Complete any variant test above
2. [ ] Verify `last_welcome_shown_at` is set:

```sql
SELECT last_welcome_shown_at FROM users WHERE email = 'YOUR_TEST_EMAIL';
```

3. [ ] Try to trigger the same purchase scenario again
4. [ ] Welcome screen should **NOT** appear (because it already showed)

**Status**: ⬜ Pass / ⬜ Fail

---

### Modal Behavior Test

1. [ ] Open any welcome screen variant
2. [ ] Try tapping outside the modal
3. [ ] Modal should **NOT** close (only Continue button dismisses it)
4. [ ] Try swiping down (iOS gesture)
5. [ ] Modal should **NOT** close

**Status**: ⬜ Pass / ⬜ Fail

---

### Confetti Duration Test

1. [ ] Open any active variant (trial-early, trial-expired, direct, renewal, restore)
2. [ ] Start a timer when confetti starts
3. [ ] Confetti should run for approximately **3 seconds**
4. [ ] Confetti should fade out smoothly

**Status**: ⬜ Pass / ⬜ Fail

---

### Navigation Test

1. [ ] Complete any variant test
2. [ ] Tap Continue button
3. [ ] Should navigate to **Main/Home screen** (not back to where you were)
4. [ ] Verify you're on the main home screen with all features visible

**Status**: ⬜ Pass / ⬜ Fail

---

## 🐛 Debugging

### If Welcome Screen Doesn't Appear:

**Check 1: Navigation Setup**

```sql
-- Verify user state
SELECT subscription_tier, subscription_status, trial_start_date, subscription_expires_at
FROM users WHERE email = 'YOUR_TEST_EMAIL';
```

**Check 2: Console Logs**

- Open React Native debugger
- Look for logs from `determineWelcomeVariant()`
- Check for navigation errors

**Check 3: Welcome Screen Already Shown?**

```sql
-- Check if welcome was already displayed
SELECT last_welcome_shown_at FROM users WHERE email = 'YOUR_TEST_EMAIL';

-- Reset if needed
UPDATE users SET last_welcome_shown_at = NULL WHERE email = 'YOUR_TEST_EMAIL';
```

### If Wrong Variant Appears:

Add this console.log to `PaywallScreen.tsx` in `determineWelcomeVariant()`:

```typescript
console.log('🔍 Variant Detection Debug:', {
  now: now.toISOString(),
  trialStart: trialStart?.toISOString(),
  trialExpires: trialExpires?.toISOString(),
  previousStatus,
  detectedVariant: 'XXX', // add at return point
});
```

### If Confetti Doesn't Show:

Check package installation:

```bash
npm list react-native-confetti-cannon
```

Should show: `react-native-confetti-cannon@1.5.2`

---

## 📊 Final Results

### Summary:

- Trial-Early: ⬜ Pass / ⬜ Fail
- Trial-Expired: ⬜ Pass / ⬜ Fail
- Direct: ⬜ Pass / ⬜ Fail
- Renewal: ⬜ Pass / ⬜ Fail
- Restore: ⬜ Pass / ⬜ Fail
- Generic Fallback: ⬜ Pass / ⬜ Fail
- Single Display: ⬜ Pass / ⬜ Fail
- Modal Behavior: ⬜ Pass / ⬜ Fail
- Confetti Duration: ⬜ Pass / ⬜ Fail
- Navigation: ⬜ Pass / ⬜ Fail

### Overall Status: ⬜ ALL PASSED / ⬜ NEEDS FIXES

### Issues Found:

1. ***
2. ***
3. ***

### Notes:

---

---

---

---

## ✅ Testing Complete!

Once all tests pass, the OddityWelcomeScreen feature is ready for production! 🎉
