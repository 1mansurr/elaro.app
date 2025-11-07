# Secret Rotation Guide

## Overview

This guide documents how to rotate secrets for third-party services without causing downtime. Proper rotation ensures security while maintaining service continuity.

## General Principles

1. **Test in staging first** - Always rotate secrets in a staging environment before production
2. **Low-traffic periods** - Schedule rotations during periods of low user activity
3. **Keep old secrets active** - Maintain both old and new secrets during transition period
4. **Monitor closely** - Watch error logs and service health during and after rotation
5. **Verify functionality** - Test all features before removing old secrets
6. **Document changes** - Record rotation dates and keep changelog updated

---

## Service-Specific Rotation Procedures

### Supabase API Keys

#### Supabase Anon Key (Client-Side)

**When to Rotate:**

- Quarterly security rotation
- After potential exposure
- After team member leaves

**Procedure:**

1. **Create new anon key:**
   - Go to Supabase Dashboard → Settings → API
   - Click "Reset" or "Create new" for anon/public key
   - Copy the new key
   - ⚠️ Keep the old key active initially

2. **Update client-side configuration:**

   ```bash
   # Update .env file
   EXPO_PUBLIC_SUPABASE_ANON_KEY=new-anon-key-here
   ```

3. **Update Edge Functions (if using):**
   - Go to Supabase Dashboard → Edge Functions → Secrets
   - Update `SUPABASE_ANON_KEY` secret

4. **Deploy client app:**

   ```bash
   # Test in development first
   npm start

   # Then build for production
   eas build --platform all
   ```

5. **Monitor for 24-48 hours:**
   - Check error logs in Supabase Dashboard
   - Verify authentication works
   - Check all database queries succeed
   - Monitor Edge Functions logs

6. **Revoke old key:**
   - After confirming new key works everywhere
   - Go to Supabase Dashboard → Settings → API
   - Delete/revoke old anon key

**Rollback Plan:**

- If issues occur, revert .env to old key
- Redeploy client app
- No database changes needed

---

#### Supabase Service Role Key (Server-Side Only)

**⚠️ CRITICAL**: Service role key has full database access. Handle with extreme care.

**When to Rotate:**

- Immediately if exposed or compromised
- Quarterly security rotation
- After security incident

**Procedure:**

1. **Create new service role key:**
   - Supabase Dashboard → Settings → API
   - Generate new service role key
   - Copy immediately (shown only once)

2. **Update Edge Functions secrets:**
   - Supabase Dashboard → Edge Functions → Secrets
   - Update `SUPABASE_SERVICE_ROLE_KEY` secret
   - Keep old key in notes temporarily

3. **Deploy Edge Functions:**

   ```bash
   supabase functions deploy
   ```

4. **Test all Edge Functions:**
   - Call each function endpoint
   - Verify database operations work
   - Check admin operations succeed

5. **Monitor for 24-48 hours:**
   - Check Edge Functions logs
   - Verify no authentication errors
   - Monitor database operations

6. **Revoke old key:**
   - After confirming everything works
   - Delete old service role key from Supabase Dashboard

**Rollback Plan:**

- Revert Edge Function secret to old key
  - Supabase Dashboard → Edge Functions → Secrets
  - Update `SUPABASE_SERVICE_ROLE_KEY` to old value
  - Redeploy functions

---

### RevenueCat API Keys

#### RevenueCat Public Key (Client-Side)

**When to Rotate:**

- If public key is exposed
- Quarterly security rotation

**Procedure:**

1. **Create new API key in RevenueCat Dashboard:**
   - RevenueCat Dashboard → Project Settings → API Keys
   - Generate new public key (App-Specific Shared Secret)
   - Copy the new key

2. **Update client-side configuration:**

   ```bash
   # Update .env file
   EXPO_PUBLIC_REVENUECAT_APPLE_KEY=new-apple-key-here
   ```

3. **Deploy client app:**

   ```bash
   eas build --platform all
   ```

4. **Monitor webhook deliveries:**
   - Check RevenueCat Dashboard → Webhooks
   - Verify subscription events are processed
   - Check user subscription status

5. **Revoke old key:**
   - After confirming new key works
   - Delete old key in RevenueCat Dashboard

**Rollback Plan:**

- Revert .env to old key
- Redeploy client app

---

#### RevenueCat Secret Key (Server-Side)

