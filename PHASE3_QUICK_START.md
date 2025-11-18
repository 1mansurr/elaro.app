# Phase 3: Quick Start Guide

**Quick reference for running Phase 3 pre-launch checks**

## 🚀 Quick Commands

### Run Pre-Launch Checks
```bash
npm run pre-launch:check
```

**What it does:**
- Checks test coverage thresholds
- Verifies Edge Functions deployment
- Verifies third-party services
- Runs security audit
- Checks linting
- Checks TypeScript

**Expected Output:**
```
🚀 Pre-Launch Checklist

============================================================
1. Test Coverage Verification
============================================================

✅ Test coverage meets requirements

============================================================
2. Edge Functions Verification
============================================================

✅ All Edge Functions are deployed

...

============================================================
Pre-Launch Check Summary
============================================================

✅ Test Coverage: PASSED
✅ Edge Functions: PASSED
✅ Third-Party Services: PASSED
✅ Security Audit: PASSED
✅ Linting: PASSED
✅ Type Checking: PASSED

🎉 All pre-launch checks passed! Ready for beta launch.
```

---

## 📋 Prerequisites

### Environment Variables
Create a `.env` file:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_SENTRY_DSN=https://key@host/project-id
EXPO_PUBLIC_MIXPANEL_TOKEN=your-token
EXPO_PUBLIC_REVENUECAT_APPLE_KEY=rcb_your-key
```

### Supabase CLI (for Edge Functions check)
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

---

## 🔧 Troubleshooting

### "Test coverage below thresholds"
```bash
# Generate detailed coverage report
npm run test:coverage

# Review which files need more tests
# Add tests to critical paths
```

### "Edge Functions not deployed"
```bash
# See which functions are missing
npm run verify:edge-functions

# Deploy missing functions
supabase functions deploy FUNCTION_NAME
```

### "Services verification failed"
- Check environment variables are set
- Verify credentials are correct
- Test network connectivity

### "Security audit found vulnerabilities"
```bash
# Try to fix automatically
npm audit fix

# Review remaining issues
npm audit
```

---

## 📊 CI/CD Setup

### GitHub Actions

The CI/CD pipeline is already configured in `.github/workflows/ci.yml`.

**To activate:**
1. Push the workflow file to your repository
2. Add secrets to GitHub Settings → Secrets:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_SENTRY_DSN` (optional)
   - `EXPO_PUBLIC_MIXPANEL_TOKEN` (optional)
   - `EXPO_PUBLIC_REVENUECAT_APPLE_KEY` (optional)

**The pipeline will:**
- Run on every push/PR
- Test code and check coverage
- Verify services
- Run security audits
- Run full pre-launch check on main branch

---

## ✅ Pre-Launch Checklist

Before beta launch, ensure:

- [ ] All pre-launch checks pass
- [ ] Test coverage meets thresholds (70%+ critical paths)
- [ ] All Edge Functions deployed
- [ ] All services verified
- [ ] Security audit passed
- [ ] No critical bugs
- [ ] App Store assets ready
- [ ] Privacy policy and Terms of Service
- [ ] Beta testing plan ready
- [ ] Monitoring configured

---

## 📚 Full Documentation

- `PHASE3_EXECUTION_PLAN.md` - Detailed execution plan
- `PHASE3_SUMMARY.md` - Complete summary
- `scripts/pre-launch-check.js` - Pre-launch script
- `.github/workflows/ci.yml` - CI/CD pipeline

---

**Ready to verify! Run `npm run pre-launch:check` to check your beta readiness.**


