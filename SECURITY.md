# Security Documentation

## Threat Model

### Application Overview

**ELARO** is a React Native mobile application (iOS/Android) with a Supabase backend. The application helps students manage academic tasks, study sessions, and learning schedules.

**Architecture:**

- **Frontend:** React Native (Expo SDK 51) - Mobile-only (iOS/Android)
- **Backend:** Supabase (PostgreSQL + Edge Functions in Deno)
- **Authentication:** Supabase Auth (JWT tokens)
- **Payment:** RevenueCat (handles App Store/Play Store subscriptions)

### Security Boundaries

#### Client-Side (React Native App)

**Exposed Secrets (Intentional):**

- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (public, protected by RLS)
- `EXPO_PUBLIC_SENTRY_DSN` - Sentry public DSN (public identifier)
- `EXPO_PUBLIC_MIXPANEL_TOKEN` - Mixpanel public token (public identifier)
- `EXPO_PUBLIC_REVENUECAT_APPLE_KEY` - RevenueCat public key (public)

**Never Exposed:**

- Service role keys
- API secrets
- Encryption keys
- Private keys (`.p8` files)

#### Server-Side (Supabase Edge Functions)

**Secrets (Environment Variables):**

- `SUPABASE_SERVICE_ROLE_KEY` - Full database access (bypasses RLS)
- `REVENUECAT_AUTH_HEADER_SECRET` - Webhook authentication
- `RESEND_API_KEY` - Email service API key
- `CRON_SECRET` - Scheduled job authentication
- `ENCRYPTION_KEY` - Data encryption key
- `REVENUECAT_API_KEY` - RevenueCat API access

**Access Control:**

- All secrets loaded via `Deno.env.get()` in Edge Functions only
- Never exposed to client bundle
- Stored in Supabase Dashboard → Edge Functions → Secrets

---

## Authentication Assumptions

### User Authentication

1. **JWT Token Validation:**
   - All authenticated endpoints verify JWT via Supabase Auth API
   - Tokens validated in `createAuthenticatedHandler` wrapper
   - Location: `supabase/functions/_shared/function-handler.ts` (lines 284-330)

2. **Token Storage:**
   - Access tokens stored in Expo SecureStore (encrypted)
   - Refresh tokens stored securely
   - Tokens auto-refresh when expiring (60-second buffer)

3. **Session Management:**
   - Sessions managed by Supabase Auth
   - Automatic token refresh
   - Session timeout handled gracefully

### Service Authentication

1. **Webhook Authentication:**
   - RevenueCat webhook: `REVENUECAT_AUTH_HEADER_SECRET` (constant-time comparison)
   - Location: `supabase/functions/_shared/function-handler.ts` (createWebhookHandler)

2. **Scheduled Jobs:**
   - Cron jobs: `CRON_SECRET` via `Authorization: Bearer <secret>`
   - Location: `supabase/functions/_shared/function-handler.ts` (createScheduledHandler)

3. **Internal Service Calls:**
   - Database triggers call Edge Functions with `SUPABASE_SERVICE_ROLE_KEY`
   - Validated via constant-time comparison
   - Example: `send-welcome-email` endpoint

---

## Authorization Guarantees

### Row Level Security (RLS)

**Database-Level Protection:**

- All user data tables have RLS enabled
- Policies enforce: `auth.uid() = user_id`
- Admin override: Admins can view all data via RLS policies
- Location: `supabase/schema.sql` (RLS policies)

**Verified Tables:**

- `assignments`, `lectures`, `study_sessions`, `courses`
- `reminders`, `notification_preferences`, `profiles`
- `streaks`, `user_devices`, `user_events`

### CORS Configuration

**Current Implementation:**

- All Edge Functions use `getCorsHeaders(origin)` for origin-aware CORS
- Mobile-only: Returns `'null'` for Access-Control-Allow-Origin (prevents browser access)
- Location: `supabase/functions/_shared/cors.ts`

**Deprecated:**

- `corsHeaders` constant is deprecated (use `getCorsHeaders(origin)` instead)
- Legacy `corsHeaders` is maintained for backward compatibility but returns `'null'`

**Future Web Support:**

- When web support is added, update `allowedOrigins` array in `cors.ts`
- All functions already use origin-aware CORS, so no code changes needed

### Application-Level Authorization

1. **Ownership Verification:**
   - All update/delete operations verify ownership before execution
   - Pattern: Query with `.eq('id', resource_id).eq('user_id', user.id)`
   - Example: `supabase/functions/update-assignment/index.ts` (lines 33-49)

2. **Role-Based Access:**
   - Admin role: `role = 'admin'` in `users` table
   - Admin endpoints: `createAdminHandler` wrapper
   - Location: `supabase/functions/_shared/admin-handler.ts`

3. **Subscription Limits:**
   - Task creation limits enforced per subscription tier
   - Free: 15 tasks, Premium: 70 tasks, Admin: Unlimited
   - Location: `supabase/functions/_shared/permissions.ts`

### Batch Operations

**Security:**

