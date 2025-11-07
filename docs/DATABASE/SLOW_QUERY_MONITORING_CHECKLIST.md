# Slow Query Monitoring Checklist

## 📊 Overview

This checklist provides a systematic approach to monitoring, identifying, and optimizing slow database queries in the ELARO application.

---

## 🎯 Purpose

- Identify queries taking > 100ms execution time
- Prevent performance degradation as data grows
- Ensure optimal user experience
- Maintain database health and efficiency

---

## ✅ Pre-Deployment Checklist

Before deploying any new queries or database functions:

### 1. Query Performance Testing

- [ ] **Run EXPLAIN ANALYZE** on all new queries in staging
- [ ] **Verify index usage** - queries should use indexes, not sequential scans
- [ ] **Check execution time** - should be < 100ms for single queries
- [ ] **Test with realistic data volumes** - not just empty tables

### 2. Query Pattern Review

- [ ] **Avoid N+1 queries** - use JOINs or batch queries instead
- [ ] **Use pagination** - never fetch all records with `getAll()`
- [ ] **Limit result sets** - use `LIMIT` clauses appropriately
- [ ] **Filter early** - apply WHERE clauses before JOINs

### 3. Index Verification

- [ ] **Indexes exist** for all WHERE, ORDER BY, and JOIN columns
- [ ] **Composite indexes** created for multi-column queries
- [ ] **Partial indexes** used for filtered queries (e.g., `deleted_at IS NULL`)
- [ ] **Index alignment** matches query sort orders

### 4. RPC Function Optimization

- [ ] **Complex queries** moved to database functions (RPCs)
- [ ] **Single round-trip** instead of multiple queries
- [ ] **Proper indexing** in RPC query logic
- [ ] **Query plans reviewed** before deployment

---

## 🔍 Weekly Monitoring Checklist

### 1. Review Supabase Dashboard

- [ ] **Database Logs**: Check for slow query warnings
- [ ] **Query Performance**: Review execution times
- [ ] **Active Queries**: Identify long-running queries
- [ ] **Error Logs**: Check for query timeouts

### 2. Run Performance Queries

```sql
-- Find slow queries (> 100ms average)
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time,
  total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check for sequential scans
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > 1000
ORDER BY seq_scan DESC;
```

### 3. Review Application Metrics

- [ ] **API response times** - identify endpoints > 500ms
- [ ] **Home screen load time** - should be < 1 second
- [ ] **List view load time** - should be < 500ms
- [ ] **User-reported slowness** - investigate immediately

---

## 🚨 Performance Issue Detection

### Red Flags (Investigate Immediately)

1. **Query takes > 1 second**
   - Action: Run EXPLAIN ANALYZE
   - Check: Missing indexes, full table scans
   - Fix: Add indexes or optimize query

2. **Sequential scan on large table**
   - Action: Add appropriate index
   - Check: Query uses index after adding
   - Verify: Performance improvement

3. **High number of queries for single operation**
   - Action: Identify N+1 query patterns
   - Fix: Combine into single query or RPC
   - Example: Home screen should use RPC function

4. **Queries without LIMIT clauses**
   - Action: Add pagination
   - Check: User experience with large datasets
   - Fix: Implement `listPage()` pattern

5. **Full table scans**
   - Action: Review WHERE clauses
   - Check: Indexes on filter columns
   - Fix: Add indexes or improve filters

---

## 🔧 Query Optimization Steps

### Step 1: Identify Slow Query

