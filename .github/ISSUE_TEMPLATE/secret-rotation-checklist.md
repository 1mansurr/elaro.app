# Secret Rotation Checklist

## Pre-Rotation
- [ ] Review current secret usage
- [ ] Generate new secrets for all services
- [ ] Test new secrets in development environment
- [ ] Document current secret values (for rollback)

## Rotation
- [ ] Update development `.env` file
- [ ] Update staging environment
- [ ] Update production EAS secrets
- [ ] Update Supabase Edge Function secrets
- [ ] Deploy updated configuration
- [ ] Verify all services working

## Post-Rotation
- [ ] Monitor error logs for 24 hours
- [ ] Verify user reports
- [ ] Revoke old secrets after 24 hours
- [ ] Update documentation if process changed
- [ ] Archive old secrets (keep for 7 days)

