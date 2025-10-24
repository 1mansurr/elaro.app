# ELARO Database Operations Runbook

## 📋 Overview

This runbook provides comprehensive operational procedures for managing the ELARO database system. It covers monitoring, maintenance, troubleshooting, and emergency procedures.

## 🏗️ System Architecture

### Database Components
- **Primary Database**: PostgreSQL 17.4 with Supabase
- **Event System**: Event-driven architecture with `user_events` table
- **Monitoring**: Comprehensive performance and health monitoring
- **Backup System**: Automated daily backups with compression
- **Maintenance**: Self-healing automated maintenance tasks

### Key Tables
- `users` - User accounts and profiles
- `courses` - Course information
- `assignments` - Assignment tracking
- `study_sessions` - Study session analytics
- `lectures` - Lecture scheduling
- `reminders` - Notification system
- `user_events` - Event audit trail

## 📊 Monitoring & Health Checks

### Daily Health Checks
```bash
# Check database health score
PGPASSWORD='postgres' psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT * FROM calculate_database_health_score();"

# Check performance bottlenecks
PGPASSWORD='postgres' psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT * FROM detect_performance_bottlenecks();"

# Generate performance report
PGPASSWORD='postgres' psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT * FROM generate_performance_report();"
```

### Performance Monitoring
```bash
# Run performance monitoring
./scripts/performance-monitor.sh monitor

# Check slow queries
./scripts/performance-monitor.sh slow-queries

# Check unused indexes
./scripts/performance-monitor.sh unused-indexes

# Run optimization
./scripts/performance-monitor.sh optimize
```

### Health Metrics Thresholds
- **Health Score**: > 75 (Good), > 90 (Excellent)
- **Slow Queries**: < 5 (Good), > 10 (Critical)
- **Unused Indexes**: < 10 (Good), > 20 (Critical)
- **Database Size**: < 1GB (Good), > 10GB (Critical)

## 🔧 Maintenance Procedures

### Automated Maintenance
The system includes automated maintenance tasks:

```bash
# Check maintenance status
PGPASSWORD='postgres' psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT * FROM get_maintenance_status();"

# Run automated maintenance
PGPASSWORD='postgres' psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT * FROM run_automated_maintenance();"

# Auto-schedule maintenance based on needs
PGPASSWORD='postgres' psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT auto_schedule_maintenance();"
```

### Manual Maintenance Tasks

#### Database Optimization
```bash
# Run full database optimization
PGPASSWORD='postgres' psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT optimize_database();"

# Update table statistics
PGPASSWORD='postgres' psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT update_table_statistics();"

# Update index usage statistics
PGPASSWORD='postgres' psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT update_index_usage();"
```

#### Data Cleanup
```bash
# Clean up old events
PGPASSWORD='postgres' psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT cleanup_old_user_events(30);"

# Clean up maintenance history
PGPASSWORD='postgres' psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT cleanup_maintenance_history(30);"
```

## 💾 Backup & Recovery

### Backup Procedures
```bash
# Create full backup
./scripts/backup-manager.sh full

# Create incremental backup (if implemented)
./scripts/backup-manager.sh incremental

# Clean up old backups
./scripts/backup-manager.sh cleanup
```

### Recovery Procedures
```bash
# Restore from backup
./scripts/backup-manager.sh restore /path/to/backup/file.sql.gz

# Verify restore
PGPASSWORD='postgres' psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT COUNT(*) FROM users;"
```

### Backup Schedule
- **Daily**: Full backup at 2 AM
- **Weekly**: Full backup with compression
- **Monthly**: Full backup with encryption
- **Retention**: 30 days for full backups

## 🚨 Emergency Procedures

### Database Connection Issues
1. **Check Supabase status**: `supabase status`
2. **Restart Supabase**: `supabase stop && supabase start`
3. **Check logs**: `supabase logs`
4. **Verify connection**: Test with `psql` command