- All batch operations force `user_id: userId` into filters
- Prevents IDOR via filter manipulation
- Location: `supabase/functions/batch-operations/index.ts` (line 220)

---

## Network Security

### CORS Configuration

**Current Implementation:**

- Mobile-only application (no browser access)
- CORS returns `'null'` for all requests (mobile apps don't send Origin)
- Prevents browser-based attacks
- Location: `supabase/functions/_shared/cors.ts`

**If Web Support Added:**

- Must implement strict origin allowlist
- Update `allowedOrigins` array in `cors.ts`
- Never use wildcard `'*'`

### TLS/HTTPS

- ✅ All API calls use HTTPS (Supabase default)
- ✅ Network timeout: 15 seconds
- ⚠️ Certificate pinning: Not implemented (future enhancement)

---

## Input Validation

### Server-Side Validation

1. **Zod Schema Validation:**
   - 24+ Edge Functions use Zod schemas
   - Location: `supabase/functions/_shared/schemas/`
   - Applied in `createAuthenticatedHandler` wrapper

2. **Validation Coverage:**
   - Auth endpoints: Email, password validation
   - Task endpoints: Assignment, lecture, course schemas
   - User endpoints: Profile update schemas
   - Batch operations: Comprehensive validation

### Client-Side Validation

- Zod schemas in `src/shared/validation/schemas.ts`
- Used in auth screens with fallback
- Never trusted (server validates all input)

---

## Rate Limiting & Abuse Controls

### Rate Limiting

**Implementation:**

- Dual-layer: Per-user + per-IP limits
- Most restrictive limit applies
- Location: `supabase/functions/_shared/rate-limiter.ts`

**Limits:**

- Create operations: 50-100 requests/60s (per user)
- Update operations: 200 requests/60s (per user)
- Delete operations: 50 requests/60s (per user)
- Default: 100 requests/60s (per user)

**Enforcement:**

- Applied in `createAuthenticatedHandler`
- Returns `429 Too Many Requests` with `Retry-After` header
- Fail-secure: Conservative limits if check fails

### Abuse Detection

- Location: `supabase/functions/_shared/abuse-detection.ts`
- Functions: `shouldBlockRequest()`, `recordViolation()`
- Integrated into request handler

---

## Data Protection

### Encryption

**At Rest:**

- Database: Supabase-managed encryption
- User data: Encrypted fields (title, description, names) using `ENCRYPTION_KEY`
- Location: `supabase/functions/_shared/encryption.ts`

**In Transit:**

- All API calls: HTTPS/TLS
- JWT tokens: Transmitted securely

### PII Handling

**PII Redaction:**

- Logs: PII redacted before storage
- Error messages: Sanitized before client response
- Location: `supabase/functions/_shared/pii-redaction.ts`

**Data Retention:**

- Active accounts: Indefinite (until deletion)
- Deleted accounts: 7 days (soft delete) → permanent deletion
- Admin actions: 7 years (legal compliance)
- System logs: 30 days (errors), 7 days (general)

---

## Known Non-Goals

### Not Implemented (By Design)

1. **Certificate Pinning:**
   - Not implemented
   - Documented as future enhancement
   - Reason: Complexity vs. benefit for mobile apps

2. **CAPTCHA:**
   - Not implemented
   - Rate limiting provides sufficient protection
   - May be added if abuse increases

3. **Web Support:**
   - Currently mobile-only
   - CORS configured for mobile (returns 'null')
   - If web added, must implement origin allowlist

---

## Security Incident Response

### If Secrets Exposed

1. **Immediate Actions:**
   - Rotate exposed secrets immediately
   - Revoke compromised keys
   - Audit access logs

2. **For Apple Keys:**
   - Rotate in Apple Developer Portal
   - Generate new keys
   - Update environment variables

3. **For Service Keys:**
   - Rotate in Supabase Dashboard
   - Update Edge Function secrets
   - Monitor for unauthorized access

### If Data Breach Suspected

1. **Immediate Actions:**
   - Isolate affected systems
   - Preserve logs
   - Notify security team

2. **Investigation:**
   - Review access logs
   - Check RLS policy violations
   - Audit admin actions

3. **Notification:**
   - Follow GDPR requirements (if applicable)
   - Notify affected users
   - Document incident

---

## Security Maintenance

### Regular Tasks

1. **Monthly:**
   - Review access logs
   - Audit admin actions
   - Check for exposed secrets

2. **Quarterly:**
   - Review and update RLS policies
   - Audit rate limiting effectiveness
   - Review dependency vulnerabilities

3. **Annually:**
   - Full security audit
   - Penetration testing
   - Update threat model

### Automated Checks

- CI/CD: Secret exposure checks
- CI/CD: CORS wildcard detection
- CI/CD: JWT verification checks
- Location: `.github/workflows/` (see SECURITY_CHECKLIST.md)

---

## Contact

For security concerns or to report vulnerabilities:

- Review security documentation
- Follow responsible disclosure
- Contact security team

---

**Last Updated:** 2024-12-XX  
**Version:** 1.0  
**Status:** Production Hardened
