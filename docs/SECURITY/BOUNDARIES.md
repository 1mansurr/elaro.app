# Security Boundaries: Client vs Server Secrets

## Overview

This document defines which secrets and configuration values are safe to expose to the client (React Native app) and which must remain server-side only.

---

## ✅ Safe for Client Exposure (EXPO*PUBLIC*\*)

These variables are **intentionally public** and safe to include in client code:

### Supabase

- **`EXPO_PUBLIC_SUPABASE_URL`** ✅
  - Your Supabase project URL
  - Safe because it's just a URL
  - Example: `https://xxxxx.supabase.co`

- **`EXPO_PUBLIC_SUPABASE_ANON_KEY`** ✅
  - Supabase anonymous/public key
  - Safe because it's designed to be public
  - Protected by Row Level Security (RLS) policies
  - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### RevenueCat

- **`EXPO_PUBLIC_REVENUECAT_APPLE_KEY`** ✅
  - RevenueCat public/Apple-specific key
  - Safe because it's a public key
  - Example: `rcb_apple_xxxxx`

### Analytics & Monitoring

- **`EXPO_PUBLIC_SENTRY_DSN`** ✅
  - Sentry public DSN (Data Source Name)
  - Safe because it's a public identifier
  - Used for error tracking from client
  - Example: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`

- **`EXPO_PUBLIC_MIXPANEL_TOKEN`** ✅
  - Mixpanel project token
  - Safe because it's a public token
  - Used for analytics tracking
  - Example: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### App Configuration

- **`EXPO_PUBLIC_APP_NAME`** ✅
- **`EXPO_PUBLIC_APP_VERSION`** ✅
- **`EXPO_PUBLIC_IOS_BUILD_NUMBER`** ✅
- **`EXPO_PUBLIC_ANDROID_VERSION_CODE`** ✅

These are all safe public identifiers.

---

## ❌ Server-Only Secrets (NEVER expose to client)

These must **NEVER** be in `EXPO_PUBLIC_*` or accessible from client code:

### Supabase

- **`SUPABASE_SERVICE_ROLE_KEY`** ❌
  - **CRITICAL**: Has full database access, bypasses RLS
  - Must only be used in Edge Functions
  - Set in: Supabase Dashboard → Edge Functions → Secrets

- **`SUPABASE_ANON_KEY`** (server-side copy) ❌
  - While the anon key itself is safe, server-side copy should use Edge Function secrets
  - Set in: Supabase Dashboard → Edge Functions → Secrets

### RevenueCat

- **`REVENUECAT_API_KEY`** ❌
  - RevenueCat secret API key
  - Used for server-side API calls
  - Set in: Supabase Dashboard → Edge Functions → Secrets

- **`REVENUECAT_AUTH_HEADER_SECRET`** ❌
  - Webhook authentication secret
  - Used to verify webhook requests from RevenueCat
  - Set in: Supabase Dashboard → Edge Functions → Secrets

### Encryption & Security

- **`ENCRYPTION_KEY`** ❌
  - Key used for encrypting sensitive data
  - Must never leave the server
  - Set in: Supabase Dashboard → Edge Functions → Secrets

- **`CRON_SECRET`** ❌
  - Secret for authenticating cron job requests
  - Used to secure scheduled tasks
  - Set in: Supabase Dashboard → Edge Functions → Secrets

### Third-Party Services

- **`RESEND_API_KEY`** ❌
  - Resend email service API key
  - Used for sending emails from Edge Functions
  - Set in: Supabase Dashboard → Edge Functions → Secrets

- **`TAWK_TO_API_KEY`** ❌
  - Tawk.to chat integration API key
  - Used for chat service integration
  - Set in: Supabase Dashboard → Edge Functions → Secrets

### Apple Sign-In

- **`APPLE_PRIVATE_KEY_PATH`** ❌
  - Path to Apple private key (.p8 file)
  - Used for generating Apple Sign-In tokens
  - Must stay on server, never in client
  - Set in: Local .env file (for development) or secure file storage

- **`APPLE_TEAM_ID`** ⚠️
  - Apple Developer Team ID
  - Can be in .env but not EXPO*PUBLIC*\*
  - Used during build process

- **`APPLE_KEY_ID`** ⚠️
  - Apple Key ID
  - Can be in .env but not EXPO*PUBLIC*\*
  - Used during build process

- **`APPLE_CLIENT_ID`** ⚠️
  - Apple Services ID
  - Can be in .env but not EXPO*PUBLIC*\*
  - Used during build process

### Monitoring

- **`SENTRY_DSN`** (server-side) ⚠️
  - While public DSN can be in EXPO*PUBLIC*\*, server-side should use Edge Function secrets
  - Set in: Supabase Dashboard → Edge Functions → Secrets

### Other

- **`LOG_STORAGE_BUCKET`** ❌
  - Storage bucket for logs
  - Server-side only
  - Set in: Supabase Dashboard → Edge Functions → Secrets

---

## Where Server Secrets Live

### Edge Functions (Supabase)

All server secrets should be set in:

- **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**

Access in Edge Functions using:

```typescript
const secret = Deno.env.get('SECRET_NAME');
```

### Build Process (Local .env)

Some secrets needed during build (but not exposed to client):

- `APPLE_TEAM_ID`
- `APPLE_KEY_ID`
- `APPLE_CLIENT_ID`
- `APPLE_PRIVATE_KEY_PATH`

These are in `.env` file but NOT in `app.config.js` as `EXPO_PUBLIC_*`.

---

## How to Verify

### 1. Run Security Audit Script

```bash
node scripts/audit-secrets.js
```

This script checks for:

- Server secrets in `EXPO_PUBLIC_*` variables
- Server secrets in client source code
- Proper usage of `Deno.env.get()` in Edge Functions

### 2. Manual Checklist

**Client Code (src/):**

- [ ] No `SUPABASE_SERVICE_ROLE_KEY` references
- [ ] No `REVENUECAT_API_KEY` references
- [ ] No `ENCRYPTION_KEY` references
- [ ] Only safe `EXPO_PUBLIC_*` variables used

**Edge Functions (supabase/functions/):**

- [ ] All secrets use `Deno.env.get()`
- [ ] No hardcoded secrets
- [ ] No `process.env` usage (use `Deno.env.get()`)

**Configuration (app.config.js):**

- [ ] Only safe variables in `EXPO_PUBLIC_*`
- [ ] No server secrets exposed

---

## Best Practices

### ✅ DO

- Use `EXPO_PUBLIC_*` prefix only for values safe to expose
- Store server secrets in Supabase Edge Function secrets
- Use `Deno.env.get()` in Edge Functions
- Run security audit script regularly
- Document which secrets are where

### ❌ DON'T

- Never put server secrets in `EXPO_PUBLIC_*` variables
- Never commit `.env` file to version control
- Never hardcode secrets in source code
- Never expose service role keys
- Never log secrets to console

---

## Quick Reference

| Secret Type           | Client-Safe?          | Where to Store        |
| --------------------- | --------------------- | --------------------- |
| Supabase URL          | ✅ Yes (EXPO*PUBLIC*) | .env                  |
| Supabase Anon Key     | ✅ Yes (EXPO*PUBLIC*) | .env                  |
| Supabase Service Role | ❌ No                 | Edge Function Secrets |
| RevenueCat Public Key | ✅ Yes (EXPO*PUBLIC*) | .env                  |
| RevenueCat Secret Key | ❌ No                 | Edge Function Secrets |
| Sentry DSN            | ✅ Yes (EXPO*PUBLIC*) | .env                  |
| Mixpanel Token        | ✅ Yes (EXPO*PUBLIC*) | .env                  |
| Encryption Key        | ❌ No                 | Edge Function Secrets |
| Resend API Key        | ❌ No                 | Edge Function Secrets |
| Apple Private Key     | ❌ No                 | Local file system     |

---

## Incident Response

If a server secret is accidentally exposed:

1. **Immediately rotate the secret** - See `docs/SECRET_ROTATION_GUIDE.md`
2. **Remove from codebase** - Remove any hardcoded references
3. **Review git history** - Check if secret was committed
4. **Notify team** - Alert security team immediately
5. **Document incident** - Record what happened and how it was fixed

---

**Last Updated:** 2025-01-XX
**Next Review:** Quarterly
