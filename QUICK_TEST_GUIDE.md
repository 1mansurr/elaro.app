# 🚀 Quick Test Guide - Oddity Welcome Screen

## ⚡ Fast Testing (5 minutes per variant)

### Setup Once:
1. Replace `YOUR_TEST_EMAIL` in SQL scripts with your actual test email
2. Start the app: `npm run ios` or `npm run android`
3. Open Supabase SQL Editor: https://app.supabase.com

---

## 📝 Copy-Paste Test Scripts

### 1️⃣ Trial-Early (Purchase During Trial)
```sql
-- Setup
UPDATE users SET subscription_tier = 'oddity', subscription_status = 'trialing', 
trial_start_date = NOW(), subscription_expires_at = NOW() + INTERVAL '7 days', 
last_welcome_shown_at = NULL WHERE email = 'YOUR_TEST_EMAIL';
```
**In App**: Go to PaywallScreen → Purchase  
**Expected**: "Congratulations! You're now An Oddity" + confetti

---

### 2️⃣ Trial-Expired (Purchase 1-4 Days After Trial)
```sql
-- Setup
UPDATE users SET subscription_tier = 'free', subscription_status = 'expired', 
trial_start_date = NOW() - INTERVAL '9 days', subscription_expires_at = NOW() - INTERVAL '2 days', 
last_welcome_shown_at = NULL WHERE email = 'YOUR_TEST_EMAIL';
```
**In App**: Go to PaywallScreen → Purchase  
**Expected**: "Congratulations! You're now An Oddity" + confetti

---

### 3️⃣ Direct (Purchase 5+ Days After Trial)
```sql
-- Setup
UPDATE users SET subscription_tier = 'free', subscription_status = 'expired', 
trial_start_date = NOW() - INTERVAL '15 days', subscription_expires_at = NOW() - INTERVAL '8 days', 
last_welcome_shown_at = NULL WHERE email = 'YOUR_TEST_EMAIL';
```
**In App**: Go to PaywallScreen → Purchase  
**Expected**: "Welcome! You're now An Oddity" + confetti

---

### 4️⃣ Renewal (Re-Purchase After Cancellation)
```sql
-- Setup
UPDATE users SET subscription_tier = 'free', subscription_status = 'canceled', 
trial_start_date = NOW() - INTERVAL '30 days', subscription_expires_at = NOW() - INTERVAL '10 days', 
last_welcome_shown_at = NULL WHERE email = 'YOUR_TEST_EMAIL';
```
**In App**: Go to PaywallScreen → Purchase  
**Expected**: "Welcome back! You're an Oddity Once again" + confetti

---

### 5️⃣ Restore (Restore Previous Purchase)
```sql
-- Setup
UPDATE users SET subscription_tier = 'free', subscription_status = 'expired', 
trial_start_date = NOW() - INTERVAL '30 days', subscription_expires_at = NOW() - INTERVAL '15 days', 
last_welcome_shown_at = NULL WHERE email = 'YOUR_TEST_EMAIL';
```
**In App**: Account → Subscription Management → "Restore Purchases"  
**Expected**: "Your membership has been restored!" + confetti

---

### 6️⃣ Generic Fallback (Error Case)
```sql
-- Setup
UPDATE users SET subscription_tier = 'free', subscription_status = NULL, 
trial_start_date = NULL, subscription_expires_at = NULL, 
last_welcome_shown_at = NULL WHERE email = 'YOUR_TEST_EMAIL';
```
**In App**: Go to PaywallScreen → Purchase  
**Expected**: Small modal "You're now An Oddity" (NO confetti)

---

## 🔄 Reset Between Tests

```sql
-- Reset welcome screen to test again
UPDATE users SET last_welcome_shown_at = NULL WHERE email = 'YOUR_TEST_EMAIL';
```

---

## ✅ Quick Checklist

For each test, verify:
- [ ] Confetti plays (active variants only)
- [ ] Correct headline shown
- [ ] Correct benefits text ("now" vs regular)
- [ ] Continue button works
- [ ] Navigates to Home screen

---

## 🐛 Quick Debug

**Welcome screen not showing?**
```sql
-- Check if already shown
SELECT last_welcome_shown_at FROM users WHERE email = 'YOUR_TEST_EMAIL';

-- Reset
UPDATE users SET last_welcome_shown_at = NULL WHERE email = 'YOUR_TEST_EMAIL';
```

**Wrong variant?**
- Check trial dates in database
- Verify subscription_status value
- Look at React Native console logs

---

## 📚 Full Documentation

- **Detailed Testing**: See `TESTING_CHECKLIST.md`
- **All SQL Scripts**: See `TEST_SCRIPTS_ODDITY_WELCOME.sql`
- **Implementation Details**: See `ODDITY_WELCOME_SCREEN_IMPLEMENTATION.md`

