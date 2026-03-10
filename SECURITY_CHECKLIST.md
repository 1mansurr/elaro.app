# Security Checklist

## Pre-Release Security Checklist

This checklist must be completed before any production release. **All items must pass** or the release is blocked.

---

## 🔴 CRITICAL (Blocks Release)

### Authentication & Authorization

- [ ] **All Edge Functions with `verify_jwt = false` have alternative authentication**
  - Check: `supabase/config.toml` for `verify_jwt = false`
  - Verify: Each endpoint has secret validation or service role key check
  - **Block if:** Any endpoint is unauthenticated

- [ ] **No wildcard CORS (`'*'`) in production**
  - Check: `supabase/functions/_shared/cors.ts`
  - Verify: `getCorsHeaders()` returns `'null'` or specific origins
  - **Block if:** Wildcard `'*'` found

- [ ] **All authenticated endpoints enforce ownership checks**
  - Check: Update/delete operations verify `user_id` before execution
  - Verify: Batch operations force `user_id` in filters
  - **Block if:** Any endpoint allows cross-user data access

### Secrets Management

- [ ] **No secrets in git history**
  - Check: `git log --all --full-history -- "*.p8" "*.key" "*.secret"`
  - Verify: No `.p8`, `.key`, or secret files in history
  - **Block if:** Secrets found in git history

- [ ] **No secrets in client bundle**
  - Check: `scripts/audit-secrets.js` passes
  - Verify: No `SUPABASE_SERVICE_ROLE_KEY` or other server secrets in `EXPO_PUBLIC_*`
  - **Block if:** Server secrets exposed to client

- [ ] **Apple private keys not in repository**
  - Check: `ls AuthKey_*.p8` (should fail)
  - Verify: Files removed from filesystem
  - **Block if:** `.p8` files present

---

## 🟡 HIGH PRIORITY (Should Pass)

### Input Validation

- [ ] **All write endpoints use Zod schema validation**
  - Check: Edge Functions use `schema` option in `createAuthenticatedHandler`
  - Verify: Input validation applied
  - **Warn if:** Missing validation (but don't block)

- [ ] **SQL injection prevention verified**
  - Check: All queries use parameterized queries (Supabase client)
  - Verify: No string concatenation in SQL
  - **Warn if:** Potential SQL injection found

### Rate Limiting

- [ ] **All write endpoints have rate limiting**
  - Check: `rateLimitName` specified in handler options
  - Verify: Rate limits configured in `rate-limiter.ts`
  - **Warn if:** Missing rate limits

### Error Handling

- [ ] **PII redaction in error responses**
  - Check: Error handlers use `sanitizeErrorMessage()`
  - Verify: No sensitive data in error messages
  - **Warn if:** PII in error responses

---

## 🟢 RECOMMENDED (Best Practices)

### Code Quality

- [ ] **All Edge Functions use `getCorsHeaders(origin)` instead of `corsHeaders`**
  - Check: No direct imports of `corsHeaders` (except in `_shared/response.ts` for legacy)
  - Verify: All OPTIONS handlers use `getCorsHeaders(req.headers.get('Origin'))`
  - **Warn if:** Functions still use deprecated `corsHeaders` constant

- [ ] **No hardcoded secrets**
  - Check: All secrets use `Deno.env.get()` or `process.env`
  - Verify: No API keys in source code
  - **Note:** Not blocking, but should be fixed

- [ ] **Dependencies up to date**
  - Check: `npm audit` passes
  - Verify: No critical vulnerabilities
  - **Note:** Review and update regularly

- [ ] **RLS policies enabled**
  - Check: All user data tables have RLS enabled
  - Verify: Policies enforce ownership
  - **Note:** Should be verified in tests

---

## Automated Checks

### CI/CD Pipeline

The following checks run automatically in CI:

1. **Secret Exposure Check:**

   ```bash
   node scripts/audit-secrets.js
   ```

   - Fails if server secrets in `EXPO_PUBLIC_*`
   - Fails if secrets in client code

2. **CORS Wildcard Check:**

   ```bash
   grep -r "Access-Control-Allow-Origin.*'\*'" supabase/functions/
   ```

   - Fails if wildcard CORS found

3. **JWT Verification Check:**

   ```bash
   # Check config.toml for verify_jwt = false
   # Verify each has alternative auth
   ```

   - Fails if unauthenticated endpoints found

4. **Secret Files Check:**

   ```bash
   git ls-files | grep -E "\.(p8|key|secret)$"
   ```

   - Fails if secret files tracked

---

## Manual Verification Steps

### 1. Test Authentication

```bash
# Test unauthenticated endpoint (should fail)
curl -X POST https://[project].supabase.co/functions/v1/send-welcome-email \
  -H "Content-Type: application/json" \
  -d '{"userEmail":"test@example.com","userId":"test"}'
# Expected: 401 Unauthorized
```

### 2. Test Authorization

```bash
# Test cross-user access (should fail)
# Use authenticated token for user A
# Try to access user B's data
# Expected: 404 Not Found or 403 Forbidden
```

### 3. Test CORS

```bash
# Test from browser console (should fail)
fetch('https://[project].supabase.co/functions/v1/send-welcome-email', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({userEmail:'test@example.com',userId:'test'})
});
# Expected: CORS error (if browser) or 401 (if mobile)
```

---

## Release Approval

### Required Sign-Offs

- [ ] **Security Review:** All critical items passed
- [ ] **Code Review:** Security changes reviewed
- [ ] **Testing:** Security tests passed
- [ ] **Documentation:** Security docs updated

### Release Notes

Document any security-related changes:

- New authentication mechanisms
- CORS policy changes
- Secret rotations
- Security fixes

---

## Emergency Procedures

### If Critical Issue Found Post-Release

1. **Immediate Actions:**
   - Revert deployment if possible
   - Disable affected endpoints
   - Notify security team

2. **Investigation:**
   - Preserve logs
   - Document issue
   - Assess impact

3. **Remediation:**
   - Fix issue
   - Test thoroughly
   - Re-deploy with fix

---

## Checklist Usage

### Before Each Release

1. Run automated checks
2. Complete manual verification
3. Review checklist items
4. Get required sign-offs
5. Document in release notes

### Monthly Review

- Review checklist effectiveness
- Update based on new threats
- Add new checks as needed

---

**Last Updated:** 2024-12-XX  
**Version:** 1.0  
**Status:** Active
