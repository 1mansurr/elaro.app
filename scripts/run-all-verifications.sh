#!/bin/bash

# ============================================================================
# Run All Database Verifications
# ============================================================================
# This script provides instructions and file locations for running SQL audits
# ============================================================================

set -e

echo "============================================================================"
echo "DATABASE VERIFICATION SCRIPTS"
echo "============================================================================"
echo ""

echo "✅ Fixed SQL scripts created:"
echo "  1. scripts/audit-database.sql (fixed - removed inserted_at column)"
echo "  2. scripts/verify-rls-policies.sql (new)"
echo "  3. scripts/verify-cron-jobs.sql (new)"
echo ""

echo "📋 To run these queries:"
echo ""
echo "Option 1: Supabase Dashboard (Recommended)"
echo "  1. Go to: https://app.supabase.com/project/alqpwhrsxmetwbtxuihv"
echo "  2. Navigate to: SQL Editor"
echo "  3. Copy contents of each SQL file and run"
echo ""
echo "Option 2: Direct PostgreSQL Connection"
echo "  If you have database connection string, you can use psql:"
echo "  psql \"\$DATABASE_URL\" -f scripts/audit-database.sql"
echo "  psql \"\$DATABASE_URL\" -f scripts/verify-rls-policies.sql"
echo "  psql \"\$DATABASE_URL\" -f scripts/verify-cron-jobs.sql"
echo ""

echo "============================================================================"
echo "SQL FILES SUMMARY"
echo "============================================================================"
echo ""

if [ -f "scripts/audit-database.sql" ]; then
  echo "✅ scripts/audit-database.sql"
  echo "   Purpose: Comprehensive database audit"
  echo "   Checks: Tables, functions, RLS, triggers, cron jobs, data integrity"
  echo ""
fi

if [ -f "scripts/verify-rls-policies.sql" ]; then
  echo "✅ scripts/verify-rls-policies.sql"
  echo "   Purpose: Verify RLS is enabled on critical tables"
  echo "   Checks: RLS status and policy count for users, courses, assignments, etc."
  echo ""
fi

if [ -f "scripts/verify-cron-jobs.sql" ]; then
  echo "✅ scripts/verify-cron-jobs.sql"
  echo "   Purpose: Verify cron jobs are scheduled and active"
  echo "   Checks: All scheduled cron jobs and their status"
  echo ""
fi

echo "============================================================================"
echo "NEXT STEPS"
echo "============================================================================"
echo ""
echo "1. Run scripts/audit-database.sql in Supabase SQL Editor"
echo "2. Run scripts/verify-rls-policies.sql in Supabase SQL Editor"
echo "3. Run scripts/verify-cron-jobs.sql in Supabase SQL Editor"
echo "4. Review results and update LAUNCH_READINESS_STATUS.md"
echo ""

