# Incident Response Runbook

## Overview

This runbook provides step-by-step procedures for responding to incidents in the ELARO application, including database issues, application errors, and security incidents.

## Incident Severity Levels

### Critical (P0)
- Application completely down
- Data loss or corruption
- Security breach
- **Response Time**: Immediate

### High (P1)
- Major feature broken
- Performance degradation affecting many users
- **Response Time**: Within 1 hour

### Medium (P2)
- Minor feature broken
- Performance issues affecting some users
- **Response Time**: Within 4 hours

### Low (P3)
- Cosmetic issues
- Minor bugs
- **Response Time**: Next business day

## Incident Response Process

### 1. Detection

**Sources:**
- Error tracking (Sentry)
- User reports
- Monitoring alerts
- Database health checks

### 2. Assessment

**Immediate Actions:**
1. Check error logs in Sentry
2. Review database health
3. Check application status
4. Assess user impact

### 3. Containment

**For Critical Issues:**
1. **Stop application traffic** (if possible)
2. **Create backup** of current state
3. **Document current state** before changes

### 4. Resolution

Follow specific procedures based on incident type (see below).

### 5. Post-Incident

1. **Document incident** and resolution
2. **Update procedures** if needed
3. **Communicate** with stakeholders
4. **Schedule post-mortem** for P0/P1 incidents

## Database Incidents

### Database Connection Issues

**Symptoms:**
- "Connection refused" errors
- Timeout errors
- High connection count

**Steps:**

1. **Check Supabase status:**
   ```bash
   supabase status
   ```

2. **Check connection pool:**
   ```sql
   SELECT count(*) as active_connections
   FROM pg_stat_activity
   WHERE state = 'active';
   ```

3. **Restart if needed:**
   ```bash
   supabase stop && supabase start
   ```

4. **Check logs:**
   ```bash
   supabase logs
   ```

### Database Performance Issues

**Symptoms:**
- Slow queries
- Timeouts
- High CPU usage

**Steps:**

1. **Check health score:**
   ```sql
   SELECT * FROM calculate_database_health_score();
   ```

2. **Identify bottlenecks:**
   ```sql
   SELECT * FROM detect_performance_bottlenecks();
   ```

3. **Check slow queries:**
   ```sql
   SELECT query, mean_time, calls
   FROM pg_stat_statements
   WHERE mean_time > '100ms'
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

4. **Run optimization:**
   ```sql
   SELECT optimize_database();
   ```

### Data Corruption

**Symptoms:**
- Inconsistent data
- Foreign key violations
- Missing data

**Steps:**

1. **Stop application** (if possible)
2. **Create backup** of current state
3. **Identify corrupted data:**
   ```sql
   -- Check for foreign key violations
   SELECT * FROM check_foreign_key_integrity();
   ```

4. **Restore from backup** if needed:
   ```bash
   ./scripts/backup-manager.sh restore /path/to/backup.sql.gz
   ```

5. **Verify data integrity:**
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM assignments;
   ```

## Application Incidents

### Application Crashes

**Symptoms:**
- App won't launch
- Frequent crashes
- High crash rate in Sentry

**Steps:**

1. **Check Sentry** for crash reports
2. **Review recent deployments**
3. **Check for breaking changes**
4. **Rollback if needed:**
   ```bash
   # Rollback to previous version
   eas update:rollback
   ```

### Performance Degradation

**Symptoms:**
- Slow app response
- High memory usage
- Battery drain

**Steps:**

1. **Check performance metrics** in monitoring
2. **Review recent changes**
3. **Check for memory leaks**
4. **Optimize queries** if database-related

### Feature Broken

**Symptoms:**
- Feature not working
- Error messages
- Unexpected behavior

**Steps:**

1. **Reproduce issue** locally
2. **Check error logs** in Sentry
3. **Review recent code changes**
4. **Fix and deploy** hotfix if critical

## Security Incidents

### Suspected Security Breach

**Immediate Actions:**

1. **Rotate all secrets:**
   - API keys
   - Database credentials
   - Service tokens
   - See [Secret Rotation Guide](../SECURITY/SECRET_ROTATION.md)

2. **Review access logs:**
   ```sql
   SELECT * FROM admin_actions
   ORDER BY created_at DESC
   LIMIT 100;
   ```

3. **Check for unauthorized access:**
   ```sql
   SELECT * FROM login_history
   WHERE success = false
   ORDER BY created_at DESC
   LIMIT 100;
   ```

4. **Review RLS policies:**
   ```sql
   SELECT * FROM pg_policies
   WHERE schemaname = 'public';
   ```

### Data Exposure

**Steps:**

1. **Identify exposed data**
2. **Assess impact** (users affected, data types)
3. **Notify affected users** (if required)
4. **Fix vulnerability**
5. **Document incident**

## Rollback Procedures

### Database Rollback

See [Rollback Procedure](../ROLLBACK_PROCEDURE.md) for detailed steps.

**Quick Rollback:**

1. **Stop application traffic**
2. **Restore from backup:**
   ```bash
   ./scripts/backup-manager.sh restore /path/to/backup.sql.gz
   ```
3. **Verify restore**
4. **Resume traffic**

### Application Rollback

```bash
# Rollback to previous version
eas update:rollback

# Or rollback specific build
eas build:list
eas build:rollback BUILD_ID
```

## Communication

### Internal Communication

- **Slack**: #incidents channel
- **Email**: dev-team@elaro.com
- **Status Page**: Update status page for user-facing issues

### External Communication

- **Status Page**: Update for P0/P1 incidents
- **User Notifications**: For data breaches or extended downtime

## Post-Incident

### Documentation

Document the following:
- Incident timeline
- Root cause
- Resolution steps
- Impact assessment
- Prevention measures

### Post-Mortem (P0/P1)

Schedule within 48 hours:
1. Review incident timeline
2. Identify root cause
3. Discuss prevention measures
4. Update procedures
5. Assign action items

## Emergency Contacts

- **On-Call Engineer**: [Contact Info]
- **Database Admin**: [Contact Info]
- **Security Team**: [Contact Info]

## Additional Resources

- [Database Operations Runbook](../DATABASE/OPERATIONS_RUNBOOK.md)
- [Rollback Procedure](../ROLLBACK_PROCEDURE.md)
- [Secret Rotation Guide](../SECURITY/SECRET_ROTATION.md)

