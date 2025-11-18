# Phase 2: Quick Start Guide

**Quick reference for running Phase 2 verification**

## 🚀 Quick Commands

### 1. Verify Edge Functions Deployment
```bash
npm run verify:edge-functions
```

**What it does:**
- Lists all local Edge Functions
- Compares with deployed functions
- Reports missing/extra deployments

**Prerequisites:**
```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF
```

---

### 2. Test Critical Edge Functions
```bash
npm run test:edge-functions
```

**What it does:**
- Tests critical functions via HTTP
- Verifies endpoints are accessible
- Reports success/failure

**Requires:**
- `.env` file with:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

### 3. Verify Third-Party Services
```bash
npm run verify:services
```

**What it does:**
- Checks Sentry configuration
- Tests Mixpanel connection
- Validates RevenueCat key
- Tests Supabase connectivity

**Requires:**
- `.env` file with service keys (see below)

---

## 📝 Environment Variables

Create a `.env` file in the project root:

```env
# Required
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional (for full verification)
EXPO_PUBLIC_SENTRY_DSN=https://key@host/project-id
EXPO_PUBLIC_MIXPANEL_TOKEN=your-mixpanel-token
EXPO_PUBLIC_REVENUECAT_APPLE_KEY=rcb_your-key
```

---

## ✅ Expected Results

### Edge Functions Verification
```
✅ All Edge Functions are deployed and in sync!
```

OR

```
❌ Missing deployments (X functions):
  - function-name-1
  - function-name-2
```

### Third-Party Services
```
✅ All services verified!
```

OR

```
❌ Failed: X
⚠️  Not configured: Y
```

---

## 🔧 Troubleshooting

### "Supabase CLI not found"
```bash
npm install -g supabase
```

### "Not logged in"
```bash
supabase login
```

### "Project not linked"
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### "Missing Supabase configuration"
- Create `.env` file
- Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## 📚 Full Documentation

- `PHASE2_EXECUTION_PLAN.md` - Detailed execution plan
- `PHASE2_SUMMARY.md` - Complete summary
- `scripts/verify-edge-functions.sh` - Edge Functions script
- `scripts/test-edge-functions.sh` - Testing script
- `scripts/verify-third-party-services.js` - Services script

---

**Ready to verify! Run the commands above to check your deployment status.**

