# Phase 2: Edge Functions & Third-Party Services Verification

**Date:** January 2025  
**Status:** 🚀 Ready to Execute

## 📋 Overview

Phase 2 focuses on verifying that all critical infrastructure components are properly deployed and configured:

1. **Edge Functions Deployment** - Ensure all local functions are deployed to Supabase
2. **Third-Party Services** - Verify integrations with Sentry, Mixpanel, RevenueCat, and Supabase

---

## 🎯 Goals

- ✅ Verify all Edge Functions are deployed
- ✅ Identify any missing deployments
- ✅ Verify third-party service configurations
- ✅ Test service connectivity
- ✅ Document deployment status
- ✅ Create deployment checklist

---

## 📝 Tasks

### Task 2.1: Edge Functions Verification

#### Step 1: Inventory Local Functions

**Script:** `scripts/verify-edge-functions.sh`

**What it does:**

- Scans `supabase/functions/` directory
- Lists all local Edge Functions (excludes `_shared`)
- Compares with deployed functions via `supabase functions list`
- Reports missing deployments
- Reports extra deployments (not in local)

**Expected Output:**

```
📋 Local Edge Functions:
  1. admin-export-all-data
  2. admin-system
  3. api-v2
  4. assignments-system
  ...

🚀 Deployed Edge Functions:
  1. admin-system
  2. api-v2
  ...

❌ Missing deployments (X functions):
  - create-assignment
  - update-assignment
  ...
```

**How to Run:**

```bash
npm run verify:edge-functions
# OR
./scripts/verify-edge-functions.sh
```

**Prerequisites:**

- Supabase CLI installed: `npm install -g supabase`
- Logged in: `supabase login`
- Project linked: `supabase link --project-ref YOUR_PROJECT_REF`

---

#### Step 2: Test Critical Edge Functions

**Script:** `scripts/test-edge-functions.sh`

**What it does:**

- Tests critical Edge Functions by making HTTP requests
- Verifies endpoints are accessible
- Checks authentication requirements
- Reports success/failure for each function

**Critical Functions to Test:**

- `health-check` - Basic health endpoint
- `api-v2` - Main API endpoint
- `create-assignment` - Task creation
- `create-course` - Course creation
- `auth/signup` - User registration (if exists)

**How to Run:**

```bash
npm run test:edge-functions
# OR
./scripts/test-edge-functions.sh
```

**Note:** Requires environment variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

### Task 2.2: Third-Party Services Verification

#### Step 1: Verify Service Configurations

**Script:** `scripts/verify-third-party-services.js`

**What it does:**

- Checks environment variables for each service
- Tests Sentry DSN validity
- Tests Mixpanel API connection
- Validates RevenueCat key format
- Tests Supabase REST API connectivity

**Services Verified:**

1. **Sentry** (Error Tracking)
   - Checks `EXPO_PUBLIC_SENTRY_DSN`
   - Validates DSN format
   - Tests API connectivity

2. **Mixpanel** (Analytics)
   - Checks `EXPO_PUBLIC_MIXPANEL_TOKEN`
   - Tests event tracking API
   - Verifies token validity

3. **RevenueCat** (Subscriptions)
   - Checks `EXPO_PUBLIC_REVENUECAT_APPLE_KEY`
   - Validates key format (should start with `rcb_`)

4. **Supabase** (Backend)
   - Checks `EXPO_PUBLIC_SUPABASE_URL`
   - Checks `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - Tests REST API connectivity

**How to Run:**

```bash
npm run verify:services
# OR
node scripts/verify-third-party-services.js
```

**Expected Output:**

```
🔍 Verifying Third-Party Services
==================================================

ℹ️ Checking Sentry...
✅ Sentry: Working

ℹ️ Checking Mixpanel...
✅ Mixpanel: Working

ℹ️ Checking RevenueCat...
✅ RevenueCat: Working

ℹ️ Checking Supabase...
✅ Supabase: Working

==================================================

📊 Summary:
✅ Working: 4
❌ Failed: 0
⚠️  Not configured: 0

✅ All services verified!
```

---

#### Step 2: Runtime Health Check

**Service:** `src/services/serviceHealthCheck.ts`

**What it does:**

- Provides runtime health check for services
- Can be called from within the app
- Returns detailed status for each service

**Usage:**

```typescript
import { checkServiceHealth } from '@/services/serviceHealthCheck';

const health = await checkServiceHealth();
console.log(health);
// {
//   sentry: { status: 'ok' },
//   mixpanel: { status: 'ok' },
//   revenuecat: { status: 'ok' },
//   supabase: { status: 'ok' }
// }
```

---

## 📊 Expected Results

### Edge Functions

- **Total Local Functions:** ~80+ functions
- **Expected Deployed:** All critical functions
- **Critical Functions:**
  - `health-check`
  - `api-v2`
  - `create-assignment`
  - `update-assignment`
  - `delete-assignment`
  - `create-course`
  - `update-course`
  - `create-lecture`
  - `update-lecture`
  - `create-study-session`
  - `update-study-session`
  - `soft-delete-account`
  - `restore-account`
  - `get-home-screen-data`
  - `get-calendar-data-for-week`

### Third-Party Services

- **Sentry:** ✅ Configured and working
- **Mixpanel:** ✅ Configured and working
- **RevenueCat:** ✅ Configured and working
- **Supabase:** ✅ Configured and working

---

## 🚨 Troubleshooting

### Edge Functions Issues

**Issue:** `supabase functions list` returns empty

- **Solution:** Ensure you're logged in and linked to the project
  ```bash
  supabase login
  supabase link --project-ref YOUR_PROJECT_REF
  ```

**Issue:** Functions not deploying

- **Solution:** Deploy missing functions
  ```bash
  supabase functions deploy FUNCTION_NAME
  ```

**Issue:** Function deployment fails

- **Solution:** Check function code for errors, verify dependencies in `deno.json`

### Third-Party Services Issues

**Issue:** Sentry DSN invalid

- **Solution:** Verify DSN format: `https://KEY@HOST/PROJECT_ID`
- Check Sentry dashboard for correct DSN

**Issue:** Mixpanel connection fails

- **Solution:** Verify token is correct, check network connectivity
- Test with Mixpanel API directly

**Issue:** RevenueCat key format invalid

- **Solution:** Ensure key starts with `rcb_`
- Get correct key from RevenueCat dashboard

**Issue:** Supabase connection fails

- **Solution:** Verify URL and anon key are correct
- Check Supabase project settings

---

## ✅ Success Criteria

- [ ] All critical Edge Functions are deployed
- [ ] No missing deployments for production functions
- [ ] All third-party services are configured
- [ ] All services pass connectivity tests
- [ ] Health check service works correctly
- [ ] Documentation updated with deployment status

---

## 📝 Next Steps After Verification

1. **Deploy Missing Functions:**

   ```bash
   # For each missing function
   supabase functions deploy FUNCTION_NAME
   ```

2. **Fix Service Configuration:**
   - Update `.env` or environment variables
   - Re-run verification scripts

3. **Update Documentation:**
   - Document deployment status
   - Create deployment checklist
   - Update README with verification steps

4. **Set Up CI/CD:**
   - Add verification scripts to CI pipeline
   - Automate deployment checks
   - Add health check monitoring

---

## 🔗 Related Files

- `scripts/verify-edge-functions.sh` - Edge Functions verification
- `scripts/test-edge-functions.sh` - Edge Functions testing
- `scripts/verify-third-party-services.js` - Services verification
- `src/services/serviceHealthCheck.ts` - Runtime health check
- `package.json` - NPM scripts for verification

---

**Ready to execute Phase 2 verification!**
