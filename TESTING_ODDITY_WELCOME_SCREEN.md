# 🧪 Testing Guide: Oddity Welcome Screen

## 📋 Pre-Testing Setup

### **1. Run Database Migration**

Since you're using a remote Supabase instance, you have two options:

#### **Option A: Using Supabase Dashboard (Recommended)**
1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your ELARO project
3. Navigate to **SQL Editor**
4. Copy and paste the contents of `supabase/migrations/20251027000000_add_trial_and_welcome_tracking.sql`
5. Click **Run** to execute the migration
6. Verify success in the output

#### **Option B: Using Supabase CLI with Remote**
```bash
cd /Users/new/Desktop/Biz/ELARO/ELARO-app

# Link to your remote project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Push migration to remote
supabase db push
```

### **2. Verify Migration Success**

Run this query in SQL Editor to verify:
```sql
-- Check if new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('trial_start_date', 'last_welcome_shown_at');

-- Should return 2 rows
```

---

## 🧪 Testing Each Variant

### **Test 1: Trial-Early Variant** ✅
**Scenario**: User purchases during active trial

**Steps**:
1. Create a new test user account or use existing free account
2. Ensure user has an active trial:
   ```sql
   -- Check trial status in SQL Editor
   SELECT id, email, subscription_tier, subscription_status, 
          trial_start_date, subscription_expires_at
   FROM users 
   WHERE email = 'your-test-email@example.com';
   ```
3. If no trial, trigger one:
   - Navigate to the app
   - The TrialWelcomeScreen should appear and start trial automatically
   - Or manually start trial via SQL:
   ```sql
   UPDATE users 
   SET subscription_tier = 'oddity',
       subscription_status = 'trialing',
       trial_start_date = NOW(),
       subscription_expires_at = NOW() + INTERVAL '7 days'
   WHERE email = 'your-test-email@example.com';
   ```
4. Navigate to any locked feature or PaywallScreen
5. Complete purchase flow
6. **Expected Result**:
   - OddityWelcomeScreen appears
   - Confetti animation plays for 3 seconds
   - Headline: "Congratulations!"
   - Subheadline: "You're now An Oddity"
   - Benefits text: "You now have access to:"
   - Continue button navigates to Home

---

### **Test 2: Trial-Expired Variant** ✅
**Scenario**: User purchases 0-4 days after trial expires

**Steps**:
1. Use a test user with expired trial
2. Set trial to expired (1-4 days ago):
   ```sql
   UPDATE users 
   SET subscription_tier = 'free',
       subscription_status = 'expired',
       trial_start_date = NOW() - INTERVAL '9 days',
       subscription_expires_at = NOW() - INTERVAL '2 days'
   WHERE email = 'your-test-email@example.com';
   ```
3. Navigate to PaywallScreen
4. Complete purchase
5. **Expected Result**:
   - Same as Trial-Early
   - Headline: "Congratulations!"
   - Subheadline: "You're now An Oddity"
   - Benefits text: "You now have access to:"

---

### **Test 3: Direct Purchase Variant** ✅
**Scenario**: User purchases 4+ days after trial expires

**Steps**:
1. Use a test user with long-expired trial
2. Set trial to expired 5+ days ago:
   ```sql
   UPDATE users 
   SET subscription_tier = 'free',
       subscription_status = 'expired',
       trial_start_date = NOW() - INTERVAL '15 days',
       subscription_expires_at = NOW() - INTERVAL '8 days'
   WHERE email = 'your-test-email@example.com';
   ```
3. Navigate to PaywallScreen
4. Complete purchase
5. **Expected Result**:
   - Headline: "Welcome!"
   - Subheadline: "You're now An Oddity"
   - Benefits text: "You now have access to:"

---

### **Test 4: Renewal Variant** ✅
**Scenario**: User re-purchases after previous cancellation

**Steps**:
1. Use a test user who previously had Oddity subscription
2. Set subscription to expired/canceled:
   ```sql
   UPDATE users 
   SET subscription_tier = 'free',
       subscription_status = 'canceled', -- or 'expired'
       trial_start_date = NOW() - INTERVAL '30 days',
       subscription_expires_at = NOW() - INTERVAL '10 days'
   WHERE email = 'your-test-email@example.com';
   ```
3. Navigate to PaywallScreen
4. Complete purchase
5. **Expected Result**:
   - Headline: "Welcome back!"
   - Subheadline: "You're an Oddity Once again"
   - Benefits text: "You have access to:" (not "now")

---

### **Test 5: Restore Variant** ✅
**Scenario**: User restores previous purchase

**Steps**:
1. User must have a valid previous purchase in RevenueCat
2. Clear app data or reinstall app (to simulate lost purchase)
3. Log in to app
4. Navigate to: **Account Screen → Subscription Management**
5. Tap **"Restore Purchases"** button
6. **Expected Result**:
   - OddityWelcomeScreen appears
   - Headline: "Your membership has been restored!"
   - Subheadline: "You're now An Oddity again"
   - Benefits text: "You have access to:"