### Performance Issues
1. **Check health score**: Run `calculate_database_health_score()`
2. **Identify bottlenecks**: Run `detect_performance_bottlenecks()`
3. **Run optimization**: Execute `optimize_database()`
4. **Monitor improvements**: Check health score again

### Data Corruption
1. **Stop application**: Prevent further corruption
2. **Restore from backup**: Use latest clean backup
3. **Verify data integrity**: Run integrity checks
4. **Restart application**: Resume normal operations

### High Load Scenarios
1. **Check active connections**: Monitor connection count
2. **Identify slow queries**: Use performance monitoring
3. **Optimize queries**: Add indexes or rewrite queries
4. **Scale resources**: Consider connection pooling

## 📈 Performance Optimization

### Query Optimization
```sql
-- Analyze query performance
SELECT * FROM analyze_query_patterns();

-- Check index efficiency
SELECT * FROM analyze_index_efficiency();

-- Get performance recommendations
SELECT * FROM get_performance_recommendations();
```

### Index Management
```sql
-- Find unused indexes
SELECT * FROM get_unused_indexes();

-- Check index usage
SELECT * FROM get_index_usage_stats();

-- Update index statistics
SELECT update_index_usage();
```

### Database Tuning
- **Connection Pooling**: Configure appropriate pool sizes
- **Memory Settings**: Optimize shared_buffers and work_mem
- **Checkpoint Settings**: Tune checkpoint_segments and checkpoint_completion_target
- **Logging**: Enable query logging for analysis

## 🔍 Troubleshooting Guide

### Common Issues

#### Slow Queries
- **Symptom**: High response times, timeouts
- **Diagnosis**: Check `pg_stat_statements` for slow queries
- **Solution**: Add indexes, rewrite queries, optimize joins

#### Connection Issues
- **Symptom**: "Too many connections" errors
- **Diagnosis**: Check `pg_stat_activity` for active connections
- **Solution**: Implement connection pooling, increase max_connections

#### Disk Space Issues
- **Symptom**: Database errors, backup failures
- **Diagnosis**: Check disk usage with `df -h`
- **Solution**: Clean up old data, increase disk space

#### Memory Issues
- **Symptom**: Out of memory errors, slow performance
- **Diagnosis**: Check memory usage and PostgreSQL settings
- **Solution**: Increase shared_buffers, optimize work_mem

### Diagnostic Commands
```bash
# Check database size
PGPASSWORD='postgres' psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT pg_size_pretty(pg_database_size('postgres'));"

# Check table sizes
PGPASSWORD='postgres' psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# Check active connections
PGPASSWORD='postgres' psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT count(*) as active_connections FROM pg_stat_activity;"

# Check slow queries
PGPASSWORD='postgres' psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT query, mean_time, calls FROM pg_stat_statements WHERE mean_time > '100ms' ORDER BY mean_time DESC LIMIT 10;"
```

## 📞 Support & Escalation

### Internal Support
- **Database Issues**: Check this runbook first
- **Performance Issues**: Use monitoring tools and optimization procedures
- **Backup Issues**: Follow backup and recovery procedures

### External Support
- **Supabase Support**: For platform-specific issues
- **PostgreSQL Documentation**: For database-specific problems
- **Emergency Contacts**: [Add emergency contact information]

## 📚 Additional Resources

### Documentation
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Performance Tuning Guide](https://wiki.postgresql.org/wiki/Performance_Optimization)

### Monitoring Tools
- **Performance Monitor**: `./scripts/performance-monitor.sh`
- **Backup Manager**: `./scripts/backup-manager.sh`
- **Migration Manager**: `./scripts/migration-manager.sh`

### Key Metrics to Monitor
- Database health score
- Query performance
- Index usage
- Connection count
- Disk usage
- Memory usage
- Backup status

---

**Last Updated**: October 22, 2025  
**Version**: 1.0  
**Maintained By**: ELARO Development Team
