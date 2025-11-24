# Security Guide

## Overview

This guide covers security best practices, configuration, and procedures for the ELARO application.

## Secrets Management

### Apple Private Keys

Apple private keys (`.p8` files) must **NEVER** be committed to the repository.

**Setup Instructions:**

1. Download `.p8` files from [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
2. Store in secure location outside repository
3. Set `APPLE_PRIVATE_KEY_PATH` environment variable in `.env` file
4. Keys are automatically ignored by `.gitignore`

**Important Notes:**

- If keys are accidentally committed, they must be rotated immediately in Apple Developer Portal
- Never share private keys via email, chat, or any insecure channel
- Use environment variables for all sensitive configuration

### Environment Variables

All sensitive configuration should be stored in environment variables. See `.env.example` for required variables.

**Required Variables:**

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Error Tracking
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn

# Analytics
EXPO_PUBLIC_MIXPANEL_TOKEN=your_mixpanel_token

# Apple Keys (local development)
APPLE_PRIVATE_KEY_PATH=/path/to/key.p8
```

**Production Secrets (Supabase):**

```bash
# Set secrets in Supabase
supabase secrets set SECRET_NAME=secret_value

# List secrets
supabase secrets list
```

## Network Security

### TLS/HTTPS

- ✅ TLS enforced (Supabase HTTPS by default)
- ✅ Network timeout: 15 seconds implemented
- ⚠️ Certificate pinning: Not implemented (documented as future enhancement)

**Implementation:**

```typescript
// src/services/supabase.ts
const fetchWithTimeout = async (url, options, timeoutMs = 15000) => {
  // Timeout protection in place
};
```

## Input Validation

### Server-Side Validation

- ✅ 68 Edge Functions use `createAuthenticatedHandler`
- ✅ 24 Functions use Zod schema validation
- ✅ Batch operations fully validated with comprehensive schemas
- ✅ Table-specific validation (assignments, lectures, courses, study sessions)

**Example:**

```typescript
import { z } from 'zod';
import { createAuthenticatedHandler } from '@/utils/handlers';

const schema = z.object({
  title: z.string().min(1).max(100),
  dueDate: z.string().datetime(),
});

export default createAuthenticatedHandler(async (req, user) => {
  const data = schema.parse(req.body);
  // Process validated data
});
```

### Client-Side Validation

- ✅ Zod schemas created (`src/shared/validation/schemas.ts`)
- ✅ Auth screens use Zod with fallback
- ✅ Comprehensive validation: email, password, forms, profiles

**Example:**

```typescript
import { z } from 'zod';

const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[0-9]/, 'Password must contain number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain special character');
```

## Row Level Security (RLS)

### RLS Policies

All tables have RLS enabled with policies that:

- Restrict access to user's own data
- Allow admins to view all data
- Prevent unauthorized access

**Verification:**

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

### Database Permissions

**Important:** The `anon` role should have **NO** permissions on tables.

**Verify Permissions:**

```sql
-- Check permissions on assignments table
SELECT
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'assignments'
AND table_schema = 'public'
ORDER BY grantee, privilege_type;
```

**Expected Result:**

- `anon` should have NO permissions
- `authenticated` should have: SELECT, INSERT, UPDATE, DELETE (not ALL)

## Password Security

### Requirements

- Minimum 8 characters
- Uppercase letter required
- Lowercase letter required
- Number required
- Special character required

### Implementation

Password validation is enforced both client-side and server-side using Zod schemas.

## Dependency Security

### Regular Audits

```bash
# Check for vulnerabilities
npm audit

# Fix automatically fixable issues
npm audit fix

# Review Dependabot alerts weekly
```

### Best Practices

- Review and merge Dependabot PRs weekly
- Never ignore security vulnerabilities without review
- Keep dependencies up to date
- Use `npm audit` before major releases

## Secret Rotation

See [Secret Rotation Guide](./SECRET_ROTATION.md) for detailed procedures on rotating:

- API keys
- Database credentials
- Service tokens
- Apple private keys

## Security Best Practices

### ✅ DO

- **Never commit secrets**: All API keys, private keys, and tokens belong in environment variables
- **Rotate keys regularly**: Rotate any keys that may have been exposed
- **Use minimal permissions**: Database grants follow principle of least privilege
- **Validate all input**: Client and server use Zod schemas for validation
- **Monitor dependencies**: Run `npm audit` regularly and review Dependabot alerts
- **Use RLS**: Always enable Row Level Security on database tables
- **Use service role keys only in Edge Functions**: Never in client code

### ❌ DON'T

- Don't commit `.p8` files or any private keys
- Don't use `GRANT ALL` for `anon` role
- Don't skip input validation
- Don't ignore security vulnerabilities
- Don't hardcode secrets in code
- Don't share secrets via insecure channels

## Security Audit Checklist

### Mobile Secrets

- [ ] No hardcoded API keys, secrets, or tokens
- [ ] All secrets use environment variables
- [ ] Apple private keys properly excluded from git
- [ ] Service role keys only in Edge Functions (server-side)
- [ ] Client code only uses public keys (`EXPO_PUBLIC_*`)

### Network Security

- [ ] TLS enforced
- [ ] Network timeout implemented
- [ ] Certificate pinning (future enhancement)

### Input Validation

- [ ] Server-side validation with Zod
- [ ] Client-side validation with Zod
- [ ] Batch operations validated
- [ ] All user inputs validated

### RLS/Policies

- [ ] RLS enabled on all critical tables
- [ ] Policies exist for user isolation
- [ ] `anon` role has no permissions
- [ ] `authenticated` role has appropriate permissions

### Dependencies

- [ ] No critical vulnerabilities
- [ ] Dependabot configured
- [ ] Regular audits scheduled

## Incident Response

If a security incident occurs:

1. **Immediately rotate** any potentially compromised secrets
2. **Review access logs** for unauthorized activity
3. **Update security measures** to prevent recurrence
4. **Document the incident** and lessons learned

See [Incident Response Guide](../OPERATIONS/INCIDENT_RESPONSE.md) for detailed procedures.

## Additional Resources

- [Supabase Security Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)
- [React Native Security Best Practices](https://reactnative.dev/docs/security)