---

### **Test 6: Generic Fallback** ✅
**Scenario**: Placeholder variants or error cases

**Steps**:
1. Manually trigger fallback by navigating directly:
   ```typescript
   // In any screen with navigation:
   navigation.navigate('OddityWelcomeScreen', { variant: 'promo' });
   ```
2. Or simulate error by removing trial_start_date:
   ```sql
   UPDATE users 
   SET trial_start_date = NULL,
       subscription_expires_at = NULL
   WHERE email = 'your-test-email@example.com';
   ```
3. Complete purchase
4. **Expected Result**:
   - Small modal (not full welcome screen)
   - Simple message: "You're now An Oddity"
   - No confetti
   - Continue button

---

## 🔍 Debugging Tips

### **Check Welcome Screen Was Shown**
```sql
SELECT email, last_welcome_shown_at 
FROM users 
WHERE email = 'your-test-email@example.com';
```

### **Reset Welcome Screen Display**
If you need to test multiple times on the same account:
```sql
UPDATE users 
SET last_welcome_shown_at = NULL
WHERE email = 'your-test-email@example.com';
```

### **Check Variant Detection Logic**
Add console logs in PaywallScreen's `determineWelcomeVariant()`:
```typescript
console.log('🔍 Variant Detection:', {
  now,
  trialStart,
  trialExpires,
  previousStatus,
  detectedVariant: 'trial-early' // etc
});
```

### **View React Native Logs**
```bash
# iOS
npx react-native log-ios

# Android
npx react-native log-android
```

---

## ✅ Testing Checklist

Use this checklist to track your testing progress:

- [ ] **Migration Run**: Database migration executed successfully
- [ ] **Migration Verified**: Columns exist in users table
- [ ] **Trial-Early**: Confetti, correct messaging, navigates to Home
- [ ] **Trial-Expired**: Confetti, correct messaging, navigates to Home
- [ ] **Direct**: Confetti, correct messaging, navigates to Home
- [ ] **Renewal**: Confetti, "Welcome back" messaging, navigates to Home
- [ ] **Restore**: Confetti, "restored" messaging, navigates to Home
- [ ] **Generic Fallback**: Small modal, no confetti, works correctly
- [ ] **Continue Button**: Always navigates to Home screen
- [ ] **Single Display**: Welcome screen only shows once per purchase
- [ ] **No Skip**: Users cannot dismiss without tapping Continue
- [ ] **Confetti Duration**: Runs for 3 seconds
- [ ] **Modal Size**: 70% width/height, centered, blurred background

---

## 🐛 Common Issues & Fixes

### **Issue: Confetti doesn't show**
**Fix**: Check that `react-native-confetti-cannon` is installed:
```bash
npm list react-native-confetti-cannon
# Should show: react-native-confetti-cannon@1.5.2
```

### **Issue: Welcome screen doesn't appear**
**Check**:
1. Navigation is properly set up in AuthenticatedNavigator
2. PaywallScreen is calling `navigation.navigate('OddityWelcomeScreen', { variant })`
3. Check console for errors

### **Issue: Wrong variant shows**
**Debug**:
1. Add console.log in `determineWelcomeVariant()`
2. Check trial_start_date and subscription_expires_at in database
3. Verify current date vs trial dates calculation

### **Issue: Modal appears twice**
**Fix**: 
```sql
-- Reset the tracking flag
UPDATE users 
SET last_welcome_shown_at = NULL
WHERE email = 'your-test-email@example.com';
```

---

## 📱 Testing on Different Platforms

### **iOS Testing**
```bash
npm run ios
# or
npm run start:ios
```

### **Android Testing**
```bash
npm run android
# or
npm run start:android
```

---

## 🎯 Success Criteria

All variants should:
1. ✅ Display correct headline and subheadline
2. ✅ Show appropriate benefits text ("now" vs regular)
3. ✅ Play confetti for 3 seconds (active variants)
4. ✅ Center modal at 70% width/height
5. ✅ Blur background appropriately
6. ✅ Navigate to Home on Continue tap
7. ✅ Update last_welcome_shown_at in database
8. ✅ Not show again for same purchase

---

## 📊 Test Results Template

Use this to document your testing:

```markdown
## Test Results: [Date]

### Trial-Early Variant
- [ ] Pass / [ ] Fail
- Notes: _______________

### Trial-Expired Variant
- [ ] Pass / [ ] Fail
- Notes: _______________

### Direct Variant
- [ ] Pass / [ ] Fail
- Notes: _______________

### Renewal Variant
- [ ] Pass / [ ] Fail
- Notes: _______________

### Restore Variant
- [ ] Pass / [ ] Fail
- Notes: _______________

### Generic Fallback
- [ ] Pass / [ ] Fail
- Notes: _______________

### Issues Found:
1. _______________
2. _______________

### Overall Status: ✅ PASSED / ❌ NEEDS FIXES
```

---

Happy Testing! 🎉