```sql
-- Enable query logging (temporarily)
SET log_min_duration_statement = 100; -- Log queries > 100ms

-- Or check pg_stat_statements
SELECT * FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Step 2: Analyze Query Plan

```sql
-- Run EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT * FROM assignments
WHERE user_id = 'xxx'
ORDER BY due_date
LIMIT 50;
```

**Look for:**

- ❌ `Seq Scan` - Needs index
- ❌ `Filter` - Should use WHERE clause with index
- ✅ `Index Scan` - Good!
- ✅ `Index Only Scan` - Excellent!

### Step 3: Create Missing Indexes

```sql
-- Example: Add index for user_id + due_date query
CREATE INDEX idx_assignments_user_due_date
ON assignments(user_id, due_date)
WHERE deleted_at IS NULL;
```

### Step 4: Verify Improvement

- Run EXPLAIN ANALYZE again
- Check execution time reduced
- Test with realistic data volumes

---

## 📋 Index Optimization Checklist

### When Adding New Indexes:

- [ ] **Check existing indexes** - avoid duplicates
- [ ] **Partial indexes** for filtered queries (e.g., `WHERE deleted_at IS NULL`)
- [ ] **Composite indexes** match query patterns
- [ ] **Index order** matches query ORDER BY
- [ ] **Index maintenance** - monitor index bloat

### Common Index Patterns:

```sql
-- User-scoped queries (most common)
CREATE INDEX idx_table_user_created
ON table_name(user_id, created_at DESC);

-- Date-range queries
CREATE INDEX idx_table_date
ON table_name(date_column)
WHERE deleted_at IS NULL;

-- Soft-delete filtering
CREATE INDEX idx_table_deleted_at
ON table_name(deleted_at)
WHERE deleted_at IS NOT NULL;
```

---

## 🎯 RPC Function Review Checklist

When reviewing database functions (RPCs):

- [ ] **Single query** instead of multiple round-trips
- [ ] **JOINs used** instead of N+1 queries
- [ ] **UNION ALL** for combining similar queries
- [ ] **Indexes available** for all WHERE clauses
- [ ] **LIMIT clauses** for result sets
- [ ] **Query plan reviewed** with EXPLAIN ANALYZE

### Example: Good RPC Pattern

```sql
-- ✅ Good: Single query with JOIN
CREATE FUNCTION get_home_screen_data_for_user(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
  -- Single optimized query with JOINs
  -- Uses indexes efficiently
  -- Returns limited result set
END;
$$;
```

---

## 📊 Monitoring Tools

### Supabase Dashboard

- **Database Logs**: Query execution times
- **Performance**: Slow query alerts
- **Metrics**: Connection count, query volume

### Application Monitoring

- **Sentry**: Track slow API endpoints
- **Custom Logging**: Log queries > 500ms
- **User Feedback**: Monitor user-reported issues

### Database Functions

```sql
-- Use existing monitoring functions
SELECT * FROM detect_performance_bottlenecks();
SELECT * FROM analyze_query_patterns();
SELECT * FROM get_performance_recommendations();
```

---

## 🔄 Regular Maintenance

### Monthly Review

- [ ] Review top 20 slowest queries
- [ ] Check for unused indexes
- [ ] Verify index maintenance
- [ ] Review RPC function performance
- [ ] Check for new performance issues

### Quarterly Deep Dive

- [ ] Full query performance audit
- [ ] Index optimization review
- [ ] RPC function optimization
- [ ] Performance benchmarking
- [ ] Capacity planning

---

## 📝 Documentation

### When Optimizing Queries:

- [ ] Document slow query identification
- [ ] Record optimization changes
- [ ] Update indexes documentation
- [ ] Note performance improvements
- [ ] Share learnings with team

---

## ⚠️ Emergency Procedures

### If Database Becomes Slow:

1. **Immediate Actions:**
   - [ ] Check Supabase dashboard for status
   - [ ] Identify slow queries via logs
   - [ ] Check for connection pool exhaustion
   - [ ] Review active queries

2. **Quick Fixes:**
   - [ ] Add missing indexes (if identified)
   - [ ] Kill long-running queries (if safe)
   - [ ] Increase connection pool size
   - [ ] Enable query caching (if applicable)

3. **Root Cause Analysis:**
   - [ ] Run EXPLAIN ANALYZE on slow queries
   - [ ] Check for recent schema changes
   - [ ] Review recent deployments
   - [ ] Check data volume growth

---

## 📚 Resources

- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Supabase Performance Guide](https://supabase.com/docs/guides/platform/performance)
- [EXPLAIN ANALYZE Guide](https://www.postgresql.org/docs/current/using-explain.html)
- [Index Optimization](https://www.postgresql.org/docs/current/indexes-types.html)

---

**Last Updated**: November 1, 2025  
**Version**: 1.0  
**Maintained By**: ELARO Development Team