**When to Rotate:**

- Immediately if exposed
- Quarterly security rotation

**Procedure:**

1. **Create new secret key in RevenueCat Dashboard:**
   - RevenueCat Dashboard → Project Settings → API Keys
   - Generate new secret key
   - Copy immediately

2. **Update Edge Functions secrets:**
   - Supabase Dashboard → Edge Functions → Secrets
   - Update `REVENUECAT_API_KEY` secret

3. **Update webhook secret (if changed):**
   - RevenueCat Dashboard → Webhooks
   - Update webhook URL if needed
   - Update `REVENUECAT_AUTH_HEADER_SECRET` in Supabase secrets

4. **Test webhook processing:**
   - Trigger test subscription event in RevenueCat
   - Verify webhook is received and processed
   - Check database updates correctly

5. **Monitor for 24-48 hours:**
   - Check webhook delivery logs
   - Verify subscription sync works
   - Monitor error logs

6. **Revoke old key:**
   - After confirming everything works
   - Delete old key in RevenueCat Dashboard

**Rollback Plan:**

- Revert Edge Function secrets
- Update `REVENUECAT_API_KEY` and `REVENUECAT_AUTH_HEADER_SECRET`
- Redeploy functions

---

### Expo Push Notification Tokens

**Note:** Push tokens are per-device, not server-side secrets. No rotation needed.

**If compromised:**

- Users should reinstall the app to get new tokens
- Old tokens can be invalidated server-side
- No service-side key rotation needed

---

### Mixpanel Token

**When to Rotate:**

- Quarterly security rotation
- If exposed

**Procedure:**

1. **Create new project in Mixpanel (recommended) or new token:**
   - Mixpanel Dashboard → Settings → Project Settings
   - Create new project or regenerate token

2. **Update client-side configuration:**

   ```bash
   # Update .env file
   EXPO_PUBLIC_MIXPANEL_TOKEN=new-token-here
   ```

3. **Deploy client app:**

   ```bash
   eas build --platform all
   ```

4. **Verify tracking:**
   - Check Mixpanel Dashboard
   - Verify events are being tracked
   - Old events remain in old project

5. **Archive old project:**
   - After confirming new tracking works
   - Old project can be archived or deleted

**Rollback Plan:**

- Revert .env to old token
- Redeploy client app

---

### Sentry DSN

**When to Rotate:**

- If DSN is exposed
- Quarterly security rotation

**Procedure:**

#### Client-Side DSN

1. **Create new project in Sentry:**
   - Sentry Dashboard → Projects → Create New
   - Copy new DSN

2. **Update client-side configuration:**

   ```bash
   # Update .env file
   EXPO_PUBLIC_SENTRY_DSN=new-dsn-here
   ```

3. **Deploy client app:**
   ```bash
   eas build --platform all
   ```

#### Server-Side DSN (Edge Functions)

1. **Update Edge Functions secrets:**
   - Supabase Dashboard → Edge Functions → Secrets
   - Update `SENTRY_DSN` secret

2. **Deploy Edge Functions:**

   ```bash
   supabase functions deploy
   ```

3. **Monitor error tracking:**
   - Check Sentry Dashboard
   - Verify errors are being captured
   - Test error reporting

4. **Archive old project:**
   - After confirming new tracking works
   - Old project can be archived

**Rollback Plan:**

- Revert .env and Edge Function secrets
- Redeploy client and functions

---

### Encryption Key

**⚠️ CRITICAL**: Changing encryption key will make encrypted data unreadable!

**When to Rotate:**

- Only if absolutely necessary (key compromised)
- Requires data migration strategy

**Procedure:**

1. **Plan data migration:**
   - Identify all encrypted fields
   - Plan decryption with old key
   - Plan re-encryption with new key
   - Test in staging first

2. **Create new encryption key:**
   - Generate strong encryption key
   - Store securely

3. **Migrate data:**
   - Decrypt with old key
   - Re-encrypt with new key
   - Update database records

4. **Update Edge Functions secrets:**
   - Supabase Dashboard → Edge Functions → Secrets
   - Update `ENCRYPTION_KEY` secret

5. **Deploy Edge Functions:**

   ```bash
   supabase functions deploy
   ```

6. **Verify decryption works:**
   - Test encrypted field reads
   - Verify data integrity

**⚠️ Warning:**

- Old encrypted data cannot be decrypted with new key
- Must decrypt and re-encrypt all data before rotation
- Consider downtime window for migration

---

### Apple Sign-In Keys

**When to Rotate:**

- If private key (.p8 file) is exposed
- Annually as security best practice

**Procedure:**

1. **Create new key in Apple Developer Portal:**
   - developer.apple.com → Certificates, Identifiers & Profiles
   - Keys → Create new key
   - Download .p8 file immediately (shown only once)

2. **Update configuration:**

   ```bash
   # Update .env file
   APPLE_KEY_ID=new-key-id
   APPLE_PRIVATE_KEY_PATH=/path/to/new/AuthKey.p8
   ```

3. **Update Apple Services ID (if needed):**
   - Verify Client ID is correct
   - Update redirect URLs if needed

4. **Deploy client app:**

   ```bash
   eas build --platform all
   ```

5. **Test Apple Sign-In:**
   - Test sign-in flow
   - Verify authentication works
   - Check user creation

6. **Revoke old key:**
   - After confirming new key works
   - Delete old key in Apple Developer Portal
   - ⚠️ This will invalidate old key immediately

**Rollback Plan:**

- Revert .env to old key ID and path
- Redeploy client app
- Old key must still be active in Apple Developer Portal

---

### Resend API Key (Email Service)

**When to Rotate:**

- If key is exposed
- Quarterly security rotation

**Procedure:**

1. **Create new API key in Resend:**
   - Resend Dashboard → API Keys → Create API Key
   - Copy new key immediately

2. **Update Edge Functions secrets:**
   - Supabase Dashboard → Edge Functions → Secrets
   - Update `RESEND_API_KEY` secret

3. **Deploy Edge Functions:**

   ```bash
   supabase functions deploy
   ```

4. **Test email sending:**
   - Trigger test email
   - Verify delivery
   - Check email logs

5. **Revoke old key:**
   - After confirming new key works
   - Delete old key in Resend Dashboard

**Rollback Plan:**

- Revert Edge Function secret
- Redeploy functions

---

## Rotation Checklist

Use this checklist for each secret rotation:

### Pre-Rotation

- [ ] Review service documentation for rotation procedures
- [ ] Test rotation in staging environment first
- [ ] Schedule rotation during low-traffic period
- [ ] Notify team members of scheduled rotation
- [ ] Prepare rollback plan

### During Rotation

- [ ] Create new secret/key
- [ ] Update configuration files (.env or Edge Function secrets)
- [ ] Deploy updated code
- [ ] Verify new secret/key works
- [ ] Test all related functionality
- [ ] Monitor error logs

### Post-Rotation (24-48 hours)

- [ ] Monitor service health
- [ ] Check error logs for authentication failures
- [ ] Verify all features work correctly
- [ ] Test critical user flows
- [ ] Confirm no user impact

### Finalization

- [ ] Revoke/delete old secret/key
- [ ] Document rotation date in changelog
- [ ] Update team on completion
- [ ] Archive old keys/secrets from notes

---

## Emergency Rotation

If a secret is compromised:

1. **Immediately rotate the secret** (follow service-specific procedure above)
2. **Revoke old secret immediately** - Don't wait for verification
3. **Force user re-authentication** if applicable
4. **Monitor for suspicious activity**
5. **Review audit logs** for unauthorized access
6. **Notify affected users** if personal data at risk
7. **Document incident** for security review

---

## Automation Opportunities

Consider automating rotation for:

- **Non-critical secrets** with long rotation cycles
- **Development/staging environments** for practice
- **Monitoring and alerts** for rotation reminders

---

## Best Practices

1. **Document all secrets** - Keep inventory of where each secret is used
2. **Use secret management tools** - Consider using dedicated secret management services
3. **Rotate regularly** - Don't wait for security incidents
4. **Test rotations** - Practice in staging before production
5. **Have rollback plans** - Always know how to revert
6. **Monitor after rotation** - Watch closely for 24-48 hours
7. **Use different keys per environment** - Staging, production should use different keys
8. **Limit key permissions** - Use least privilege principle

---

## Contact and Support

For questions about secret rotation:

- Review service-specific documentation
- Check team security procedures
- Contact security team for critical rotations

---

**Last Updated:** 2025-01-XX
**Next Review:** Quarterly
